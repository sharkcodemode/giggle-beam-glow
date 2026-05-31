
REVOKE EXECUTE ON FUNCTION public.pulse_check_rate_limit(text, text, integer) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.pulse_toggle_reaction(uuid, text, text) FROM anon, authenticated;
