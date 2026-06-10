UPDATE public.acto_model_config
SET primary_model = 'anthropic/claude-4.5-opus',
    fallback_models = ARRAY['anthropic/claude-4.5-sonnet','openai/gpt-5.5-pro','openai/gpt-5.5','google/gemini-3.1-pro-preview'],
    updated_at = now()
WHERE id = 'global';