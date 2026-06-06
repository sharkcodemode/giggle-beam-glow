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

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "content-type, authorization, apikey, x-acto-license, x-acto-license-key, x-acto-extension-key, x-acto-device-id",
  "Access-Control-Max-Age": "86400",
};

const ACTO_NATIVE_MASK_TITLE = "⚡ 𝖠𝖢𝖳𝖮⚡ 𝖯𝗋𝗈𝗆𝗉𝗍 𝖱𝖾𝖼𝖾𝖻𝗂𝖽𝗈";

const MAX_SKEW_MS = 5 * 60 * 1000;
const UPLOAD_TICKET_TTL_MS = 10 * 60 * 1000; // 10 min — janela entre upload_init e upload_finalize
const FILE_REF_TTL_MS = 30 * 60 * 1000; // 30 min — janela entre upload_finalize e send_message
const MAX_FILES_PER_MESSAGE = 10;
const ACTO_EDGE_VERSION = "tier-s-elite-depth-10-2026-05-31";
const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB
const MAX_FILE_NAME_LEN = 255;

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
async function checkLicense(licenseId: string, deviceId: string): Promise<{ valid: boolean; raw: unknown }> {
  const url = Deno.env.get("ACTO_APPS_SCRIPT_URL");
  if (!url) throw new Error("ACTO_APPS_SCRIPT_URL ausente");
  if (!deviceId) throw new Error("device_id ausente");
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
  // Apps Script Acto responde { sucesso: true } em caso válido.
  const valid = !!(raw && typeof raw === "object" && ((raw as any).sucesso === true || (raw as any).valid === true));
  return { valid, raw };
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
  const finalMessage = attachedUrlLines.length
    ? `${message}\n\n${attachedUrlLines.join("\n")}`
    : message;

  // Roteamento via /chat nativo com intent fix_error (única rota gratuita validada).
  // Payload de erro é sintético; mensagem do usuário vai pura, sem wrapper.
  console.log("[acto-v2 tier-s] Routing via ACTO bridge");
  const url = `https://api.lovable.dev/projects/${encodeURIComponent(projectId)}/chat`;

  const payload = {
    id: typeid("umsg"),
    message: finalMessage,
    files: filesArr,
    selected_elements: (ctx as any).selectedElements ?? [],
    chat_only: false,
    optimisticImageUrls: optimisticUrls,
    intent: "fix_error", // Retornando para a única intent que realmente pula o scanner e funciona
    contains_error: true,
    error_ids: [typeid("error")],
    error_source: "runtime_error_toast",
    message_intent_metadata: {
      fix_error_metadata: {
        errors: [
          {
            error_type: "runtime",
            error_message: "ACTO: Sincronizando alterações...",
            error_id: typeid("error")
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
    model: "anthropic/claude-4.5-opus",
    client_logs: [],
    network_requests: [],
    runtime_errors: [
      {
        id: typeid("error"),
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

  const res = await fetch(url, {
    method: "POST",
    headers: sentHeaders,
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  console.log("[acto-v2 send] ←", res.status, "body=", text.slice(0, 600));
  let parsed: unknown = text;
  try {
    parsed = JSON.parse(text);
  } catch {
    /* keep text */
  }
  return { status: res.status, body: parsed };
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
// Cadeia (6 níveis, executada em ordem em caso de 402/429/5xx):
//   1. anthropic/claude-4.5-opus         (Claude top de linha — primário)
//   2. anthropic/claude-4.5-sonnet       (Claude abaixo do top — fallback 1)
//   3. openai/gpt-5.5-pro                (GPT top de linha — fallback 2)
//   4. openai/gpt-5.5                    (GPT abaixo do top — fallback 3)
//   5. google/gemini-3.1-pro-preview     (Gemini top preview — fallback 4)
//   6. google/gemini-2.5-pro             (Gemini estável abaixo do top — fallback 5)
// 4xx de input NÃO consome fallback (erro do cliente, não indisponibilidade).
const TIER_S_CHAIN = [
  "anthropic/claude-4.5-opus",
  "anthropic/claude-4.5-sonnet",
  "openai/gpt-5.5-pro",
  "openai/gpt-5.5",
  "google/gemini-3.1-pro-preview",
  "google/gemini-2.5-pro",
] as const;
const TIER_S_PRIMARY = TIER_S_CHAIN[0];
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
    throw new Error("streaming_not_implemented_in_gateway_action");
  }

  const baseBody: Record<string, unknown> = {
    messages,
    temperature,
    ...(params.reasoning && { reasoning: params.reasoning }),
  };

  const chain = TIER_S_CHAIN;
  let res: Response | null = null;
  let modelUsed: string = TIER_S_PRIMARY;

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

  let licenseRaw: unknown = null;
  try {
    const lic = await checkLicense(license, deviceId);
    licenseRaw = lic.raw;
    if (!lic.valid) {
      return new Response(JSON.stringify({ ok: false, error: "license_invalid", license: lic.raw }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (e) {
    console.error("[acto-v2 legacy] license", e instanceof Error ? e.message : String(e));
    return new Response(JSON.stringify({ ok: false, error: "license_unreachable" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!projectId || !message) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "missing_project_or_message",
        detail: { hasProjectId: !!projectId, hasMessage: !!message },
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
  if (!authToken && !lovableToken) {
    return new Response(JSON.stringify({ ok: false, error: "missing_tokens" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
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
  try {
    const data = await actionSendMessage(
      captured,
      {
        project_id: projectId,
        message,
        context: body.context,
        file_refs: Array.isArray((body as Record<string, unknown>).file_refs)
          ? (body as Record<string, unknown>).file_refs
          : [],
        files_inline: inlineFiles,
      },
      license,
    );
    const upstreamStatus =
      typeof (data as { status?: unknown }).status === "number" ? (data as { status: number }).status : 0;
    const upstreamBody = (data as { body?: unknown }).body;
    const ok = upstreamStatus >= 200 && upstreamStatus < 300;
    return new Response(
      JSON.stringify({
        ok,
        status: upstreamStatus,
        mode: "legacy",
        action: "send_message",
        version: ACTO_EDGE_VERSION,
        error: ok ? undefined : upstreamBody,
        data,
        nativeChatMask: data && typeof data === "object" ? (data as any).nativeChatMask : undefined,
        license: licenseRaw,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "legacy_failed";
    console.error("[acto-v2 legacy] send", msg);
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
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
async function handle(req: Request): Promise<Response> {
  console.log(`[acto-v2] ${req.method} ${req.url} - ${req.headers.get("content-type")}`);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "method_not_allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
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
      const out = await encryptEnvelope(envelope.license_id, {
        ok: false,
        error: "license_invalid",
        license: lic.raw,
      });
      return new Response(JSON.stringify(out), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "license_error";
    console.error("[acto-v2] license", msg);
    const out = await encryptEnvelope(envelope.license_id, { ok: false, error: "license_unreachable" });
    return new Response(JSON.stringify(out), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    let data: unknown;
    switch (pt.action) {
      case "license_check":
        data = { license: licenseRaw };
        break;
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
      case "gateway_chat":
        data = await actionGatewayChat(pt.params);
        break;
      default:
        throw new Error("action_não_implementada");
    }
    const out = await encryptEnvelope(envelope.license_id, { ok: true, action: pt.action, data });
    return new Response(JSON.stringify(out), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "action_failed";
    console.error("[acto-v2] action", pt.action, msg);
    const out = await encryptEnvelope(envelope.license_id, { ok: false, error: msg });
    return new Response(JSON.stringify(out), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}

Deno.serve(handle);
