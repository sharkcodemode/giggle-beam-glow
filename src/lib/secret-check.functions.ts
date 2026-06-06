import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Schema = z.object({ prefix: z.string().min(1).max(128) });

export const verifyMasterSecretPrefix = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => Schema.parse(i))
  .handler(async ({ data }) => {
    const s = process.env.ACTO_MASTER_SECRET;
    if (!s) return { ok: false, reason: "secret-missing" as const };
    return {
      ok: s.startsWith(data.prefix),
      secret_length: s.length,
      prefix_length: data.prefix.length,
    };
  });
