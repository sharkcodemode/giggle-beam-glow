
CREATE TABLE IF NOT EXISTS public.acto_license_cache (
  key text PRIMARY KEY,
  raw jsonb NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS acto_license_cache_expires_idx
  ON public.acto_license_cache (expires_at);

GRANT ALL ON public.acto_license_cache TO service_role;

ALTER TABLE public.acto_license_cache ENABLE ROW LEVEL SECURITY;

-- Nenhuma policy para anon/authenticated: tabela é 100% server-side (service_role bypassa RLS)
CREATE POLICY "no_client_access_select" ON public.acto_license_cache
  FOR SELECT TO anon, authenticated USING (false);
CREATE POLICY "no_client_access_insert" ON public.acto_license_cache
  FOR INSERT TO anon, authenticated WITH CHECK (false);
CREATE POLICY "no_client_access_update" ON public.acto_license_cache
  FOR UPDATE TO anon, authenticated USING (false);
CREATE POLICY "no_client_access_delete" ON public.acto_license_cache
  FOR DELETE TO anon, authenticated USING (false);
