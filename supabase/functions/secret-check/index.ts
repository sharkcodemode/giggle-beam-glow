import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("POST only", { status: 405 });
  const { prefix } = await req.json().catch(() => ({ prefix: "" }));
  const s = Deno.env.get("ACTO_MASTER_SECRET");
  if (!s) return new Response(JSON.stringify({ ok: false, reason: "secret-missing" }), { headers: { "Content-Type": "application/json" } });
  const ok = typeof prefix === "string" && prefix.length > 0 && s.startsWith(prefix);
  return new Response(
    JSON.stringify({ ok, secret_length: s.length, prefix_length: typeof prefix === "string" ? prefix.length : 0 }),
    { headers: { "Content-Type": "application/json" } },
  );
});
