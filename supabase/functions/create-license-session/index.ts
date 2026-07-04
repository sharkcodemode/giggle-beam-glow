// create-license-session
// Chama Apps Script, se licença válida cria uma sessão persistida
// e devolve session_id + license_ticket assinado + validade real.

import {
  corsHeaders, jsonErr, jsonOk,
  callAppsScriptLicense, hmacHash, insertSession,
  makeSessionTicket, newSessionId, policyFor, newRequestId,
} from "../_shared/session.ts";

const LICENSE_REGEX = /^[A-Z0-9]{2,8}(-[A-Z0-9]{3,8}){1,4}$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return jsonErr("method_not_allowed", "Método não permitido.", 405);

  const rid = newRequestId();
  const t0 = Date.now();
  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return jsonErr("invalid_json", "Corpo da requisição inválido."); }

  const licenseKey = String(body.license_key ?? "").trim().toUpperCase();
  const deviceId = String(body.device_id ?? "").trim();
  const extensionVersion = String(body.extension_version ?? "acto").trim().slice(0, 40);

  if (!licenseKey || !LICENSE_REGEX.test(licenseKey)) {
    console.warn("[session.create]", rid, "license_invalid_format");
    return jsonErr("license_invalid_format", "Formato de licença inválido.");
  }
  if (!deviceId || deviceId.length < 8 || deviceId.length > 128) {
    console.warn("[session.create]", rid, "device_id_invalid");
    return jsonErr("device_id_invalid", "Identificador de dispositivo inválido.");
  }

  const tAs = Date.now();
  const as = await callAppsScriptLicense(licenseKey, deviceId, extensionVersion);
  const as_ms = Date.now() - tAs;

  if (!as.ok) {
    console.warn("[session.create]", rid,
      "route=create_license_session",
      "code=", as.code,
      "as_ms=", as_ms,
      "raw_status=", as.rawStatus,
    );
    return jsonErr(as.code, as.message);
  }

  const validUntilMs = as.validUntilISO ? new Date(as.validUntilISO).getTime() : 0;
  if (!validUntilMs || validUntilMs <= Date.now()) {
    return jsonErr("license_invalid_validity", "Licença sem validade utilizável.");
  }

  const pol = policyFor(licenseKey, validUntilMs);
  const now = Date.now();
  const leaseUntilMs = Math.min(now + pol.leaseMs, validUntilMs);

  const sessionId = newSessionId();
  const sessionIdHash = await hmacHash("session", sessionId);
  const licenseKeyHash = await hmacHash("license", licenseKey);
  const deviceIdHash = await hmacHash("device", deviceId);

  try {
    await insertSession({
      session_id_hash: sessionIdHash,
      license_key_hash: licenseKeyHash,
      device_id_hash: deviceIdHash,
      valid_until: new Date(validUntilMs).toISOString(),
      lease_expires_at: new Date(leaseUntilMs).toISOString(),
      last_apps_script_check_at: new Date(now).toISOString(),
    });
  } catch (e) {
    console.error("[session.create]", rid, "insert_fail",
      e instanceof Error ? e.message : String(e));
    return jsonErr("session_persist_failed", "Não consegui iniciar sua sessão. Tente novamente.");
  }

  const ticket = await makeSessionTicket({
    k: "session",
    sid: sessionId,
    lic: licenseKey,
    did: deviceId,
    vu: validUntilMs,
    exp: leaseUntilMs,
  });

  console.log("[session.create]", rid,
    "route=create_license_session",
    "code=license_active",
    "as_ms=", as_ms,
    "total_ms=", Date.now() - t0,
    "lease_ms=", pol.leaseMs,
    "revalidate_ms=", pol.revalidateMs,
  );

  return jsonOk({
    status: "active",
    code: "license_active",
    message: "Licença validada com sucesso.",
    session_id: sessionId,
    license_ticket: ticket,
    valid_until: new Date(validUntilMs).toISOString(),
    lease_expires_at: new Date(leaseUntilMs).toISOString(),
    heartbeat_interval_ms: Math.max(15_000, Math.floor(pol.leaseMs / 2)),
    revalidate_interval_ms: pol.revalidateMs,
  });
});
