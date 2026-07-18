-- ACTO Tier-S — Camada de proteção EDGE/TELEMETRIA
-- Idempotente: seguro rodar múltiplas vezes.

-- ============ 1. TABELA acto_usage_events ============
create table if not exists public.acto_usage_events (
  id bigint generated always as identity primary key,
  license_key_hash text not null,              -- HMAC-SHA256 da license key, nunca a chave em claro
  occurred_at timestamptz not null default now(),
  outcome text not null check (outcome in ('ok','429','is_stuck','blocked')),
  status_code integer not null,
  latency_ms integer not null check (latency_ms >= 0),
  action text,                                  -- nome da action (send_message, gateway_chat, etc), sem payload
  device_id_hash text,                          -- HMAC opcional, não PII direta
  created_at timestamptz not null default now()
);

comment on table public.acto_usage_events is
  'Telemetria de uso por licença ACTO. NUNCA armazenar prompt, resposta, tokens de auth ou payload bruto.';

create index if not exists idx_acto_usage_events_license_time
  on public.acto_usage_events (license_key_hash, occurred_at desc);

create index if not exists idx_acto_usage_events_outcome_time
  on public.acto_usage_events (outcome, occurred_at desc);

-- Retenção: índice para job de limpeza (ex: apagar > 30 dias)
create index if not exists idx_acto_usage_events_created_at
  on public.acto_usage_events (created_at);

alter table public.acto_usage_events enable row level security;

-- Nenhum acesso direto de anon/authenticated. Só service_role (edge function) escreve/lê.
drop policy if exists "acto_usage_events_no_anon" on public.acto_usage_events;
create policy "acto_usage_events_no_anon"
  on public.acto_usage_events
  for all
  to anon, authenticated
  using (false)
  with check (false);

revoke all on public.acto_usage_events from anon, authenticated;
grant select, insert on public.acto_usage_events to service_role;
grant usage, select on sequence public.acto_usage_events_id_seq to service_role;


-- ============ 2. RUNTIME FLAGS (kill-switch global) ============
create table if not exists public.acto_runtime_flags (
  id boolean primary key default true constraint acto_runtime_flags_singleton check (id = true),
  emergency_pause boolean not null default false,
  emergency_reason text,
  emergency_set_by text,
  emergency_set_at timestamptz,
  updated_at timestamptz not null default now()
);

insert into public.acto_runtime_flags (id, emergency_pause)
values (true, false)
on conflict (id) do nothing;

alter table public.acto_runtime_flags enable row level security;

drop policy if exists "acto_runtime_flags_no_anon" on public.acto_runtime_flags;
create policy "acto_runtime_flags_no_anon"
  on public.acto_runtime_flags
  for all
  to anon, authenticated
  using (false)
  with check (false);

revoke all on public.acto_runtime_flags from anon, authenticated;
grant select, update on public.acto_runtime_flags to service_role;


-- ============ 3. CIRCUIT BREAKER POR LICENÇA ============
create table if not exists public.acto_license_breaker (
  license_key_hash text primary key,
  blocked_until timestamptz,
  blocked_reason text,
  blocked_count integer not null default 0,      -- nº de vezes que já disparou (para backoff progressivo)
  updated_at timestamptz not null default now()
);

alter table public.acto_license_breaker enable row level security;

drop policy if exists "acto_license_breaker_no_anon" on public.acto_license_breaker;
create policy "acto_license_breaker_no_anon"
  on public.acto_license_breaker
  for all
  to anon, authenticated
  using (false)
  with check (false);

revoke all on public.acto_license_breaker from anon, authenticated;
grant select, insert, update on public.acto_license_breaker to service_role;

-- Função: conta outcomes=blocked numa janela e decide se deve abrir o circuito.
-- Chamada pela edge function via RPC (service_role).
create or replace function public.acto_evaluate_circuit_breaker(
  p_license_key_hash text,
  p_window_5m_limit integer default 8,     -- 8 outcomes 'blocked' em 5min
  p_window_1h_limit integer default 20,    -- 20 outcomes 'blocked' em 1h
  p_cooldown_minutes integer default 15
)
returns table (is_blocked boolean, blocked_until timestamptz, reason text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count_5m integer;
  v_count_1h integer;
  v_existing record;
  v_new_until timestamptz;
begin
  select * into v_existing
  from public.acto_license_breaker
  where license_key_hash = p_license_key_hash
  for update;

  -- Já bloqueada e cooldown ainda ativo?
  if v_existing.blocked_until is not null and v_existing.blocked_until > now() then
    return query select true, v_existing.blocked_until, coalesce(v_existing.blocked_reason, 'circuit_open');
    return;
  end if;

  select count(*) into v_count_5m
  from public.acto_usage_events
  where license_key_hash = p_license_key_hash
    and outcome = 'blocked'
    and occurred_at > now() - interval '5 minutes';

  select count(*) into v_count_1h
  from public.acto_usage_events
  where license_key_hash = p_license_key_hash
    and outcome = 'blocked'
    and occurred_at > now() - interval '1 hour';

  if v_count_5m >= p_window_5m_limit or v_count_1h >= p_window_1h_limit then
    -- backoff progressivo: dobra o cooldown a cada reincidência, cap em 4h
    v_new_until := now() + make_interval(
      mins => least(p_cooldown_minutes * power(2, coalesce(v_existing.blocked_count, 0)), 240)
    );

    insert into public.acto_license_breaker (license_key_hash, blocked_until, blocked_reason, blocked_count, updated_at)
    values (
      p_license_key_hash,
      v_new_until,
      format('threshold: %s/5m ou %s/1h excedido', v_count_5m, v_count_1h),
      1,
      now()
    )
    on conflict (license_key_hash) do update
      set blocked_until = v_new_until,
          blocked_reason = excluded.blocked_reason,
          blocked_count = public.acto_license_breaker.blocked_count + 1,
          updated_at = now();

    return query select true, v_new_until, format('threshold: %s/5m ou %s/1h excedido', v_count_5m, v_count_1h);
    return;
  end if;

  return query select false, null::timestamptz, null::text;
end;
$$;

grant execute on function public.acto_evaluate_circuit_breaker(text, integer, integer, integer) to service_role;


-- ============ 4. PAINEL DE RISCO (view, só leitura) ============
create or replace view public.acto_risk_panel_24h as
select
  e.license_key_hash,
  count(*) filter (where e.outcome = 'blocked') as blocked_count,
  count(*) filter (where e.outcome = '429') as rate_limited_count,
  count(*) filter (where e.outcome = 'is_stuck') as stuck_count,
  count(*) as total_events,
  round(
    100.0 * count(*) filter (where e.outcome = 'blocked') / nullif(count(*), 0),
    2
  ) as block_rate_pct,
  round(avg(e.latency_ms))::integer as avg_latency_ms,
  max(e.occurred_at) as last_event_at,
  b.blocked_until as breaker_active_until
from public.acto_usage_events e
left join public.acto_license_breaker b using (license_key_hash)
where e.occurred_at > now() - interval '24 hours'
group by e.license_key_hash, b.blocked_until
order by block_rate_pct desc nulls last, blocked_count desc;

revoke all on public.acto_risk_panel_24h from anon, authenticated;
grant select on public.acto_risk_panel_24h to service_role;

-- Fim da migration.
