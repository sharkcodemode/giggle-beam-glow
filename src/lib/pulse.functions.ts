import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { messageSchema, postSchema, reactionSchema } from "./pulse.schemas";

const RATE = {
  send_message: 2,
  create_post: 30,
  toggle_reaction: 1,
} as const;

async function checkRate(clientId: string, action: keyof typeof RATE): Promise<boolean> {
  const { data, error } = await supabaseAdmin.rpc("pulse_check_rate_limit", {
    p_client_id: clientId,
    p_action: action,
    p_interval_seconds: RATE[action],
  });
  if (error) throw new Error(error.message);
  return Boolean(data);
}

export const sendPulseMessage = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => messageSchema.parse(input))
  .handler(async ({ data }) => {
    const ok = await checkRate(data.clientId, "send_message");
    if (!ok) throw new Error("respira. tenta de novo em alguns segundos.");

    const { data: row, error } = await supabaseAdmin
      .from("pulse_messages")
      .insert({
        client_id: data.clientId,
        handle: data.handle,
        color_hash: data.colorHash,
        body: data.body,
      })
      .select("id, client_id, handle, color_hash, body, created_at")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const createPulsePost = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => postSchema.parse(input))
  .handler(async ({ data }) => {
    const ok = await checkRate(data.clientId, "create_post");
    if (!ok) throw new Error("aguarda alguns segundos antes do próximo manifesto.");

    const { data: row, error } = await supabaseAdmin
      .from("pulse_posts")
      .insert({
        client_id: data.clientId,
        handle: data.handle,
        color_hash: data.colorHash,
        body: data.body,
      })
      .select("id, client_id, handle, color_hash, body, reactions, created_at")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const togglePulseReaction = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => reactionSchema.parse(input))
  .handler(async ({ data }) => {
    const ok = await checkRate(data.clientId, "toggle_reaction");
    if (!ok) throw new Error("muitas reações. respira.");

    const { data: counts, error } = await supabaseAdmin.rpc("pulse_toggle_reaction", {
      p_post_id: data.postId,
      p_client_id: data.clientId,
      p_emoji: data.emoji,
    });
    if (error) throw new Error(error.message);
    return { postId: data.postId, reactions: (counts ?? {}) as Record<string, number> };
  });
