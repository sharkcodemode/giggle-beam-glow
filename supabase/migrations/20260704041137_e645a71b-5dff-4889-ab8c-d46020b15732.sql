
CREATE TABLE public.acto_license_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id_hash TEXT NOT NULL,
  license_key_hash TEXT NOT NULL,
  device_id_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  valid_until TIMESTAMPTZ NOT NULL,
  lease_expires_at TIMESTAMPTZ NOT NULL,
  last_seen_at TIMESTAMPTZ,
  last_apps_script_check_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX acto_license_sessions_session_id_hash_key
  ON public.acto_license_sessions (session_id_hash);
CREATE INDEX acto_license_sessions_key_device_idx
  ON public.acto_license_sessions (license_key_hash, device_id_hash);
CREATE INDEX acto_license_sessions_lease_idx
  ON public.acto_license_sessions (lease_expires_at);
CREATE INDEX acto_license_sessions_valid_until_idx
  ON public.acto_license_sessions (valid_until);

GRANT ALL ON public.acto_license_sessions TO service_role;

ALTER TABLE public.acto_license_sessions ENABLE ROW LEVEL SECURITY;

-- Nenhuma policy para anon/authenticated: apenas service_role (edge functions) acessa.

CREATE OR REPLACE FUNCTION public.acto_license_sessions_touch()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER acto_license_sessions_touch_updated_at
  BEFORE UPDATE ON public.acto_license_sessions
  FOR EACH ROW EXECUTE FUNCTION public.acto_license_sessions_touch();
