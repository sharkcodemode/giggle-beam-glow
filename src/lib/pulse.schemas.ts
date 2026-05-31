import { z } from "zod";

// Permite letras/números/pontuação/espaços/emoji e quebra de linha; bloqueia controle.
const SAFE_BODY = /^[^\u0000-\u0008\u000B-\u001F\u007F]+$/u;
const URL_RE = /https?:\/\//i;

export const messageSchema = z.object({
  clientId: z.string().min(8).max(64),
  handle: z.string().trim().min(1).max(64),
  colorHash: z.number().int(),
  body: z.string().trim().min(1).max(280).regex(SAFE_BODY).refine((v) => !URL_RE.test(v), {
    message: "URLs não são permitidas",
  }),
});

export const postSchema = z.object({
  clientId: z.string().min(8).max(64),
  handle: z.string().trim().min(1).max(64),
  colorHash: z.number().int(),
  body: z.string().trim().min(1).max(500).regex(SAFE_BODY).refine((v) => !URL_RE.test(v), {
    message: "URLs não são permitidas",
  }),
});

export const reactionSchema = z.object({
  postId: z.string().uuid(),
  clientId: z.string().min(8).max(64),
  emoji: z.string().min(1).max(8),
});

export type MessageInput = z.infer<typeof messageSchema>;
export type PostInput = z.infer<typeof postSchema>;
export type ReactionInput = z.infer<typeof reactionSchema>;
