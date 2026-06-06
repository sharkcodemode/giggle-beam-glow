-- 1. Tabela singleton
CREATE TABLE IF NOT EXISTS public.acto_model_config (
  id text PRIMARY KEY DEFAULT 'global',
  primary_model text NOT NULL DEFAULT 'anthropic/claude-4.5-opus',
  fallback_models text[] NOT NULL DEFAULT ARRAY[
    'anthropic/claude-4.5-sonnet',
    'openai/gpt-5.5-pro',
    'openai/gpt-5.5',
    'google/gemini-3.1-pro-preview',
    'google/gemini-2.5-pro'
  ]::text[],
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT acto_model_config_singleton CHECK (id = 'global'),
  CONSTRAINT acto_model_config_primary_format CHECK (
    primary_model ~ '^[a-z0-9._-]+/[a-z0-9._-]+$'
  ),
  CONSTRAINT acto_model_config_fallbacks_bounded CHECK (
    array_length(fallback_models, 1) IS NULL
    OR array_length(fallback_models, 1) <= 8
  )
);

-- 2. GRANTs — leitura pública, escrita só via service_role
GRANT SELECT ON public.acto_model_config TO anon, authenticated;
GRANT ALL    ON public.acto_model_config TO service_role;

-- 3. RLS
ALTER TABLE public.acto_model_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "acto_model_config_public_read"
  ON public.acto_model_config
  FOR SELECT
  USING (true);
-- Sem policy de INSERT/UPDATE/DELETE para anon/authenticated → bloqueado.
-- service_role bypassa RLS, então edge functions e server fns conseguem gravar.

-- 4. Trigger updated_at
CREATE OR REPLACE FUNCTION public.acto_model_config_touch()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS acto_model_config_touch_trg ON public.acto_model_config;
CREATE TRIGGER acto_model_config_touch_trg
  BEFORE UPDATE ON public.acto_model_config
  FOR EACH ROW
  EXECUTE FUNCTION public.acto_model_config_touch();

-- 5. Seed inicial
INSERT INTO public.acto_model_config (id, primary_model, fallback_models)
VALUES (
  'global',
  'anthropic/claude-4.5-opus',
  ARRAY[
    'anthropic/claude-4.5-sonnet',
    'openai/gpt-5.5-pro',
    'openai/gpt-5.5',
    'google/gemini-3.1-pro-preview',
    'google/gemini-2.5-pro'
  ]::text[]
)
ON CONFLICT (id) DO NOTHING;