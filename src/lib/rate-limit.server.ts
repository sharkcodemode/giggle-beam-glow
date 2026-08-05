/**
 * Rate limiting server-side para endpoints de IA pagos.
 * Server-only: usa service role via supabaseAdmin + RPC acto_check_rate_limit.
 * Fail-closed em caso de erro de infra (protege a chave/faturamento).
 */

export function clientKeyFromRequest(request: Request): string {
  const h = request.headers;
  const fwd = h.get("cf-connecting-ip") ?? h.get("x-real-ip") ?? h.get("x-forwarded-for") ?? "";
  const ip = fwd.split(",")[0]?.trim();
  if (ip) return `ip:${ip.slice(0, 100)}`;
  const ua = (h.get("user-agent") ?? "unknown").slice(0, 100);
  return `ua:${ua}`;
}

export interface RateLimitResult {
  allowed: boolean;
  reason?: "limit" | "infra";
}

export async function checkRateLimit(
  request: Request,
  action: string,
  max: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.rpc("acto_check_rate_limit", {
      p_client_id: clientKeyFromRequest(request),
      p_action: action,
      p_max: max,
      p_window_seconds: windowSeconds,
    });
    if (error) {
      console.error(`[rate-limit] rpc error action=${action}: ${error.message}`);
      return { allowed: false, reason: "infra" };
    }
    return data === true ? { allowed: true } : { allowed: false, reason: "limit" };
  } catch (e) {
    console.error(`[rate-limit] crash action=${action}: ${e instanceof Error ? e.message : String(e)}`);
    return { allowed: false, reason: "infra" };
  }
}

export function rateLimitResponse(
  result: RateLimitResult,
  windowSeconds: number,
  extraHeaders: Record<string, string> = {},
): Response {
  const infra = result.reason === "infra";
  return new Response(
    JSON.stringify({
      error: infra ? "rate_limit_unavailable" : "rate_limited",
      message: infra
        ? "Controle de uso indisponível no momento. Tente novamente em instantes."
        : `Limite de requisições atingido. Aguarde ${windowSeconds}s e tente de novo.`,
    }),
    {
      status: infra ? 503 : 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(windowSeconds),
        ...extraHeaders,
      },
    },
  );
}
