CREATE TABLE IF NOT EXISTS public.acto_rate_limits (
  client_id text NOT NULL,
  action text NOT NULL,
  window_start timestamptz NOT NULL DEFAULT now(),
  count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (client_id, action)
);

GRANT ALL ON public.acto_rate_limits TO service_role;

ALTER TABLE public.acto_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.acto_check_rate_limit(
  p_client_id text,
  p_action text,
  p_max integer,
  p_window_seconds integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_start timestamptz;
  v_count integer;
BEGIN
  IF p_client_id IS NULL OR length(p_client_id) = 0 OR length(p_client_id) > 200 THEN
    RETURN false;
  END IF;

  INSERT INTO public.acto_rate_limits (client_id, action, window_start, count)
  VALUES (p_client_id, p_action, now(), 1)
  ON CONFLICT (client_id, action) DO UPDATE
    SET window_start = CASE
          WHEN public.acto_rate_limits.window_start < now() - make_interval(secs => p_window_seconds)
          THEN now() ELSE public.acto_rate_limits.window_start END,
        count = CASE
          WHEN public.acto_rate_limits.window_start < now() - make_interval(secs => p_window_seconds)
          THEN 1 ELSE public.acto_rate_limits.count + 1 END
  RETURNING window_start, count INTO v_start, v_count;

  RETURN v_count <= greatest(1, p_max);
END;
$$;

REVOKE ALL ON FUNCTION public.acto_check_rate_limit(text, text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.acto_check_rate_limit(text, text, integer, integer) TO anon, authenticated, service_role;