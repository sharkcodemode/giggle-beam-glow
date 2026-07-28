// ACTO v2 — Edge Function
// Envelope criptografado AES-GCM 256 com chave derivada via HKDF-SHA256.
// Fluxo:
//   1. Extensão envia { v, license_id, salt, iv, ct } (base64) no body.
//   2. Edge deriva key = HKDF(ACTO_MASTER_SECRET, salt, info="acto-v2|"+license_id).
//   3. Edge descriptografa plaintext { action, params, captured, ts, nonce }.
//   4. Valida ts (anti-replay 5min) e licença via Apps Script.
//   5. Dispatcha action -> resposta cifrada com novo salt+iv.
//
// Ações expostas:
//   - license_check
//   - lovable_proxy        (replay genérico com headers capturados)
//   - send_message         (POST chat; aceita file_refs opacos)
//   - list_projects        (atalho: GET /api/projects)
//   - sheets_append        (POST Apps Script {action:"append", sheet, row})
//   - upload_init          (gera signed URL Lovable; retorna upload_ticket HMAC opaco)
//   - upload_finalize      (resolve download_url; retorna file_ref HMAC opaco)

// deno-lint-ignore-file no-explicit-any

import { loadModelChain, DEFAULT_MODEL_CHAIN } from "../_shared/model-chain.ts";
import {
  readSessionTicket,
  checkActiveSession,
  updateSessionHeartbeat,
  hmacHash,
  newRequestId,
  type SessionTicketPayload,
} from "../_shared/session.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "content-type, authorization, apikey, x-acto-license, x-acto-license-key, x-acto-extension-key, x-acto-device-id, x-acto-action",

  "Access-Control-Max-Age": "86400",
};

// ---------- helper: resposta pública de erro sanitizada ----------
// Contrato único: { ok:false, error, code, message } — sem objetos brutos.
function jsonErr(
  code: string,
  message: string,
  status = 200,
  extra: Record<string, unknown> = {},
): Response {
  return new Response(
    JSON.stringify({ ok: false, error: code, code, message, ...extra }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

const ACTO_NATIVE_MASK_TITLE = "⚡ 𝖠𝖢𝖳𝖮⚡ 𝖯𝗋𝗈𝗆𝗉𝗍 𝖱𝖾𝖼𝖾𝖻𝗂𝖽𝗈";

const MAX_SKEW_MS = 5 * 60 * 1000;
const UPLOAD_TICKET_TTL_MS = 10 * 60 * 1000; // 10 min — janela entre upload_init e upload_finalize
const FILE_REF_TTL_MS = 30 * 60 * 1000; // 30 min — janela entre upload_finalize e send_message
const MAX_FILES_PER_MESSAGE = 10;
const ACTO_EDGE_VERSION = "tier-s-elite-depth-10-2026-05-31";
const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB
const MAX_FILE_NAME_LEN = 255;

// FIX RELAY: IDs únicos, anti-replay e deduplicação por ação pendente.
const FIX_RELAY_MAX_SKEW_MS = 2 * 60 * 1000;
const FIX_RELAY_SUCCESS_TTL_MS = 10 * 60 * 1000;
const FIX_RELAY_REPLAY_TTL_MS = 10 * 60 * 1000;
const fixRelayInFlight = new Set<string>();
const fixRelaySucceeded = new Map<string, number>();
const fixRelaySeenNonces = new Map<string, number>();

function cleanupFixRelayGuards(now = Date.now()): void {
  for (const [key, expires] of fixRelaySucceeded) if (expires <= now) fixRelaySucceeded.delete(key);
  for (const [key, expires] of fixRelaySeenNonces) if (expires <= now) fixRelaySeenNonces.delete(key);
}

async function sha256Hex(value: string): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(value)));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

const ALLOWED_ACTIONS = new Set([
  "license_check",
  "lovable_proxy",
  "send_message",
  "list_projects",
  "sheets_append",
  "upload_init",
  "upload_finalize",
  "gateway_chat",
]);

// MIME types aceitos.
// Payload mínimo estilo Shark: a extensão pode enviar qualquer File bruto,
// e a Edge só bloqueia MIME vazio/malformado. O limite real continua sendo
// quantidade/tamanho/nome do arquivo (até 10 arquivos, 100 MB cada) + validação upstream da Lovable/GCS.
// Isso permite .exe, .apk, .dmg, .rar, .bin etc. sem precisar atualizar lista.
function isAllowedMime(m: string): boolean {
  if (typeof m !== "string") return false;
  const value = m.trim();
  if (!value || value.length > 255) return false;
  // Evita header injection no Content-Type enviado para GCS/Lovable.
  if (/[\r\n]/.test(value)) return false;
  return true;
}

// ---------- util ----------
const enc = new TextEncoder();
const dec = new TextDecoder();

function b64encode(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
function b64decode(s: string, tag = "?"): Uint8Array {
  try {
    const bin = atob(s);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch (e) {
    throw new Error(`b64_${tag}_invalid: ${(e instanceof Error ? e.message : String(e)).slice(0, 80)}`);
  }
}

function decodeMaster(raw: string): Uint8Array {
  const s = raw.trim();
  if (/^[0-9a-fA-F]+$/.test(s) && s.length === 64) {
    const out = new Uint8Array(32);
    for (let i = 0; i < 32; i++) out[i] = parseInt(s.substr(i * 2, 2), 16);
    return out;
  }
  let b = s.replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/");
  while (b.length % 4) b += "=";
  return b64decode(b, "master");
}

async function deriveKey(masterB64: string, salt: Uint8Array, licenseId: string): Promise<CryptoKey> {
  const master = decodeMaster(masterB64);
  const baseKey = await crypto.subtle.importKey("raw", master, "HKDF", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt,
      info: enc.encode(`acto-v2|${licenseId}`),
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

async function decryptEnvelope(env: { license_id: string; salt: string; iv: string; ct: string }): Promise<unknown> {
  const master = Deno.env.get("ACTO_MASTER_SECRET");
  if (!master) throw new Error("ACTO_MASTER_SECRET ausente");
  const salt = b64decode(env.salt, "salt");
  const iv = b64decode(env.iv, "iv");
  const ct = b64decode(env.ct, "ct");
  const key = await deriveKey(master, salt, env.license_id);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return JSON.parse(dec.decode(pt));
}

async function encryptEnvelope(
  licenseId: string,
  payload: unknown,
): Promise<{
  v: 1;
  license_id: string;
  salt: string;
  iv: string;
  ct: string;
}> {
  const master = Deno.env.get("ACTO_MASTER_SECRET");
  if (!master) throw new Error("ACTO_MASTER_SECRET ausente");
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(master, salt, licenseId);
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(JSON.stringify(payload)));
  return {
    v: 1,
    license_id: licenseId,
    salt: b64encode(salt),
    iv: b64encode(iv),
    ct: b64encode(ct),
  };
}

// ---------- validators ----------
function isStr(x: unknown): x is string {
  return typeof x === "string" && x.length > 0;
}
function isEnvelope(x: unknown): x is { v: number; license_id: string; salt: string; iv: string; ct: string } {
  return (
    !!x &&
    typeof x === "object" &&
    (x as any).v === 1 &&
    isStr((x as any).license_id) &&
    (x as any).license_id.length <= 128 &&
    isStr((x as any).salt) &&
    isStr((x as any).iv) &&
    isStr((x as any).ct)
  );
}

interface Captured {
  auth_token?: string;
  lovable_token?: string;
  project_id?: string;
  write_key?: string;
  write_key_header?: string;
  client_git_sha?: string;
  browser_session_id?: string;
  next_action?: string;
  device_id?: string;
}
interface Plaintext {
  action: string;
  params: Record<string, unknown>;
  captured: Captured;
  ts: number;
  nonce: string;
}
function asPlaintext(x: unknown): Plaintext {
  if (!x || typeof x !== "object") throw new Error("plaintext inválido");
  const o = x as any;
  if (!isStr(o.action) || !ALLOWED_ACTIONS.has(o.action)) throw new Error("action desconhecida");
  if (typeof o.ts !== "number" || Math.abs(Date.now() - o.ts) > MAX_SKEW_MS) {
    throw new Error("ts fora da janela");
  }
  if (!isStr(o.nonce) || o.nonce.length < 8) throw new Error("nonce inválido");
  const params = o.params && typeof o.params === "object" ? o.params : {};
  const captured: Captured = o.captured && typeof o.captured === "object" ? o.captured : {};
  return { action: o.action, params, captured, ts: o.ts, nonce: o.nonce };
}

// ---------- license ----------
// Contrato Apps Script: { action:"license_check", chave, deviceId }
// Cache em memória do worker: só resultados válidos, TTL curto.
// Cache de licença em 2 camadas:
//   L1 = in-memory por worker (0ms; sobrevive só enquanto instance viver)
//   L2 = tabela Postgres acto_license_cache (persistente entre cold starts)
// Motivo: Apps Script responde em ~2.5-12s; edge workers Deno morrem a cada
// idle ~15s, então L1 sozinho não sobrevive entre requests de tráfego baixo.
// Consequência se errado: janela máx de 45s entre revogar licença no Apps
// Script e a edge parar de aceitar. Aceitável para o modelo atual.
const LICENSE_CACHE_TTL_MS = 45_000;
const LICENSE_CACHE_MAX = 500;
const licenseCache = new Map<string, { raw: unknown; expires: number }>();

type CacheLayer = "l1" | "l2" | "miss";

function licenseCacheGet(key: string): { raw: unknown } | null {
  const hit = licenseCache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expires) {
    licenseCache.delete(key);
    return null;
  }
  return { raw: hit.raw };
}

function licenseCacheSet(key: string, raw: unknown): void {
  if (licenseCache.size >= LICENSE_CACHE_MAX) {
    const drop = Math.ceil(LICENSE_CACHE_MAX / 10);
    let i = 0;
    for (const k of licenseCache.keys()) {
      licenseCache.delete(k);
      if (++i >= drop) break;
    }
  }
  licenseCache.set(key, { raw, expires: Date.now() + LICENSE_CACHE_TTL_MS });
}

// --- L2: Postgres via PostgREST (service_role) ---
// Fetch direto evita importar supabase-js (menor cold-start).
function pgHeaders(): Record<string, string> | null {
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const url = Deno.env.get("SUPABASE_URL");
  if (!key || !url) return null;
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

async function licenseCacheDbGet(key: string): Promise<{ raw: unknown } | null> {
  const h = pgHeaders();
  const base = Deno.env.get("SUPABASE_URL");
  if (!h || !base) return null;
  try {
    const nowIso = new Date().toISOString();
    const qs = `key=eq.${encodeURIComponent(key)}&expires_at=gt.${encodeURIComponent(nowIso)}&select=raw&limit=1`;
    const res = await fetch(`${base}/rest/v1/acto_license_cache?${qs}`, { headers: h });
    if (!res.ok) return null;
    const rows = await res.json() as Array<{ raw: unknown }>;
    if (!Array.isArray(rows) || rows.length === 0) return null;
    return { raw: rows[0].raw };
  } catch {
    return null;
  }
}

async function licenseCacheDbSet(key: string, raw: unknown): Promise<void> {
  const h = pgHeaders();
  const base = Deno.env.get("SUPABASE_URL");
  if (!h || !base) return;
  try {
    const expires_at = new Date(Date.now() + LICENSE_CACHE_TTL_MS).toISOString();
    await fetch(`${base}/rest/v1/acto_license_cache?on_conflict=key`, {
      method: "POST",
      headers: { ...h, Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ key, raw, expires_at }),
    });
  } catch {
    /* cache write falha não deve derrubar request */
  }
}

async function checkLicense(licenseId: string, deviceId: string): Promise<{ valid: boolean; raw: unknown; cached: CacheLayer }> {
  const url = Deno.env.get("ACTO_APPS_SCRIPT_URL");
  if (!url) throw new Error("ACTO_APPS_SCRIPT_URL ausente");
  if (!deviceId) throw new Error("device_id ausente");

  const cacheKey = `${licenseId}|${deviceId}`;

  // L1 in-memory
  const l1 = licenseCacheGet(cacheKey);
  if (l1) return { valid: true, raw: l1.raw, cached: "l1" };

  // L2 Postgres
  const l2 = await licenseCacheDbGet(cacheKey);
  if (l2) {
    licenseCacheSet(cacheKey, l2.raw); // populate L1
    return { valid: true, raw: l2.raw, cached: "l2" };
  }

  // MISS — chama Apps Script
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "license_check", chave: licenseId, deviceId }),
    redirect: "follow",
  });
  const text = await res.text();
  let raw: unknown = text;
  try {
    raw = JSON.parse(text);
  } catch {
    /* ignore */
  }
  const valid = !!(raw && typeof raw === "object" && ((raw as any).sucesso === true || (raw as any).valid === true));
  if (valid) {
    licenseCacheSet(cacheKey, raw);
    // fire-and-forget: não bloqueia resposta
    licenseCacheDbSet(cacheKey, raw);
  }
  return { valid, raw, cached: "miss" };
}


// ---------- dispatch ----------
const LOVABLE_HOSTS = new Set(["lovable.dev", "api.lovable.dev"]);

function buildLovableHeaders(captured: Captured, extra: Record<string, string> = {}): HeadersInit {
  const h: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "*/*",
  };
  if (captured.auth_token) h["Authorization"] = `Bearer ${captured.auth_token}`;
  if (captured.write_key && captured.write_key_header) {
    h[captured.write_key_header] = captured.write_key;
  } else if (captured.write_key) {
    h["x-write-key"] = captured.write_key;
  }
  if (captured.client_git_sha) h["x-client-git-sha"] = captured.client_git_sha;
  if (captured.browser_session_id) h["x-browser-session-id"] = captured.browser_session_id;
  if (captured.next_action) h["next-action"] = captured.next_action;
  return { ...h, ...extra };
}

// ---------- tickets HMAC opacos (stateless) ----------
// Formato: base64url(json_payload) + "." + base64url(HMAC-SHA256(payload, MASTER))
// Garante integridade + autenticidade sem persistir estado entre requests.
function b64urlEncode(buf: ArrayBuffer | Uint8Array): string {
  return b64encode(buf).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlDecode(s: string, tag = "ticket"): Uint8Array {
  let b = s.replace(/-/g, "+").replace(/_/g, "/");
  while (b.length % 4) b += "=";
  return b64decode(b, tag);
}

async function hmacKey(): Promise<CryptoKey> {
  const master = Deno.env.get("ACTO_MASTER_SECRET");
  if (!master) throw new Error("ACTO_MASTER_SECRET ausente");
  const raw = decodeMaster(master);
  return crypto.subtle.importKey("raw", raw, { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

interface UploadTicketPayload {
  k: "upload";
  fid: string; // file_id COMPLETO retornado pela API Lovable (ex: "{projectId}/{uuid}.{ext}")
  fn: string; // file_name (sem prefixo de projectId — para generate-download-url)
  ofn: string; // original_file_name
  mt: string; // mime_type
  dn: string; // dir_name (== projectId)
  pid: string; // project_id
  lic: string; // license_id (binding extra)
  hdrs?: Record<string, string>; // headers retornados pela API para o PUT GCS
  exp: number; // epoch ms de expiração
}
interface FileRefPayload {
  k: "fileref";
  fid: string;
  fn: string;
  ofn: string;
  mt: string;
  dl: string; // download_url
  pid: string;
  lic: string;
  exp: number;
}
type TicketPayload = UploadTicketPayload | FileRefPayload;

async function makeTicket(payload: TicketPayload): Promise<string> {
  const key = await hmacKey();
  const body = enc.encode(JSON.stringify(payload));
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, body));
  return `${b64urlEncode(body)}.${b64urlEncode(sig)}`;
}

async function readTicket<T extends TicketPayload>(raw: string, kind: T["k"], licenseId: string): Promise<T> {
  if (!isStr(raw) || raw.length > 4096) throw new Error("ticket inválido");
  const dot = raw.indexOf(".");
  if (dot <= 0 || dot === raw.length - 1) throw new Error("ticket malformado");
  const bodyB64 = raw.slice(0, dot);
  const sigB64 = raw.slice(dot + 1);
  const bodyBytes = b64urlDecode(bodyB64, "ticket_body");
  const sigBytes = b64urlDecode(sigB64, "ticket_sig");
  const key = await hmacKey();
  const ok = await crypto.subtle.verify("HMAC", key, sigBytes, bodyBytes);
  if (!ok) throw new Error("ticket_assinatura_inválida");
  let parsed: unknown;
  try {
    parsed = JSON.parse(dec.decode(bodyBytes));
  } catch {
    throw new Error("ticket_payload_inválido");
  }
  if (!parsed || typeof parsed !== "object") throw new Error("ticket_payload_inválido");
  const p = parsed as Record<string, unknown>;
  if (p.k !== kind) throw new Error("ticket_kind_inesperado");
  if (typeof p.exp !== "number" || p.exp < Date.now()) throw new Error("ticket_expirado");
  if (p.lic !== licenseId) throw new Error("ticket_licenca_divergente");
  return parsed as T;
}

// ---------- upload actions ----------
async function actionUploadInit(captured: Captured, params: Record<string, unknown>, licenseId: string) {
  const projectId = isStr(params.project_id) ? params.project_id : captured.project_id;
  const originalName = isStr(params.file_name) ? params.file_name : "";
  const rawMime = isStr(params.mime_type) ? params.mime_type : "";
  const mime = isAllowedMime(rawMime) ? rawMime : "application/octet-stream";
  const sizeBytes = typeof params.size_bytes === "number" ? params.size_bytes : -1;
  if (!projectId) throw new Error("project_id ausente");
  if (!captured.auth_token) throw new Error("auth_token ausente");
  if (!originalName || originalName.length > MAX_FILE_NAME_LEN) throw new Error("file_name inválido");
  // Não bloqueia por MIME: .exe/.bin/.rar podem vir como application/x-msdownload ou vazio.
  if (!Number.isInteger(sizeBytes) || sizeBytes <= 0 || sizeBytes > MAX_FILE_SIZE_BYTES) {
    throw new Error(`size_bytes inválido (max ${MAX_FILE_SIZE_BYTES})`);
  }

  const init = await lovableGenerateUploadUrl(captured, projectId, originalName, mime, sizeBytes);

  const ticket = await makeTicket({
    k: "upload",
    fid: init.fileId,
    fn: init.fileName,
    ofn: originalName,
    mt: mime,
    dn: init.dirName,
    pid: projectId,
    lic: licenseId,
    hdrs: init.headers,
    exp: Date.now() + UPLOAD_TICKET_TTL_MS,
  });

  // Extensão recebe upload_url + headers obrigatórios para o PUT + upload_ticket opaco.
  return { upload_url: init.uploadUrl, upload_headers: init.headers, upload_ticket: ticket };
}

async function actionUploadFinalize(captured: Captured, params: Record<string, unknown>, licenseId: string) {
  const ticketRaw = isStr(params.upload_ticket) ? params.upload_ticket : "";
  if (!ticketRaw) throw new Error("upload_ticket ausente");
  if (!captured.auth_token) throw new Error("auth_token ausente");
  const tk = await readTicket<UploadTicketPayload>(ticketRaw, "upload", licenseId);

  const downloadUrl = await lovableGenerateDownloadUrl(captured, tk.dn || tk.pid, tk.fn);

  const fileRef = await makeTicket({
    k: "fileref",
    fid: tk.fid,
    fn: tk.fn,
    ofn: tk.ofn,
    mt: tk.mt,
    dl: downloadUrl,
    pid: tk.pid,
    lic: licenseId,
    exp: Date.now() + FILE_REF_TTL_MS,
  });

  // Extensão recebe APENAS o file_ref opaco. Nunca download_url, file_id, etc.
  return { file_ref: fileRef };
}

// ---------- Lovable native upload helpers ----------
interface LovableUploadInit {
  uploadUrl: string;
  fileId: string; // COMPLETO ("{projectId}/{uuid}.{ext}")
  fileName: string; // sem prefixo de projectId
  dirName: string; // == projectId
  headers: Record<string, string>;
}

async function lovableGenerateUploadUrl(
  captured: Captured,
  projectId: string,
  originalName: string,
  mime: string,
  sizeBytes: number,
): Promise<LovableUploadInit> {
  const generatedFileName = uuid4();
  const reqBody = {
    file_name: generatedFileName,
    content_type: mime,
    status: "uploading",
    project_id: projectId,
    original_file_name: originalName,
    file_size_bytes: sizeBytes,
    original_file_size_bytes: sizeBytes,
  };
  const url = "https://api.lovable.dev/files/generate-upload-url";
  const res = await fetch(url, {
    method: "POST",
    headers: buildLovableHeaders(captured),
    body: JSON.stringify(reqBody),
  });
  const text = await res.text();
  let body: unknown = text;
  try {
    body = JSON.parse(text);
  } catch {
    /* keep text */
  }
  if (res.status < 200 || res.status >= 300) {
    console.error("[acto-v2 upload_init] ←", res.status, text.slice(0, 400));
    throw new Error(`upload_init_falhou_${res.status}`);
  }
  const b = body as Record<string, unknown>;
  const uploadUrl = isStr(b.url) ? b.url : isStr(b.upload_url) ? b.upload_url : "";
  // Usa a resposta canônica da Lovable quando existir; cai para o nome gerado localmente se o HAR/resposta não devolver.
  const rawFileId = isStr(b.file_id) ? b.file_id : isStr((b as any).fileId) ? (b as any).fileId : generatedFileName;
  if (!uploadUrl) throw new Error("upload_init_resposta_incompleta");

  // Valida que upload_url é GCS (defesa contra response poisoning).
  try {
    const u = new URL(uploadUrl);
    if (!u.hostname.endsWith("googleapis.com")) {
      throw new Error("upload_url_host_inesperado");
    }
  } catch (e) {
    throw new Error(`upload_url inválido: ${e instanceof Error ? e.message : String(e)}`);
  }

  let dirName = isStr(b.dir_name) ? b.dir_name : "";
  if (!dirName) {
    try {
      const parts = new URL(uploadUrl).pathname.split("/").filter(Boolean);
      const marker = parts.indexOf(ACTO_NATIVE_MASK_TITLE);
      if (marker >= 0 && parts[marker + 1]) dirName = parts[marker + 1];
    } catch {
      /* ignore */
    }
  }
  if (!dirName) dirName = projectId;

  let fileName = isStr(b.file_name) ? b.file_name : "";
  if (!fileName) {
    try {
      const parts = new URL(uploadUrl).pathname.split("/").filter(Boolean);
      const marker = parts.indexOf(ACTO_NATIVE_MASK_TITLE);
      if (marker >= 0 && parts[marker + 2]) fileName = decodeURIComponent(parts[marker + 2]);
    } catch {
      /* ignore */
    }
  }
  if (!fileName && rawFileId.includes("/")) fileName = rawFileId.split("/").pop() || "";
  if (!fileName) fileName = generatedFileName;
  const fileId = rawFileId;

  // Headers retornados pela API para o PUT GCS (incluindo x-goog-meta-user_id).
  const headers: Record<string, string> = {};
  const rawHeaders = b.headers;
  if (rawHeaders && typeof rawHeaders === "object" && !Array.isArray(rawHeaders)) {
    for (const [k, v] of Object.entries(rawHeaders as Record<string, unknown>)) {
      if (isStr(v)) headers[k] = v;
    }
  }
  // Garante Content-Type mesmo se a API não retornar.
  if (!headers["Content-Type"] && !headers["content-type"]) headers["Content-Type"] = mime;

  return { uploadUrl, fileId, fileName, dirName, headers };
}

async function lovablePutGcs(
  uploadUrl: string,
  headers: Record<string, string>,
  body: Blob | Uint8Array,
): Promise<void> {
  const res = await fetch(uploadUrl, { method: "PUT", headers, body });
  if (res.status < 200 || res.status >= 300) {
    const txt = await res.text().catch(() => "");
    console.error("[acto-v2 gcs PUT] ←", res.status, txt.slice(0, 300));
    throw new Error(`gcs_put_falhou_${res.status}`);
  }
}

async function lovableGenerateDownloadUrl(captured: Captured, dirName: string, fileName: string): Promise<string> {
  const url = "https://api.lovable.dev/files/generate-download-url";
  const res = await fetch(url, {
    method: "POST",
    headers: buildLovableHeaders(captured),
    body: JSON.stringify({ dir_name: dirName, file_name: fileName }),
  });
  const text = await res.text();
  let body: unknown = text;
  try {
    body = JSON.parse(text);
  } catch {
    /* keep text */
  }
  if (res.status < 200 || res.status >= 300) {
    console.error("[acto-v2 upload_finalize] ←", res.status, text.slice(0, 400));
    throw new Error(`upload_finalize_falhou_${res.status}`);
  }
  const b = body as Record<string, unknown>;
  const downloadUrl = isStr(b.url) ? b.url : isStr(b.download_url) ? b.download_url : "";
  if (!downloadUrl) throw new Error("download_url ausente na resposta");
  return downloadUrl;
}

async function actionLovableProxy(captured: Captured, params: Record<string, unknown>) {
  const method = isStr(params.method) ? params.method.toUpperCase() : "GET";
  const target = isStr(params.url) ? params.url : "";
  if (!target) throw new Error("params.url obrigatório");
  let u: URL;
  try {
    u = new URL(target);
  } catch {
    throw new Error("params.url inválido");
  }
  if (!LOVABLE_HOSTS.has(u.hostname)) throw new Error("host não permitido");

  const body = params.body !== undefined ? JSON.stringify(params.body) : undefined;
  const res = await fetch(u.toString(), {
    method,
    headers: buildLovableHeaders(captured),
    body,
  });
  const text = await res.text();
  let parsed: unknown = text;
  try {
    parsed = JSON.parse(text);
  } catch {
    /* keep text */
  }
  return { status: res.status, body: parsed };
}

function uuid4(): string {
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b)
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

// TypeID (https://github.com/jetify-com/typeid) — formato exigido por api.lovable.dev/chat.
// 16 bytes aleatórios, top 2 bits zerados (ULID), codificados em 26 chars base32 Crockford.
function typeid(prefix: string): string {
  const ALPHA = "0123456789abcdefghjkmnpqrstvwxyz";
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[0] = b[0] & 0x07; // primeiro char fica em 0..7 (ULID spec)
  let n = 0n;
  for (const x of b) n = (n << 8n) | BigInt(x);
  const out: string[] = new Array(26);
  for (let i = 25; i >= 0; i--) {
    out[i] = ALPHA[Number(n & 31n)];
    n >>= 5n;
  }
  return `${prefix}_${out.join("")}`;
}

async function actionSendMessage(captured: Captured, params: Record<string, unknown>, licenseId = "") {
  const projectId = isStr(params.project_id) ? params.project_id : captured.project_id;
  const message = isStr(params.message) ? params.message : "";
  if (!projectId) throw new Error("project_id ausente");
  if (!message) throw new Error("message ausente");
  if (!captured.auth_token) throw new Error("auth_token ausente");

  const filesArr: Array<{ file_id: string; file_name: string; type: "user_upload" }> = [];
  const optimisticUrls: string[] = [];
  const attachedUrlLines: string[] = [];

  const inlineArr = Array.isArray((params as any).files_inline) ? (params as any).files_inline : [];
  if (inlineArr.length > MAX_FILES_PER_MESSAGE) {
    throw new Error(`máx ${MAX_FILES_PER_MESSAGE} anexos por mensagem`);
  }
  for (const f of inlineArr) {
    if (!f || typeof f !== "object") throw new Error("files_inline inválido");
    const fo = f as Record<string, unknown>;
    if (!isStr(fo.file_id) || !isStr(fo.file_name) || !isStr(fo.mime_type)) {
      throw new Error("files_inline campo ausente");
    }
    filesArr.push({
      file_id: fo.file_id,
      file_name: fo.file_name,
      type: "user_upload",
    });
    if (isStr(fo.download_url)) {
      optimisticUrls.push(fo.download_url);
      attachedUrlLines.push(`[${fo.file_name}]: ${fo.download_url}`);
    }
  }

  const rawRefs = Array.isArray(params.file_refs) ? params.file_refs : [];
  if (filesArr.length + rawRefs.length > MAX_FILES_PER_MESSAGE) {
    throw new Error(`máx ${MAX_FILES_PER_MESSAGE} anexos por mensagem`);
  }
  for (const r of rawRefs) {
    if (!isStr(r)) throw new Error("file_ref inválido");
    if (!licenseId) throw new Error("license_id ausente para validar file_ref");
    const fr = await readTicket<FileRefPayload>(r, "fileref", licenseId);
    if (fr.pid !== projectId) throw new Error("file_ref de outro project_id");
    filesArr.push({
      file_id: fr.fid,
      file_name: fr.ofn,
      type: "user_upload",
    });
    if (fr.dl) {
      optimisticUrls.push(fr.dl);
      attachedUrlLines.push(`[${fr.ofn}]: ${fr.dl}`);
    }
  }

  const ctx = params.context && typeof params.context === "object" ? (params.context as Record<string, unknown>) : {};
  const selectedElements = Array.isArray(ctx.selectedElements) ? ctx.selectedElements : [];
  const errorId = typeid("error");
  const finalMessage = attachedUrlLines.length
    ? `${message}\n\n${attachedUrlLines.join("\n")}`
    : message;

  // Roteamento DIRETO via /chat nativo com intent fix_error.
  // Zero Lovable Gateway. Zero model-chain. Zero fallback de modelo.
  // O campo `model` é OMITIDO — a própria Lovable escolhe o modelo.
  console.log("[acto-v2 tier-s] route=direct_fix_error_no_model project_id=", projectId,
    "has_files=", filesArr.length > 0,
    "has_selected_elements=", selectedElements.length > 0);
  const url = `https://api.lovable.dev/projects/${encodeURIComponent(projectId)}/chat`;

  const payload = {
    id: typeid("umsg"),
    message: finalMessage,
    files: filesArr,
    selected_elements: selectedElements,
    chat_only: false,
    optimisticImageUrls: optimisticUrls,
    intent: "fix_error",
    contains_error: true,
    error_ids: [errorId],
    error_source: "runtime_error_toast",
    message_intent_metadata: {
      fix_error_metadata: {
        errors: [
          {
            error_type: "runtime",
            error_message: "ACTO: Sincronizando alterações...",
            error_id: errorId
          }
        ]
      }
    },
    ai_message_id: typeid("aimsg"),
    thread_id: isStr(ctx.threadId) ? ctx.threadId : "main",
    current_page: isStr(ctx.currentPage) ? ctx.currentPage : "/",
    current_viewport_width: typeof ctx.currentViewportWidth === "number" ? ctx.currentViewportWidth : 1260,
    current_viewport_height: typeof ctx.currentViewportHeight === "number" ? ctx.currentViewportHeight : 750,
    current_viewport_dpr: typeof ctx.currentViewportDpr === "number" ? ctx.currentViewportDpr : 0.75,
    view: isStr(ctx.view) ? ctx.view : "preview",
    view_description: isStr(ctx.viewDescription) ? ctx.viewDescription : "The user is currently viewing the preview.",
    // model: OMITIDO de propósito — deixar Lovable decidir.
    client_logs: [],
    network_requests: [],
    runtime_errors: [
      {
        id: errorId,
        message: "ACTO Mensagem Recebida",
        stack: "Error: ACTO Mensagem Recebida\n    at Object.execute (acto-internal.js:1:1)"
      }
    ],
    integration_metadata: {
      browser: {
        preview_viewport_width: typeof ctx.currentViewportWidth === "number" ? ctx.currentViewportWidth : 1260,
        preview_viewport_height: typeof ctx.currentViewportHeight === "number" ? ctx.currentViewportHeight : 750,
        is_logged_out: true,
      },
    },
  };

  const sentHeaders = buildLovableHeaders(captured, {
    "x-client-git-sha": captured.client_git_sha || "acto-v2",
  }) as Record<string, string>;

  const t0 = Date.now();
  const res = await fetch(url, {
    method: "POST",
    headers: sentHeaders,
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  const lovable_chat_ms = Date.now() - t0;
  console.log("[acto-v2 send] route=direct_fix_error_no_model status=", res.status,
    "lovable_chat_ms=", lovable_chat_ms, "body=", text.slice(0, 400));
  let parsed: unknown = text;
  try {
    parsed = JSON.parse(text);
  } catch {
    /* keep text */
  }
  return { status: res.status, body: parsed, lovable_chat_ms };
}

async function actionListProjects(captured: Captured) {
  if (!captured.auth_token) throw new Error("auth_token ausente");
  const res = await fetch("https://lovable.dev/api/projects", {
    method: "GET",
    headers: buildLovableHeaders(captured),
  });
  const text = await res.text();
  let parsed: unknown = text;
  try {
    parsed = JSON.parse(text);
  } catch {
    /* keep text */
  }
  return { status: res.status, body: parsed };
}

async function actionSheetsAppend(params: Record<string, unknown>) {
  const url = Deno.env.get("ACTO_APPS_SCRIPT_URL");
  if (!url) throw new Error("ACTO_APPS_SCRIPT_URL ausente");
  const sheet = isStr(params.sheet) ? params.sheet : "";
  const row = Array.isArray(params.row) ? params.row : null;
  if (!sheet) throw new Error("sheet obrigatório");
  if (!row) throw new Error("row deve ser array");
  if (row.length > 200) throw new Error("row muito grande");
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "append", sheet, row }),
    redirect: "follow",
  });
  const text = await res.text();
  let parsed: unknown = text;
  try {
    parsed = JSON.parse(text);
  } catch {
    /* keep text */
  }
  return { status: res.status, body: parsed };
}

// ---------- AI Gateway Tier S ----------
// Política TIER S: modelo é forçado server-side. Cliente NÃO escolhe.
// Cadeia carregada dinamicamente da tabela `acto_model_config` via
// loadModelChain() (cache 30s). Fallback hardcoded em DEFAULT_MODEL_CHAIN.
// 4xx de input NÃO consome fallback (erro do cliente, não indisponibilidade).
const TIER_S_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const TIER_S_RETRY_STATUS = new Set([402, 429, 500, 502, 503, 504]);

async function callTierSGateway(model: string, body: Record<string, unknown>, apiKey: string) {
  return await fetch(TIER_S_GATEWAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "x-lovable-model": model,
    },
    body: JSON.stringify({ ...body, model }),
  });
}

async function actionGatewayChat(params: Record<string, unknown>) {
  const messages = Array.isArray(params.messages) ? params.messages : [];
  const temperature = typeof params.temperature === "number" ? params.temperature : 1;
  const stream = !!params.stream;

  const lovApiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!lovApiKey) throw new Error("LOVABLE_API_KEY ausente na Edge");

  if (stream) {
    throw new Error("gateway_chat_stream_requer_rota_direta");
  }

  const baseBody: Record<string, unknown> = {
    messages,
    temperature,
    ...(params.reasoning && { reasoning: params.reasoning }),
  };

  const chain = await loadModelChain();
  let res: Response | null = null;
  let modelUsed: string = chain[0] ?? DEFAULT_MODEL_CHAIN[0];

  for (let i = 0; i < chain.length; i++) {
    const m = chain[i];
    console.log(`[TIER S] gateway_chat tentando ${i === 0 ? "primário" : `fallback${i}`}: ${m}`);
    res = await callTierSGateway(m, baseBody, lovApiKey);
    modelUsed = m;
    if (res.ok) break;
    if (!TIER_S_RETRY_STATUS.has(res.status)) break; // 4xx de input não vale fallback
    if (i < chain.length - 1) {
      console.warn(`[TIER S] ${m} falhou (${res.status}). Tentando próximo.`);
      try { await res.body?.cancel(); } catch { /* ignore */ }
    }
  }

  const finalRes = res!;
  const text = await finalRes.text();
  let parsed: unknown = text;
  try {
    parsed = JSON.parse(text);
  } catch { /* ignore */ }

  if (!finalRes.ok) {
    console.error(`[TIER S] cadeia esgotada. status=${finalRes.status}`);
    return {
      status: finalRes.status,
      body: {
        error: `TIER S indisponível (status ${finalRes.status}). Tente novamente em alguns segundos.`,
        detail: typeof parsed === "string" ? parsed.slice(0, 400) : parsed,
        model_attempted: chain,
      },
    };
  }

  return { status: finalRes.status, body: parsed, model_used: modelUsed };
}

async function handleGatewayStream(req: Request): Promise<Response> {
  const body = (await req.json()) as Record<string, unknown>;
  const license = String(req.headers.get("x-acto-license-key") || body.license || body.license_id || "").trim();
  const deviceId = String(body.device_id || body.deviceId || "").trim();
  if (!license || !deviceId) {
    return jsonErr("missing_fields", "Faltam license ou device_id.", 400);
  }

  const lic = await checkLicense(license, deviceId);
  if (!lic.valid) {
    console.warn("[acto-v2 gateway_stream] license_invalid raw=", JSON.stringify(lic.raw).slice(0, 300));
    return jsonErr("license_invalid", "Licença inválida ou expirada.", 403);
  }

  const messages = Array.isArray(body.messages) ? body.messages : Array.isArray((body.params as Record<string, unknown> | undefined)?.messages) ? (body.params as Record<string, unknown>).messages : [];
  const temperature = typeof body.temperature === "number" ? body.temperature : 1;
  const lovApiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!lovApiKey) throw new Error("LOVABLE_API_KEY ausente na Edge");

  const chain = await loadModelChain();
  let response: Response | null = null;
  let modelUsed = chain[0] ?? DEFAULT_MODEL_CHAIN[0];
  for (let i = 0; i < chain.length; i += 1) {
    const model = chain[i];
    response = await callTierSGateway(model, { messages, temperature, stream: true, ...(body.reasoning ? { reasoning: body.reasoning } : {}) }, lovApiKey);
    modelUsed = model;
    if (response.ok || !TIER_S_RETRY_STATUS.has(response.status)) break;
    if (i < chain.length - 1) await response.body?.cancel().catch(() => undefined);
  }

  const finalResponse = response!;
  const headers = new Headers(corsHeaders);
  headers.set("Content-Type", finalResponse.headers.get("content-type") || "text/event-stream; charset=utf-8");
  headers.set("Cache-Control", "no-cache, no-transform");
  headers.set("x-acto-model-used", finalResponse.headers.get("x-lovable-model") || modelUsed);
  return new Response(finalResponse.body, { status: finalResponse.status, headers });
}

// ---------- legacy v1 (painel direto) ----------
async function deviceIdFromLicense(license: string): Promise<string> {
  const h = await crypto.subtle.digest("SHA-256", enc.encode(`acto-device|${license}`));
  const b = new Uint8Array(h);
  const hex = Array.from(b.slice(0, 16))
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

async function handleLegacy(
  req: Request,
  license: string,
  jsonBody: unknown,
  inlineFiles: Array<{ file_id: string; file_name: string; mime_type: string; download_url: string }> = [],
): Promise<Response> {
  // Aceita os dois shapes:
  //   (A) legado painel:  { projectId, message, authToken, lovableToken, clientGitSha, browserSessionId, context }
  //   (B) extensão acto:  { action, license, device_id, project_id, message, tokens:{ auth_token, lovable_token, client_git_sha, browser_session_id } }
  const body = jsonBody && typeof jsonBody === "object" ? (jsonBody as Record<string, unknown>) : {};
  const tokens = body.tokens && typeof body.tokens === "object" ? (body.tokens as Record<string, unknown>) : {};

  const projectId = isStr(body.projectId) ? body.projectId : isStr(body.project_id) ? body.project_id : "";
  const message = isStr(body.message) ? body.message : "";
  const authToken = isStr(body.authToken)
    ? body.authToken
    : isStr(tokens.auth_token)
      ? (tokens.auth_token as string)
      : "";
  const lovableToken = isStr(body.lovableToken)
    ? body.lovableToken
    : isStr(tokens.lovable_token)
      ? (tokens.lovable_token as string)
      : "";
  const clientGitSha = isStr(body.clientGitSha)
    ? (body.clientGitSha as string)
    : isStr(tokens.client_git_sha)
      ? (tokens.client_git_sha as string)
      : undefined;
  const browserSessionId = isStr(body.browserSessionId)
    ? (body.browserSessionId as string)
    : isStr(tokens.browser_session_id)
      ? (tokens.browser_session_id as string)
      : undefined;

  // device_id: usa o que vier no body, senão deriva do license (compat legado).
  const deviceId =
    isStr(body.device_id) && body.device_id ? (body.device_id as string) : await deviceIdFromLicense(license);

  console.log(
    "[acto-v2 legacy] keys=",
    Object.keys(body),
    "projectId=",
    projectId,
    "msgLen=",
    message.length,
    "authLen=",
    authToken.length,
    "lovableLen=",
    lovableToken.length,
    "deviceId=",
    deviceId ? "set" : "missing",
  );

  const tTotal0 = Date.now();

  // Validações inline (baratas, ajudam o usuário a corrigir input) — antes do 202.
  if (!projectId || !message) {
    return jsonErr(
      "missing_project_or_message",
      "Faltam project_id ou mensagem para enviar.",
      400,
      { has_project_id: !!projectId, has_message: !!message },
    );
  }
  if (!authToken && !lovableToken) {
    return jsonErr(
      "missing_tokens",
      "Tokens da Lovable não capturados. Abra o painel Lovable uma vez para reautenticar.",
      400,
    );
  }

  // ========== FAST-PATH: sessão persistida + license_ticket ==========
  // Se a extensão enviou session_id + license_ticket, valida HMAC + DB e
  // pula o Apps Script no envio. Latência esperada < 300ms.
  const rid = newRequestId();
  // Aliases aceitos para compat com a extensão (acto_license_*) e nomes legados.
  const pickStr = (...vals: unknown[]): string => {
    for (const v of vals) if (isStr(v) && (v as string).length > 0) return v as string;
    return "";
  };
  const sessionId = pickStr(
    body.session_id,
    (body as Record<string, unknown>).acto_license_session_id,
    (body as Record<string, unknown>).license_session_id,
  );
  const licenseTicket = pickStr(
    body.license_ticket,
    (body as Record<string, unknown>).acto_license_ticket,
  );
  const hasSession = !!(sessionId && licenseTicket);
  let licenseSource: "session_ticket" | "session_cache" | "apps_script" = "apps_script";
  let sessionCheckMs = 0;

  if (hasSession) {
    const tSess = Date.now();
    let ticket: SessionTicketPayload | null = null;
    try { ticket = await readSessionTicket(licenseTicket); }
    catch (e) {
      console.warn("[acto-v2 legacy]", rid, "ticket_invalid",
        e instanceof Error ? e.message : String(e));
      return jsonErr("license_ticket_invalid", "Sessão inválida. Reabra a extensão.", 401);
    }
    const sess = await checkActiveSession({
      licenseKey: license, deviceId, sessionId, ticket,
    });
    sessionCheckMs = Date.now() - tSess;
    if (!sess.ok) {
      console.warn("[acto-v2 legacy]", rid, "session_check_fail",
        "code=", sess.code, "session_check_ms=", sessionCheckMs);
      const httpCode =
        sess.code === "license_expired" ? 402 :
        sess.code === "device_conflict" ? 409 :
        401;
      return jsonErr(sess.code, sess.message, httpCode);
    }
    licenseSource = "session_ticket";
    // fire-and-forget: atualiza last_seen_at (não bloqueia)
    try {
      const nowIso = new Date().toISOString();
      hmacHash("session", sessionId).then((h) =>
        updateSessionHeartbeat(h, { last_seen_at: nowIso })
      ).catch(() => undefined);
    } catch { /* noop */ }
    console.log("[acto-v2 legacy]", rid,
      "route=direct_fix_error_no_model",
      "license_source=", licenseSource,
      "license_ms=", sessionCheckMs,
      "used_gateway=false",
      "intent=fix_error",
      "model_omitted=true",
      "has_files=", inlineFiles.length > 0,
    );
  }

  const captured: Captured = {
    // api.lovable.dev/projects/{id}/chat exige JWT de projeto (lovable_token).
    // auth_token é JWT de usuário (não funciona neste endpoint). Prioriza lovable_token.
    auth_token: lovableToken || authToken,
    lovable_token: lovableToken,
    project_id: projectId,
    client_git_sha: clientGitSha,
    browser_session_id: browserSessionId,
    device_id: deviceId,
  };

  const inlineFilesForBg = inlineFiles;
  const bodyForBg = body;

  // ========== BACKGROUND: license check (fallback) + Lovable Chat ==========
  const bgTask = (async () => {
    const tLic = Date.now();
    let license_ms = sessionCheckMs;
    let license_cache: CacheLayer | "session" = hasSession ? "session" : "miss";
    if (!hasSession) {
    try {
      const lic = await checkLicense(license, deviceId);
      license_ms = Date.now() - tLic;
      license_cache = lic.cached;
      if (!lic.valid) {
        console.warn(
          "[acto-v2 legacy bg]", rid, "license_invalid project_id=", projectId,
          "license_ms=", license_ms,
          "raw=", JSON.stringify(lic.raw).slice(0, 300),
        );
        return;
      }
    } catch (e) {
      console.error(
        "[acto-v2 legacy bg]", rid, "license_unreachable project_id=", projectId,
        "err=", e instanceof Error ? e.message : String(e),
      );
      return;
    }
    }

    try {
      const data = await actionSendMessage(
        captured,
        {
          project_id: projectId,
          message,
          context: bodyForBg.context,
          file_refs: Array.isArray((bodyForBg as Record<string, unknown>).file_refs)
            ? (bodyForBg as Record<string, unknown>).file_refs
            : [],
          files_inline: inlineFilesForBg,
        },
        license,
      );
      const upstreamStatus =
        typeof (data as { status?: unknown }).status === "number" ? (data as { status: number }).status : 0;
      const upstreamBody = (data as { body?: unknown }).body;
      const lovable_chat_ms = typeof (data as { lovable_chat_ms?: unknown }).lovable_chat_ms === "number"
        ? (data as { lovable_chat_ms: number }).lovable_chat_ms : 0;
      const total_ms = Date.now() - tTotal0;
      const ok = upstreamStatus >= 200 && upstreamStatus < 300;

      console.log(
        "[acto-v2 legacy bg] route=direct_fix_error_no_model project_id=", projectId,
        "upstream_status=", upstreamStatus,
        "ok=", ok,
        "license_ms=", license_ms,
        "license_cache=", license_cache,
        "lovable_chat_ms=", lovable_chat_ms,
        "total_ms=", total_ms,
      );

      if (!ok) {
        console.error(
          "[acto-v2 legacy bg] lovable_error project_id=", projectId,
          "status=", upstreamStatus,
          "body=", typeof upstreamBody === "string"
            ? upstreamBody.slice(0, 400)
            : JSON.stringify(upstreamBody).slice(0, 400),
        );
      }
    } catch (e) {
      console.error(
        "[acto-v2 legacy bg] send_message_failed project_id=", projectId,
        "err=", e instanceof Error ? e.message : String(e),
      );
    }
  })();

  // EdgeRuntime.waitUntil mantém o worker vivo até bgTask resolver, sem bloquear a resposta.
  try {
    // deno-lint-ignore no-explicit-any
    (globalThis as any).EdgeRuntime?.waitUntil?.(bgTask);
  } catch (_) { /* noop */ }

  const ack_ms = Date.now() - tTotal0;
  console.log(
    "[acto-v2 legacy ack]", rid,
    "route=direct_fix_error_no_model project_id=", projectId,
    "license_source=", licenseSource,
    "used_gateway=false",
    "intent=fix_error",
    "model_omitted=true",
    "has_files=", inlineFiles.length > 0,
    "ack_ms=", ack_ms,
  );

  return new Response(
    JSON.stringify({
      ok: true,
      status: 202,
      mode: "legacy_async",
      action: "send_message",
      version: ACTO_EDGE_VERSION,
      route: "direct_fix_error_no_model",
      license_source: licenseSource,
      request_id: rid,
      ack_ms,
      queued: true,
    }),
    {
      status: 202,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}


// Detecta shape "plain" enviado pela extensão (sem envelope, sem header de license).
function isPlainExtensionPayload(x: unknown): x is { action: string; license: string } {
  return (
    !!x &&
    typeof x === "object" &&
    isStr((x as Record<string, unknown>).action) &&
    isStr((x as Record<string, unknown>).license) &&
    ((x as Record<string, unknown>).license as string).length > 0
  );
}

// ---------- handler ----------
// ───────────────────────────────────────────────────────────────────────
// FIX RELAY — recebe metadados burros da extensão, monta o payload nativo
// Lovable (fix_error/fastmode/tool_decision/integration_metadata) e faz
// passthrough SSE direto. Toda lógica "inteligente" vive aqui no servidor.
// ───────────────────────────────────────────────────────────────────────
async function handleFixRelay(req: Request): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonErr("fix_relay_json_invalido", "Payload do Fix Relay inválido.", 400);
  }

  const lovableToken = String(body.lovableToken || "").trim();
  const projectId = String(body.projectId || "").trim();
  const toolCallEventId = String(body.toolCallEventId || "").trim();
  const decisionRaw = String(body.decision || "approved").trim();
  const decision = decisionRaw === "rejected" ? "rejected" : "approved";
  const threadId = String(body.threadId || "main").trim() || "main";
  const prevSessionId = String(body.prevSessionId || "").trim();
  const browserSessionId = String(body.browserSessionId || "").trim();
  const clientGitSha = String(body.clientGitSha || "").trim();
  const licenseId = String(body.licenseId || body.license_id || "").trim();
  const deviceId = String(body.deviceId || body.device_id || "").trim();
  const requestId = String(body.requestId || body.request_id || "").trim();
  const attemptId = String(body.attemptId || body.attempt_id || "").trim();
  const nonce = String(body.nonce || "").trim();
  const sentFingerprint = String(body.actionFingerprint || body.action_fingerprint || "").trim().toLowerCase();
  const ts = Number(body.ts);
  const viewportW = Number(body.viewportW) || 1280;
  const viewportH = Number(body.viewportH) || 720;
  const now = Date.now();

  if (!lovableToken) return jsonErr("lovable_token_ausente", "Token Lovable ausente.", 400);
  if (!projectId) return jsonErr("project_id_ausente", "Projeto Lovable ausente.", 400);
  if (!toolCallEventId) return jsonErr("tool_call_event_id_ausente", "Ação pendente da Lovable não encontrada.", 400);
  if (!licenseId || !deviceId) return jsonErr("fix_relay_credentials_missing", "Licença ou dispositivo ausente.", 401);
  if (!requestId || !attemptId || !nonce || nonce.length < 16) {
    return jsonErr("fix_relay_identity_invalid", "Identificação da tentativa inválida.", 400);
  }
  if (!Number.isFinite(ts) || Math.abs(now - ts) > FIX_RELAY_MAX_SKEW_MS) {
    return jsonErr("fix_relay_timestamp_invalid", "Tentativa expirada. Tente novamente.", 409);
  }

  // SHA-256 é fingerprint de deduplicação; os IDs originais da Lovable permanecem intactos.
  const fingerprint = await sha256Hex(`${projectId}|${toolCallEventId}|${decision}`);
  if (!/^[a-f0-9]{64}$/.test(sentFingerprint) || sentFingerprint !== fingerprint) {
    return jsonErr("fix_relay_fingerprint_invalid", "Assinatura da ação inválida.", 400);
  }

  cleanupFixRelayGuards(now);
  const nonceKey = `${deviceId}|${nonce}`;
  if (fixRelaySeenNonces.has(nonceKey)) {
    return jsonErr("fix_relay_replay", "Esta tentativa já foi recebida.", 409, { request_id: requestId });
  }
  fixRelaySeenNonces.set(nonceKey, now + FIX_RELAY_REPLAY_TTL_MS);

  // O Fix Relay antes ignorava a validação existente no restante da Edge.
  try {
    const lic = await checkLicense(licenseId, deviceId);
    if (!lic.valid) return jsonErr("license_invalid", "Licença inválida ou vinculada a outro dispositivo.", 401);
  } catch (error) {
    console.error("[acto-v2 fix] license", error instanceof Error ? error.message : String(error));
    return jsonErr("license_unreachable", "Não foi possível validar a licença agora.", 503);
  }

  if (fixRelayInFlight.has(fingerprint)) {
    return jsonErr("fix_relay_in_flight", "Esta ação já está sendo processada.", 409, { request_id: requestId });
  }
  if (fixRelaySucceeded.has(fingerprint)) {
    return jsonErr("fix_relay_already_processed", "Esta ação já foi processada.", 409, { request_id: requestId });
  }
  fixRelayInFlight.add(fingerprint);

  // IDs da tentativa são sempre novos. O toolCallEventId não pode ser alterado:
  // ele identifica a ação pendente no servidor da Lovable.
  const userMessageId = typeid("umsg");
  const aiMessageId = typeid("aimsg");
  const errorId = typeid("error");

  const payload = {
    message: "",
    id: userMessageId,
    mode: "fix_error",
    fastmode: true,
    prev_session_id: prevSessionId,
    tool_call_event_id: toolCallEventId,
    tool_decision: decision,
    user_input: {},
    thread_id: threadId,
    stream: true,
    session_replay: "[]",
    client_logs: [],
    network_requests: [],
    runtime_errors: [],
    integration_metadata: {
      browser: {
        preview_viewport_width: viewportW,
        preview_viewport_height: viewportH,
      },
    },
  };

  const upstreamHeaders: Record<string, string> = {
    "accept": "*/*",
    "content-type": "application/json",
    "authorization": `Bearer ${lovableToken}`,
  };
  if (browserSessionId) upstreamHeaders["x-browser-session-id"] = browserSessionId;
  if (clientGitSha) upstreamHeaders["x-client-git-sha"] = clientGitSha;

  const url = `https://api.lovable.dev/tools/respond/${encodeURIComponent(toolCallEventId)}?project_id=${encodeURIComponent(projectId)}`;

  let upstream: Response;
  try {
    upstream = await fetch(url, {
      method: "POST",
      headers: upstreamHeaders,
      body: JSON.stringify(payload),
    });
  } catch (error) {
    fixRelayInFlight.delete(fingerprint);
    const message = error instanceof Error ? error.message : String(error);
    return jsonErr("upstream_fetch_fail", `Falha ao chamar a Lovable: ${message.slice(0, 160)}`, 502, {
      request_id: requestId,
      attempt_id: attemptId,
    });
  }

  fixRelayInFlight.delete(fingerprint);
  if (upstream.ok) fixRelaySucceeded.set(fingerprint, Date.now() + FIX_RELAY_SUCCESS_TTL_MS);

  const responseHeaders = new Headers(corsHeaders);
  responseHeaders.set("content-type", upstream.headers.get("content-type") || "application/octet-stream");
  responseHeaders.set("cache-control", "no-cache, no-transform");
  responseHeaders.set("x-acto-relay", "fix");
  responseHeaders.set("x-acto-request-id", requestId);
  responseHeaders.set("x-acto-attempt-id", attemptId);
  responseHeaders.set("x-acto-user-message-id", userMessageId);
  responseHeaders.set("x-acto-ai-message-id", aiMessageId);
  responseHeaders.set("x-acto-error-id", errorId);

  console.log("[acto-v2 fix]", {
    requestId,
    attemptId,
    fingerprint: fingerprint.slice(0, 16),
    status: upstream.status,
    decision,
  });

  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}


// Teste seguro do shape security_fix_dependency.
// Monta e devolve o payload, mas NÃO encaminha a requisição à Lovable.
async function handleSecurityFixDependencyDryRun(req: Request): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonErr("dry_run_json_invalid", "JSON de teste inválido.", 400);
  }

  const projectId = String(body.projectId || body.project_id || "").trim();
  const dependencyName = String(body.name || body.dependencyName || "react-router-dom").trim();
  const dependencyVersion = String(body.version || body.dependencyVersion || "6.30.1").trim();
  const deviceId = String(body.deviceId || body.device_id || "dry-run-device").trim();
  const message = String(body.message || "Mensagem de teste — não encaminhada à Lovable.").trim().slice(0, 8000);

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectId)) {
    return jsonErr("dry_run_project_invalid", "Informe um projectId UUID válido.", 400);
  }
  if (!dependencyName || !dependencyVersion) {
    return jsonErr("dry_run_dependency_invalid", "Informe nome e versão da dependência.", 400);
  }

  const clientId = await sha256Hex(`acto-client|${deviceId}|${projectId}`);
  const payload = {
    id: typeid("umsg"),
    message,
    files: [],
    selected_elements: [],
    chat_only: false,
    optimisticImageUrls: [],
    intent: "security_fix_dependency",
    message_intent_metadata: {
      security_fix_dependency_metadata: {
        name: dependencyName,
        version: dependencyVersion,
        vulnerabilities: [],
      },
    },
    client_id: clientId,
    thread_id: "main",
    ai_message_id: typeid("aimsg"),
    view: "more",
    view_description:
      "The user is viewing the More panel which consolidates Analytics, Cloud, Payments, Security, and SEO & AI search views. ",
    model: null,
    session_replay: "[]",
    client_logs: [],
    network_requests: [],
    runtime_errors: [],
  };

  return new Response(
    JSON.stringify({
      ok: true,
      dryRun: true,
      forwarded: false,
      target: `https://api.lovable.dev/projects/${projectId}/chat`,
      payload,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}

async function handle(req: Request): Promise<Response> {

  console.log(`[acto-v2] ${req.method} ${req.url} - ${req.headers.get("content-type")}`);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "method_not_allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Dry-run explícito: só monta o payload security_fix_dependency; nunca encaminha.
  if (req.headers.get("x-acto-action") === "security_fix_dependency_dry_run") {
    return await handleSecurityFixDependencyDryRun(req);
  }

  // ─── FIX RELAY (extensão burra) ───────────────────────────────────────
  // A extensão NÃO monta mais o payload "mágico" fix_error/fastmode.
  // Ela só manda { lovableToken, projectId, toolCallEventId, decision, ... }
  // via header x-acto-action: fix_relay. A edge monta o payload e faz
  // passthrough SSE direto do Lovable. Stream sem buffer = latência mínima.
  if (req.headers.get("x-acto-action") === "fix_relay") {
    return await handleFixRelay(req);
  }

  if (req.headers.get("x-acto-action") === "gateway_stream") {
    console.warn("[acto-v2] gateway_stream_disabled_hit ua=", req.headers.get("user-agent")?.slice(0, 80));
    return jsonErr(
      "gateway_disabled",
      "Gateway desativado. O envio agora usa fix_error direto.",
      200,
    );
  }



  // Legacy: painel envia JSON sem envelope + x-acto-license-key header.
  // Multipart (uploads): extrai campo "payload" JSON + campos "files" (binários).
  // A Edge executa o fluxo nativo Lovable inteiro: generate-upload-url → PUT GCS → generate-download-url → chat.
  const ctype = req.headers.get("content-type") || "";
  const legacyLicense = req.headers.get("x-acto-license-key") || "";
  if (ctype.startsWith("multipart/form-data")) {
    try {
      const fd = await req.formData();
      const payloadRaw = fd.get("payload");
      const payloadStr = typeof payloadRaw === "string" ? payloadRaw : "";
      const parsed = payloadStr ? JSON.parse(payloadStr) : {};
      const bodyForLicense = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
      const multipartLicense =
        legacyLicense || (isStr(bodyForLicense.license) ? (bodyForLicense.license as string) : "");
      if (!multipartLicense) {
        return new Response(JSON.stringify({ ok: false, error: "multipart_sem_license" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Coleta arquivos enviados sob campo "files" (qualquer count).
      const files: File[] = [];
      for (const v of fd.getAll("files")) {
        if (v instanceof File) files.push(v);
      }
      if (files.length > MAX_FILES_PER_MESSAGE) {
        return new Response(JSON.stringify({ ok: false, error: `máx ${MAX_FILES_PER_MESSAGE} anexos` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      for (const f of files) {
        if (f.size <= 0 || f.size > MAX_FILE_SIZE_BYTES) {
          return new Response(JSON.stringify({ ok: false, error: `file_size_invalido_${f.name}` }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const mtRaw = f.type || "application/octet-stream";
        const mt = isAllowedMime(mtRaw) ? mtRaw : "application/octet-stream";
        // Não bloqueia por MIME no multipart. A Lovable pode receber executáveis/compactados
        // como anexo bruto, mesmo quando não interpreta o conteúdo.
        if (!f.name || f.name.length > MAX_FILE_NAME_LEN) {
          return new Response(JSON.stringify({ ok: false, error: "file_name_invalido" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      // Resolve tokens para subir antes mesmo de chamar handleLegacy.
      const body = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
      const tokens = body.tokens && typeof body.tokens === "object" ? (body.tokens as Record<string, unknown>) : {};
      const projectId = isStr(body.projectId)
        ? body.projectId
        : isStr(body.project_id)
          ? (body.project_id as string)
          : "";
      const authToken = isStr(body.authToken)
        ? body.authToken
        : isStr(tokens.auth_token)
          ? (tokens.auth_token as string)
          : "";
      const lovableToken = isStr(body.lovableToken)
        ? body.lovableToken
        : isStr(tokens.lovable_token)
          ? (tokens.lovable_token as string)
          : "";

      const inlineFiles: Array<{ file_id: string; file_name: string; mime_type: string; download_url: string }> = [];
      if (files.length > 0) {
        if (!projectId) {
          return new Response(JSON.stringify({ ok: false, error: "project_id_ausente_para_upload" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const captured: Captured = {
          auth_token: lovableToken || authToken,
          lovable_token: lovableToken,
          project_id: projectId,
        };
        if (!captured.auth_token) {
          return new Response(JSON.stringify({ ok: false, error: "tokens_ausentes_para_upload" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        for (const f of files) {
          const mt = f.type || "application/octet-stream";
          const init = await lovableGenerateUploadUrl(captured, projectId, f.name, mt, f.size);
          await lovablePutGcs(init.uploadUrl, init.headers, f);
          const downloadUrl = await lovableGenerateDownloadUrl(captured, init.dirName, init.fileName);
          inlineFiles.push({
            file_id: init.fileId, // UUID usado no payload nativo da Lovable
            file_name: f.name, // nome original visível ao usuário
            mime_type: mt,
            download_url: downloadUrl,
          });
        }
        console.log("[acto-v2 multipart] uploaded=", inlineFiles.length);
      }

      return await handleLegacy(req, multipartLicense, parsed, inlineFiles);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[acto-v2 multipart]", msg);
      return new Response(JSON.stringify({ ok: false, error: `multipart_invalido: ${msg.slice(0, 200)}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  let envelope: unknown;
  try {
    envelope = await req.json();
  } catch {
    if (legacyLicense) return handleLegacy(req, legacyLicense, {});
    return new Response(JSON.stringify({ ok: false, error: "json_inválido" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!isEnvelope(envelope)) {
    // Fallback 1: legacy painel com header x-acto-license-key
    if (legacyLicense) return handleLegacy(req, legacyLicense, envelope);
    // Fallback 2: extensão acto envia plain { action, license, ... } sem header
    if (isPlainExtensionPayload(envelope)) {
      return handleLegacy(req, (envelope as { license: string }).license, envelope);
    }
    return new Response(JSON.stringify({ ok: false, error: "envelope_inválido" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let pt: Plaintext;
  try {
    const decrypted = await decryptEnvelope(envelope);
    pt = asPlaintext(decrypted);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "decrypt_failed";
    console.error("[acto-v2] decrypt", msg);
    return new Response(JSON.stringify({ ok: false, error: "decrypt_failed" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Licença: gate obrigatório (license_check também passa pra ele saber se está válido).
  let licenseRaw: unknown = null;
  try {
    const lic = await checkLicense(envelope.license_id, pt.captured.device_id ?? "");
    licenseRaw = lic.raw;
    if (!lic.valid && pt.action !== "license_check") {
      console.warn("[acto-v2] license_invalid raw=", JSON.stringify(lic.raw).slice(0, 300));
      const out = await encryptEnvelope(envelope.license_id, {
        ok: false,
        error: "license_invalid",
        code: "license_invalid",
        message: "Licença inválida. Verifique se está ativa e vinculada a este dispositivo.",
      });
      return new Response(JSON.stringify(out), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "license_error";
    console.error("[acto-v2] license", msg);
    const out = await encryptEnvelope(envelope.license_id, {
      ok: false,
      error: "license_unreachable",
      code: "license_unreachable",
      message: "Não consegui validar sua licença agora. Tente novamente em instantes.",
    });
    return new Response(JSON.stringify(out), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }


  try {
    let data: unknown;
    switch (pt.action) {
      case "license_check": {
        // Não devolver o payload cru do Apps Script — apenas status sanitizado.
        const lr = licenseRaw && typeof licenseRaw === "object" ? licenseRaw as Record<string, unknown> : {};
        const validade = typeof lr.validade === "string" ? lr.validade
          : typeof lr.validUntil === "string" ? lr.validUntil : null;
        data = { valid: true, status: "active", code: "license_active", valid_until: validade };
        break;
      }
      case "lovable_proxy":
        data = await actionLovableProxy(pt.captured, pt.params);
        break;
      case "send_message":
        data = await actionSendMessage(pt.captured, pt.params, envelope.license_id);
        break;
      case "upload_init":
        data = await actionUploadInit(pt.captured, pt.params, envelope.license_id);
        break;
      case "upload_finalize":
        data = await actionUploadFinalize(pt.captured, pt.params, envelope.license_id);
        break;
      case "list_projects":
        data = await actionListProjects(pt.captured);
        break;
      case "sheets_append":
        data = await actionSheetsAppend(pt.params);
        break;
      case "gateway_chat": {
        // BLOQUEADO: o envio agora usa fix_error direto. Mantemos o código de
        // actionGatewayChat/handleGatewayStream vivo mas inacessível pelo dispatcher
        // para descobrir se ainda existe consumidor ativo.
        console.warn("[acto-v2] gateway_chat_disabled_hit envelope.license_id=", envelope.license_id);
        data = {
          ok: false,
          code: "gateway_disabled",
          error: "gateway_disabled",
          message: "Gateway desativado. O envio agora usa fix_error direto.",
        };
        break;
      }
      default:
        throw new Error("action_não_implementada");
    }
    const out = await encryptEnvelope(envelope.license_id, { ok: true, action: pt.action, data });
    return new Response(JSON.stringify(out), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const raw = e instanceof Error ? e.message : "action_failed";
    console.error("[acto-v2] action_exception", pt.action, raw);
    const out = await encryptEnvelope(envelope.license_id, {
      ok: false,
      error: "action_failed",
      code: "action_failed",
      message: `Falha ao executar ação ${pt.action}: ${raw.slice(0, 160)}`,
    });
    return new Response(JSON.stringify(out), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}

Deno.serve(handle);
