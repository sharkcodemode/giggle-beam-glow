// Helpers compartilhados: hash HMAC, tickets HMAC, chamadas Apps Script,
// resposta JSON pública sanitizada e persistência da sessão de licença.

const enc = new TextEncoder();
const dec = new TextDecoder();

export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "content-type, authorization, apikey, x-acto-license, x-acto-license-key, x-acto-extension-key, x-acto-device-id, x-acto-action, x-acto-session-id, x-acto-license-ticket",
  "Access-Control-Max-Age": "86400",
};

// -------- respostas públicas normalizadas --------
export function jsonOk(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify({ ok: true, ...body }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function jsonErr(
  code: string,
  message: string,
  status = 200,
  extra: Record<string, unknown> = {},
): Response {
  return new Response(
    JSON.stringify({ ok: false, error: code, code, message, ...extra }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

// -------- base64 / base64url --------
export function b64encode(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
export function b64decode(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
export function b64urlEncode(buf: ArrayBuffer | Uint8Array): string {
  return b64encode(buf).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
export function b64urlDecode(s: string): Uint8Array {
  let b = s.replace(/-/g, "+").replace(/_/g, "/");
  while (b.length % 4) b += "=";
  return b64decode(b);
}

function decodeMaster(raw: string): Uint8Array {
  const s = raw.trim();
  if (/^[0-9a-fA-F]+$/.test(s) && s.length === 64) {
    const out = new Uint8Array(32);
    for (let i = 0; i < 32; i++) out[i] = parseInt(s.substr(i * 2, 2), 16);
    return out;
  }
  let b = s.replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/");
  while (b.length % 4) b += "=";
  return b64decode(b);
}

async function hmacKey(): Promise<CryptoKey> {
  const master = Deno.env.get("ACTO_MASTER_SECRET");
  if (!master) throw new Error("ACTO_MASTER_SECRET ausente");
  return crypto.subtle.importKey(
    "raw",
    decodeMaster(master) as unknown as BufferSource,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

// -------- hash HMAC opaco para persistir em DB --------
// Usa ACTO_MASTER_SECRET como sal server-side — sem o secret é impossível
// correlacionar linhas do DB com a license key/device real do usuário.
export async function hmacHash(kind: string, value: string): Promise<string> {
  const key = await hmacKey();
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    enc.encode(`${kind}|${value}`),
  );
  return b64urlEncode(new Uint8Array(sig));
}

// -------- tickets HMAC opacos (session/legacy) --------
export interface SessionTicketPayload {
  k: "session";
  sid: string;   // session_id (raw, opaco pra fora)
  lic: string;   // license_key
  did: string;   // device_id
  vu: number;    // valid_until epoch ms
  exp: number;   // lease_expires_at epoch ms (limite superior de uso do ticket)
}

export async function makeSessionTicket(p: SessionTicketPayload): Promise<string> {
  const key = await hmacKey();
  const body = enc.encode(JSON.stringify(p));
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, body));
  return `${b64urlEncode(body)}.${b64urlEncode(sig)}`;
}

export async function readSessionTicket(raw: string): Promise<SessionTicketPayload> {
  if (typeof raw !== "string" || raw.length < 20 || raw.length > 4096) {
    throw new Error("ticket_invalido");
  }
  const dot = raw.indexOf(".");
  if (dot <= 0) throw new Error("ticket_malformado");
  const body = b64urlDecode(raw.slice(0, dot));
  const sig = b64urlDecode(raw.slice(dot + 1));
  const key = await hmacKey();
  const ok = await crypto.subtle.verify("HMAC", key, sig as unknown as BufferSource, body as unknown as BufferSource);
  if (!ok) throw new Error("ticket_assinatura_invalida");
  let parsed: unknown;
  try { parsed = JSON.parse(dec.decode(body)); }
  catch { throw new Error("ticket_payload_invalido"); }
  const p = parsed as Record<string, unknown>;
  if (p.k !== "session") throw new Error("ticket_kind_invalido");
  if (typeof p.sid !== "string" || !p.sid) throw new Error("ticket_sid_invalido");
  if (typeof p.lic !== "string" || !p.lic) throw new Error("ticket_lic_invalido");
  if (typeof p.did !== "string" || !p.did) throw new Error("ticket_did_invalido");
  if (typeof p.vu !== "number" || typeof p.exp !== "number") throw new Error("ticket_ttl_invalido");
  return p as unknown as SessionTicketPayload;
}

// -------- PostgREST (service role) --------
export function pgHeaders(): { headers: Record<string, string>; base: string } | null {
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const base = Deno.env.get("SUPABASE_URL");
  if (!key || !base) return null;
  return {
    base,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
  };
}

// -------- Apps Script --------
export interface AppsScriptResult {
  ok: boolean;
  code: string;         // license_active | license_expired | license_inactive | license_not_found | device_conflict | license_invalid_validity | license_unreachable
  message: string;
  validUntilISO: string | null;
  rawStatus: string;
  rawSuccess: boolean | null;
}

function pick(o: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = o[k];
    if (v == null) continue;
    const s = String(v).trim();
    if (s) return s;
  }
  return "";
}

function pickBool(o: Record<string, unknown>, keys: string[]): boolean | null {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "boolean") return v;
    if (typeof v === "string") {
      const s = v.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (["true", "sim", "yes", "ok", "ativo", "ativa", "active", "valid", "valido", "valida"].includes(s)) return true;
      if (["false", "nao", "no", "invalid", "invalido", "invalida"].includes(s)) return false;
    }
  }
  return null;
}

function flatten(o: Record<string, unknown>): Record<string, unknown> {
  const merge = (x: unknown): Record<string, unknown> =>
    x && typeof x === "object" && !Array.isArray(x) ? (x as Record<string, unknown>) : {};
  return {
    ...merge(o),
    ...merge(o.data),
    ...merge(o.license),
    ...merge(o.licenca),
  };
}

function parseValidade(s: string): Date | null {
  if (!s) return null;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (m) {
    const d = new Date(Date.UTC(
      Number(m[3]), Number(m[2]) - 1, Number(m[1]),
      Number(m[4] ?? 0) + 3, Number(m[5] ?? 0), Number(m[6] ?? 0),
    ));
    if (!isNaN(d.getTime())) return d;
  }
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d;
  return null;
}

export async function callAppsScriptLicense(licenseKey: string, deviceId: string, extensionVersion = "acto"): Promise<AppsScriptResult> {
  const url = Deno.env.get("ACTO_APPS_SCRIPT_URL");
  if (!url) {
    return { ok: false, code: "license_unreachable", message: "Serviço de licenças indisponível.", validUntilISO: null, rawStatus: "", rawSuccess: null };
  }
  let text = "";
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ action: "license_check", chave: licenseKey, deviceId, extensionVersion }),
      redirect: "follow",
    });
    text = await res.text();
  } catch (e) {
    console.error("[license] apps_script_fetch_fail", e instanceof Error ? e.message : String(e));
    return { ok: false, code: "license_unreachable", message: "Não consegui validar a licença agora.", validUntilISO: null, rawStatus: "", rawSuccess: null };
  }
  let raw: Record<string, unknown> = {};
  try { raw = JSON.parse(text) as Record<string, unknown>; }
  catch {
    console.warn("[license] apps_script_non_json", text.slice(0, 200));
    return { ok: false, code: "license_unreachable", message: "Resposta inválida do serviço de licenças.", validUntilISO: null, rawStatus: "", rawSuccess: null };
  }
  const flat = flatten(raw);
  const successFlag = pickBool(flat, ["ok", "success", "sucesso", "valid", "valido", "ativa", "active"]);
  const statusRaw = pick(flat, ["status", "Status"]);
  const validadeRaw = pick(flat, ["validade", "Validade", "validUntil", "expires_at", "expiresAt"]);
  const messageRaw = pick(raw, ["mensagem", "message", "erro", "error"]);
  const validade = parseValidade(validadeRaw);
  const now = new Date();

  const norm = statusRaw.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const msgNorm = messageRaw.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  if (/(device|dispositivo).*(conflit|divergent|diferent|outro)|conflit.*(device|dispositivo)/.test(msgNorm)) {
    return { ok: false, code: "device_conflict", message: "Esta licença está vinculada a outro dispositivo.", validUntilISO: validade?.toISOString() ?? null, rawStatus: statusRaw, rawSuccess: successFlag };
  }
  if (/(not[_ ]?found|nao[_ ]?encontrad|inexistente|nao[_ ]?existe)/.test(norm + " " + msgNorm)) {
    return { ok: false, code: "license_not_found", message: "Licença não encontrada.", validUntilISO: null, rawStatus: statusRaw, rawSuccess: successFlag };
  }
  if (/(revog|bloque|suspens|cancel|inativ|desativad)/.test(norm + " " + msgNorm)) {
    return { ok: false, code: "license_inactive", message: "Licença inativa ou revogada.", validUntilISO: validade?.toISOString() ?? null, rawStatus: statusRaw, rawSuccess: successFlag };
  }

  const positive = successFlag === true || /(ativ|active|valid|ok|liberad|autorizad)/.test(norm + " " + msgNorm);

  if (!validade) {
    if (positive) {
      return { ok: false, code: "license_invalid_validity", message: "Licença sem data de validade legível.", validUntilISO: null, rawStatus: statusRaw, rawSuccess: successFlag };
    }
    return { ok: false, code: "license_not_found", message: "Licença não reconhecida.", validUntilISO: null, rawStatus: statusRaw, rawSuccess: successFlag };
  }
  if (validade.getTime() <= now.getTime()) {
    return { ok: false, code: "license_expired", message: "Licença expirada.", validUntilISO: validade.toISOString(), rawStatus: statusRaw, rawSuccess: successFlag };
  }
  if (!positive) {
    return { ok: false, code: "license_not_found", message: "Licença não reconhecida.", validUntilISO: validade.toISOString(), rawStatus: statusRaw, rawSuccess: successFlag };
  }
  return { ok: true, code: "license_active", message: "Licença ativa.", validUntilISO: validade.toISOString(), rawStatus: statusRaw, rawSuccess: successFlag };
}

// -------- políticas trial vs paga --------
const TRIAL_PREFIX_RE = /^TRIAL-/i;
export function isTrialLicense(licenseKey: string): boolean {
  return TRIAL_PREFIX_RE.test(licenseKey);
}

export interface SessionPolicy {
  leaseMs: number;              // lease máximo por heartbeat
  revalidateMs: number;         // intervalo até chamar Apps Script novamente
}

export function policyFor(licenseKey: string, validUntilMs: number): SessionPolicy {
  const now = Date.now();
  const remaining = Math.max(0, validUntilMs - now);
  if (isTrialLicense(licenseKey) || remaining <= 20 * 60_000) {
    return { leaseMs: 60_000, revalidateMs: 120_000 };
  }
  return { leaseMs: 120_000, revalidateMs: 5 * 60_000 };
}

// -------- persistência da sessão --------
export interface SessionRow {
  id: string;
  session_id_hash: string;
  license_key_hash: string;
  device_id_hash: string;
  status: string;
  valid_until: string;
  lease_expires_at: string;
  last_seen_at: string | null;
  last_apps_script_check_at: string | null;
  revoked_at: string | null;
}

export async function insertSession(row: {
  session_id_hash: string;
  license_key_hash: string;
  device_id_hash: string;
  valid_until: string;
  lease_expires_at: string;
  last_apps_script_check_at: string;
}): Promise<void> {
  const pg = pgHeaders();
  if (!pg) throw new Error("pg_headers_missing");
  const res = await fetch(`${pg.base}/rest/v1/acto_license_sessions`, {
    method: "POST",
    headers: { ...pg.headers, Prefer: "return=minimal" },
    body: JSON.stringify({ ...row, status: "active" }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`session_insert_fail_${res.status}:${t.slice(0, 200)}`);
  }
}

export async function findSessionByHash(sessionIdHash: string): Promise<SessionRow | null> {
  const pg = pgHeaders();
  if (!pg) return null;
  const qs = `session_id_hash=eq.${encodeURIComponent(sessionIdHash)}&select=*&limit=1`;
  const res = await fetch(`${pg.base}/rest/v1/acto_license_sessions?${qs}`, { headers: pg.headers });
  if (!res.ok) return null;
  const rows = await res.json() as SessionRow[];
  return Array.isArray(rows) && rows[0] ? rows[0] : null;
}

export async function updateSessionHeartbeat(sessionIdHash: string, patch: {
  lease_expires_at?: string;
  last_seen_at?: string;
  last_apps_script_check_at?: string;
  status?: string;
  valid_until?: string;
  revoked_at?: string;
}): Promise<void> {
  const pg = pgHeaders();
  if (!pg) return;
  const qs = `session_id_hash=eq.${encodeURIComponent(sessionIdHash)}`;
  await fetch(`${pg.base}/rest/v1/acto_license_sessions?${qs}`, {
    method: "PATCH",
    headers: { ...pg.headers, Prefer: "return=minimal" },
    body: JSON.stringify(patch),
  }).catch(() => undefined);
}

// -------- valida sessão contra DB (usado por acto-tier-s) --------
export type SessionCheckOutcome =
  | { ok: true; source: "session_ticket"; validUntilMs: number; leaseUntilMs: number; sessionIdHash: string }
  | { ok: false; code: string; message: string };

export async function checkActiveSession(input: {
  licenseKey: string;
  deviceId: string;
  sessionId: string;
  ticket: SessionTicketPayload;
}): Promise<SessionCheckOutcome> {
  const now = Date.now();
  const { ticket, licenseKey, deviceId, sessionId } = input;
  if (ticket.lic !== licenseKey) {
    return { ok: false, code: "license_mismatch", message: "Ticket não corresponde à licença informada." };
  }
  if (ticket.did !== deviceId) {
    return { ok: false, code: "device_conflict", message: "Ticket vinculado a outro dispositivo." };
  }
  if (ticket.sid !== sessionId) {
    return { ok: false, code: "session_mismatch", message: "Sessão inválida." };
  }
  if (ticket.vu <= now) {
    return { ok: false, code: "license_expired", message: "Licença expirada." };
  }
  if (ticket.exp <= now) {
    return { ok: false, code: "session_lease_expired", message: "Sessão expirou. Reabra a extensão." };
  }
  const sessionIdHash = await hmacHash("session", sessionId);
  const row = await findSessionByHash(sessionIdHash);
  if (!row) {
    return { ok: false, code: "session_not_found", message: "Sessão não encontrada. Reabra a extensão." };
  }
  if (row.status !== "active" || row.revoked_at) {
    return { ok: false, code: "session_revoked", message: "Sessão revogada." };
  }
  const licenseKeyHash = await hmacHash("license", licenseKey);
  const deviceIdHash = await hmacHash("device", deviceId);
  if (row.license_key_hash !== licenseKeyHash || row.device_id_hash !== deviceIdHash) {
    return { ok: false, code: "session_mismatch", message: "Sessão não corresponde a esta licença/dispositivo." };
  }
  const validUntilMs = new Date(row.valid_until).getTime();
  const leaseUntilMs = new Date(row.lease_expires_at).getTime();
  if (validUntilMs <= now) {
    return { ok: false, code: "license_expired", message: "Licença expirada." };
  }
  if (leaseUntilMs <= now) {
    return { ok: false, code: "session_lease_expired", message: "Sessão expirou. Reabra a extensão." };
  }
  return { ok: true, source: "session_ticket", validUntilMs, leaseUntilMs, sessionIdHash };
}

export function newRequestId(): string {
  return `req_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
}

export function newSessionId(): string {
  // 256 bits opacos, base64url
  const b = crypto.getRandomValues(new Uint8Array(32));
  return b64urlEncode(b);
}
