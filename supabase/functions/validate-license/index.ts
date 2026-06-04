// validate-license — proxy Supabase → Apps Script (single source of truth)
// Returns normalized { status, expires_at, reason } for the extension poller.
import { corsHeaders } from "../_shared/cors.ts";

const APPS_SCRIPT_URL = Deno.env.get("ACTO_APPS_SCRIPT_URL") ?? "";
const LICENSE_REGEX = /^[A-Z]{2,5}(-[A-Z0-9]{3}){2,3}$/;
const EXT_VERSION = "2.19.0";

type Status = "active" | "expired" | "revoked" | "not_found";

interface AppsScriptRaw {
  [k: string]: unknown;
  data?: Record<string, unknown>;
  license?: Record<string, unknown>;
  licenca?: Record<string, unknown>;
  ok?: unknown;
  success?: unknown;
  sucesso?: unknown;
  valid?: unknown;
  valido?: unknown;
  mensagem?: string;
  erro?: string;
  message?: string;
  error?: string;
}

function flatten(o: AppsScriptRaw): Record<string, unknown> {
  const merge = (x: unknown): Record<string, unknown> =>
    x && typeof x === "object" && !Array.isArray(x) ? (x as Record<string, unknown>) : {};
  return { ...merge(o), ...merge(o.data), ...merge(o.license), ...merge(o.licenca) };
}

function pick(o: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = o[k];
    if (v == null) continue;
    const s = String(v).trim();
    if (s) return s;
  }
  return "";
}

function pickBoolean(o: Record<string, unknown>, keys: string[]): boolean | null {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "boolean") return v;
    if (typeof v === "string") {
      const s = v.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (["true", "sim", "yes", "ok", "active", "ativo", "ativa", "valid", "valido", "valida"].includes(s)) return true;
      if (["false", "nao", "no", "invalid", "invalido", "invalida"].includes(s)) return false;
    }
  }
  return null;
}

function messageLooksLikeError(message: string): boolean {
  const s = message.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return /(erro|error|falh|negad|invalid|inval|nao\s+encontrad|not[_ ]?found|inexistente|expir|vencid|revog|bloque|suspens|cancel)/.test(s);
}

function messageLooksLikeSuccess(message: string): boolean {
  const s = message.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return /(sucesso|success|ativad|active|valid|valida|ok|liberad|autorizad)/.test(s);
}

function parseDate(s: string): Date | null {
  if (!s) return null;
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d;
  // dd/MM/yyyy [HH:mm[:ss]]
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (m) {
    const d2 = new Date(
      Number(m[3]), Number(m[2]) - 1, Number(m[1]),
      Number(m[4] ?? 0), Number(m[5] ?? 0), Number(m[6] ?? 0),
    );
    if (!isNaN(d2.getTime())) return d2;
  }
  return null;
}

function normalizeStatus(raw: string): Status | "unknown" {
  const s = raw.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (!s) return "unknown";
  if (/(not[_ ]?found|nao[_ ]?encontrad|inexistente|invalid|nao[_ ]?existe)/.test(s)) return "not_found";
  if (/(expir|vencid|venceu)/.test(s)) return "expired";
  if (/(revog|bloque|suspens|cancel|inativ|desativad)/.test(s)) return "revoked";
  if (/(ativ|active|valid|ok)/.test(s)) return "active";
  return "unknown";
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ status: "not_found", reason: "method_not_allowed" }, 405);

  let payload: { key?: unknown; device_id?: unknown };
  try {
    payload = await req.json();
  } catch {
    return json({ status: "not_found", reason: "invalid_json" }, 400);
  }

  const key = typeof payload.key === "string" ? payload.key.trim() : "";
  const deviceId = typeof payload.device_id === "string" ? payload.device_id.trim() : "";

  if (!key) return json({ status: "not_found", reason: "missing_key" });
  if (!LICENSE_REGEX.test(key)) return json({ status: "not_found", reason: "invalid_format" });
  if (!APPS_SCRIPT_URL) {
    console.error("ACTO_APPS_SCRIPT_URL not configured");
    return json({ status: "unknown", reason: "config_missing" }, 500);
  }

  try {
    const upstream = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ chave: key, deviceId, extensionVersion: EXT_VERSION }),
      redirect: "follow",
    });

    const text = await upstream.text();
    let raw: AppsScriptRaw;
    try { raw = JSON.parse(text) as AppsScriptRaw; }
    catch {
      console.warn("Apps Script non-JSON response", upstream.status, text.slice(0, 200));
      return json({ status: "unknown", reason: "upstream_invalid" }, 502);
    }

    const flat = flatten(raw);
    const rawRecord = raw as Record<string, unknown>;
    const explicitErrorMsg = pick(rawRecord, ["erro", "error"]);
    const infoMsg = pick(rawRecord, ["mensagem", "message"]);
    const successFlag = pickBoolean(flat, ["ok", "success", "sucesso", "valid", "valido", "ativa", "active"]);
    const statusRaw = pick(flat, ["status", "Status"]);
    const validadeRaw = pick(flat, ["validade", "Validade", "validUntil", "expires_at", "expiresAt"]);
    const validade = parseDate(validadeRaw);
    const now = new Date();

    let status = normalizeStatus(statusRaw);

    // Some Apps Script paths return only a success boolean/message plus validity.
    // Treat that as active when the validity is still in the future.
    if (
      status === "unknown" &&
      (successFlag === true || messageLooksLikeSuccess(infoMsg)) &&
      (!validade || validade.getTime() > now.getTime())
    ) {
      status = "active";
    }

    // Error envelope from Apps Script = not_found (key unknown / unreadable).
    // Do not classify positive informational messages as errors.
    if (status === "unknown" && (explicitErrorMsg || messageLooksLikeError(infoMsg))) status = "not_found";

    // SERVER-SIDE EXPIRATION OVERRIDE: validade <= now forces expired
    if (status === "active" && validade && validade.getTime() <= now.getTime()) {
      status = "expired";
    }

    if (status === "unknown") {
      return json({
        status: "unknown",
        reason: "unrecognized_status",
        upstream_status: statusRaw || null,
        expires_at: validade?.toISOString() ?? null,
      });
    }

    return json({
      status,
      expires_at: validade?.toISOString() ?? null,
      reason: status === "active" ? null : (explicitErrorMsg || infoMsg || statusRaw || status),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("validate-license upstream error", msg);
    return json({ status: "unknown", reason: "upstream_unreachable" }, 502);
  }
});
