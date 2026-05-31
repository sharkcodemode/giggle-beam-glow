
-- ╔══════════════════════════════════════════════════════════════╗
-- ║ PULSE — chat global + mural realtime (texto + emoji)         ║
-- ╚══════════════════════════════════════════════════════════════╝

-- 1. CHAT MESSAGES (efêmero, stream contínuo)
CREATE TABLE public.pulse_messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   text NOT NULL,
  handle      text NOT NULL,
  color_hash  integer NOT NULL,
  body        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pulse_messages_body_len CHECK (char_length(body) BETWEEN 1 AND 280),
  CONSTRAINT pulse_messages_handle_len CHECK (char_length(handle) BETWEEN 1 AND 64),
  CONSTRAINT pulse_messages_client_id_len CHECK (char_length(client_id) BETWEEN 8 AND 64)
);
CREATE INDEX pulse_messages_created_idx ON public.pulse_messages (created_at DESC);

GRANT SELECT, INSERT ON public.pulse_messages TO anon, authenticated;
GRANT ALL ON public.pulse_messages TO service_role;

ALTER TABLE public.pulse_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pulse_messages_public_read"
  ON public.pulse_messages FOR SELECT
  USING (true);

CREATE POLICY "pulse_messages_public_insert"
  ON public.pulse_messages FOR INSERT
  WITH CHECK (
    char_length(body) BETWEEN 1 AND 280
    AND char_length(handle) BETWEEN 1 AND 64
    AND char_length(client_id) BETWEEN 8 AND 64
    AND body !~* 'https?://'
  );

-- 2. POSTS (mural persistente)
CREATE TABLE public.pulse_posts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   text NOT NULL,
  handle      text NOT NULL,
  color_hash  integer NOT NULL,
  body        text NOT NULL,
  reactions   jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pulse_posts_body_len CHECK (char_length(body) BETWEEN 1 AND 500),
  CONSTRAINT pulse_posts_handle_len CHECK (char_length(handle) BETWEEN 1 AND 64),
  CONSTRAINT pulse_posts_client_id_len CHECK (char_length(client_id) BETWEEN 8 AND 64)
);
CREATE INDEX pulse_posts_created_idx ON public.pulse_posts (created_at DESC);

GRANT SELECT, INSERT ON public.pulse_posts TO anon, authenticated;
GRANT ALL ON public.pulse_posts TO service_role;

ALTER TABLE public.pulse_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pulse_posts_public_read"
  ON public.pulse_posts FOR SELECT
  USING (true);

CREATE POLICY "pulse_posts_public_insert"
  ON public.pulse_posts FOR INSERT
  WITH CHECK (
    char_length(body) BETWEEN 1 AND 500
    AND char_length(handle) BETWEEN 1 AND 64
    AND char_length(client_id) BETWEEN 8 AND 64
    AND body !~* 'https?://'
  );

-- 3. REACTIONS (1 por client+post+emoji)
CREATE TABLE public.pulse_reactions (
  post_id    uuid NOT NULL REFERENCES public.pulse_posts(id) ON DELETE CASCADE,
  client_id  text NOT NULL,
  emoji      text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, client_id, emoji),
  CONSTRAINT pulse_reactions_emoji_len CHECK (char_length(emoji) BETWEEN 1 AND 8)
);

GRANT SELECT ON public.pulse_reactions TO anon, authenticated;
GRANT ALL ON public.pulse_reactions TO service_role;

ALTER TABLE public.pulse_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pulse_reactions_public_read"
  ON public.pulse_reactions FOR SELECT
  USING (true);

-- 4. RATE LIMITS
CREATE TABLE public.pulse_rate_limits (
  client_id  text NOT NULL,
  action     text NOT NULL,
  last_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (client_id, action)
);

GRANT ALL ON public.pulse_rate_limits TO service_role;
ALTER TABLE public.pulse_rate_limits ENABLE ROW LEVEL SECURITY;
-- sem policies para anon: somente service_role acessa via RPC

-- 5. RPC: rate limit check (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.pulse_check_rate_limit(
  p_client_id text,
  p_action text,
  p_interval_seconds integer
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last timestamptz;
BEGIN
  SELECT last_at INTO v_last
  FROM public.pulse_rate_limits
  WHERE client_id = p_client_id AND action = p_action;

  IF v_last IS NOT NULL AND v_last > now() - make_interval(secs => p_interval_seconds) THEN
    RETURN false;
  END IF;

  INSERT INTO public.pulse_rate_limits (client_id, action, last_at)
  VALUES (p_client_id, p_action, now())
  ON CONFLICT (client_id, action) DO UPDATE SET last_at = now();

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.pulse_check_rate_limit(text, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pulse_check_rate_limit(text, text, integer) TO service_role;

-- 6. RPC: toggle reaction (idempotent, recomputes count)
CREATE OR REPLACE FUNCTION public.pulse_toggle_reaction(
  p_post_id uuid,
  p_client_id text,
  p_emoji text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existed boolean;
  v_counts jsonb;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.pulse_reactions
    WHERE post_id = p_post_id AND client_id = p_client_id AND emoji = p_emoji
  ) INTO v_existed;

  IF v_existed THEN
    DELETE FROM public.pulse_reactions
    WHERE post_id = p_post_id AND client_id = p_client_id AND emoji = p_emoji;
  ELSE
    INSERT INTO public.pulse_reactions (post_id, client_id, emoji)
    VALUES (p_post_id, p_client_id, p_emoji);
  END IF;

  SELECT COALESCE(jsonb_object_agg(emoji, cnt), '{}'::jsonb) INTO v_counts
  FROM (
    SELECT emoji, count(*)::int AS cnt
    FROM public.pulse_reactions
    WHERE post_id = p_post_id
    GROUP BY emoji
  ) t;

  UPDATE public.pulse_posts SET reactions = v_counts WHERE id = p_post_id;

  RETURN v_counts;
END;
$$;

REVOKE ALL ON FUNCTION public.pulse_toggle_reaction(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pulse_toggle_reaction(uuid, text, text) TO service_role;

-- 7. Realtime
ALTER TABLE public.pulse_messages REPLICA IDENTITY FULL;
ALTER TABLE public.pulse_posts REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pulse_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pulse_posts;
