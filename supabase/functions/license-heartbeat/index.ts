// license-heartbeat
// Valida ticket + sessão persistida, renova lease sem passar de valid_until,
// e revalida Apps Script periodicamente conforme a policy da licença.

import {
  corsHeaders, jsonErr, jsonOk,
  callAppsScriptLicense, checkActiveSession, hmacHash,
  makeSessionTicket, policyFor, readSessionTicket,
  updateSessionHeartbeat, newRequestId,
} from "../_shared/session.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return jsonErr("method_not_allowed", "Método não permitido.", 405);

  const rid = newRequestId();
  const t0 = Date.now();

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return jsonErr("invalid_json", "Corpo inválido."); }

  const licenseKey = String(body.license_key ?? "").trim().toUpperCase();
  const deviceId = String(body.device_id ?? "").trim();
  const sessionId = String(body.session_id ?? "").trim();
  const licenseTicket = String(body.license_ticket ?? "").trim();
  const extensionVersion = String(body.extension_version ?? "acto").trim().slice(0, 40);

  if (!licenseKey || !deviceId || !sessionId || !licenseTicket) {
    return jsonErr("missing_fields", "Campos obrigatórios ausentes.");
  }

  let ticket;
  try { ticket = await readSessionTicket(licenseTicket); }
  catch (e) {
    console.warn("[heartbeat]", rid, "ticket_invalid", e instanceof Error ? e.message : String(e));
    return jsonErr("license_ticket_invalid", "Sessão inválida. Reabra a extensão.");
  }

  const sess = await checkActiveSession({ licenseKey, deviceId, sessionId, ticket });
  if (!sess.ok) {
    console.warn("[heartbeat]", rid, "session_check_fail", sess.code);
    return jsonErr(sess.code, sess.message);
  }

  const now = Date.now();
  const pol = policyFor(licenseKey, sess.validUntilMs);

  // Revalidação Apps Script quando expirou o intervalo desde o último check.
  const sessionIdHash = sess.sessionIdHash;
  const remainingToValidUntil = sess.validUntilMs - now;
  const shouldRevalidate = remainingToValidUntil < Math.max(60_000, pol.leaseMs);

  let as_ms = 0;
  let newValidUntilMs = sess.validUntilMs;
  if (shouldRevalidate) {
    const tAs = Date.now();
    const as = await callAppsScriptLicense(licenseKey, deviceId, extensionVersion);
    as_ms = Date.now() - tAs;
    if (!as.ok) {
      await updateSessionHeartbeat(sessionIdHash, {
        status: "revoked",
        revoked_at: new Date(now).toISOString(),
        last_apps_script_check_at: new Date(now).toISOString(),
      });
      console.warn("[heartbeat]", rid, "revalidate_fail", as.code, "as_ms=", as_ms);
      return jsonErr(as.code, as.message);
    }
    if (as.validUntilISO) {
      newValidUntilMs = new Date(as.validUntilISO).getTime();
    }
  }

  if (newValidUntilMs <= now) {
    await updateSessionHeartbeat(sessionIdHash, {
      status: "expired",
      revoked_at: new Date(now).toISOString(),
      last_apps_script_check_at: shouldRevalidate ? new Date(now).toISOString() : undefined,
    });
    return jsonErr("license_expired", "Licença expirada.");
  }

  const leaseUntilMs = Math.min(now + pol.leaseMs, newValidUntilMs);
  await updateSessionHeartbeat(sessionIdHash, {
    lease_expires_at: new Date(leaseUntilMs).toISOString(),
    last_seen_at: new Date(now).toISOString(),
    valid_until: new Date(newValidUntilMs).toISOString(),
    ...(shouldRevalidate ? { last_apps_script_check_at: new Date(now).toISOString() } : {}),
  });

  const newTicket = await makeSessionTicket({
    k: "session",
    sid: sessionId,
    lic: licenseKey,
    did: deviceId,
    vu: newValidUntilMs,
    exp: leaseUntilMs,
  });

  console.log("[heartbeat]", rid,
    "route=license_heartbeat",
    "revalidated=", shouldRevalidate,
    "as_ms=", as_ms,
    "total_ms=", Date.now() - t0,
  );

  return jsonOk({
    status: "active",
    code: "license_active",
    message: "Sessão renovada.",
    license_ticket: newTicket,
    valid_until: new Date(newValidUntilMs).toISOString(),
    lease_expires_at: new Date(leaseUntilMs).toISOString(),
    heartbeat_interval_ms: Math.max(15_000, Math.floor(pol.leaseMs / 2)),
    revalidate_interval_ms: pol.revalidateMs,
  });
});
