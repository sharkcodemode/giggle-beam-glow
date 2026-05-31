// ============= Lines 1-58 of 1139 total lines =============
1: // ACTO v2 — Edge Function
2: // Envelope criptografado AES-GCM 256 com chave derivada via HKDF-SHA256.
3: // Fluxo:
4: //   1. Extensão envia { v, license_id, salt, iv, ct } (base64) no body.
5: //   2. Edge deriva key = HKDF(ACTO_MASTER_SECRET, salt, info="acto-v2|"+license_id).
6: //   3. Edge descriptografa plaintext { action, params, captured, ts, nonce }.
7: //   4. Valida ts (anti-replay 5min) e licença via Apps Script.
8: //   5. Dispatcha action -> resposta cifrada com novo salt+iv.
9: //
10: // Ações expostas:
11: //   - license_check
12: //   - lovable_proxy        (replay genérico com headers capturados)
13: //   - send_message         (POST chat; aceita file_refs opacos)
14: //   - list_projects        (atalho: GET /api/projects)
15: //   - sheets_append        (POST Apps Script {action:"append", sheet, row})
16: //   - upload_init          (gera signed URL Lovable; retorna upload_ticket HMAC opaco)
17: //   - upload_finalize      (resolve download_url; retorna file_ref HMAC opaco)
18: 
19: // deno-lint-ignore-file no-explicit-any
20: 
21: const corsHeaders: Record<string, string> = {
22:   "Access-Control-Allow-Origin": "*",
23:   "Access-Control-Allow-Methods": "POST, OPTIONS",
24:   "Access-Control-Allow-Headers":
25:     "content-type, authorization, apikey, x-acto-license, x-acto-license-key, x-acto-extension-key, x-acto-device-id",
26:   "Access-Control-Max-Age": "86400",
27: };
28: 
29: const ACTO_NATIVE_MASK_TITLE = "⚡ 𝖠𝖢𝖳𝖮⚡ 𝖯𝗋𝗈𝗆𝗉𝗍 𝖱𝖾𝖼𝖾𝖻𝗂𝖽𝗈";
30: 
31: const MAX_SKEW_MS = 5 * 60 * 1000;
32: const UPLOAD_TICKET_TTL_MS = 10 * 60 * 1000; // 10 min — janela entre upload_init e upload_finalize
33: const FILE_REF_TTL_MS = 30 * 60 * 1000; // 30 min — janela entre upload_finalize e send_message
34: const MAX_FILES_PER_MESSAGE = 10;
35: const ACTO_EDGE_VERSION = "upload-minimo-10-sem-bloqueio-mime-2026-05-26";
36: const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB
37: const MAX_FILE_NAME_LEN = 255;
38: 
39: const ALLOWED_ACTIONS = new Set([
40:   "license_check",
41:   "lovable_proxy",
42:   "send_message",
43:   "list_projects",
44:   "sheets_append",
45:   "upload_init",
46:   "upload_finalize",
47:   "gateway_chat"
48: ]);
49: 
50: function isAllowedMime(m: string): boolean {
51:   if (typeof m !== "string") return false;
52:   const value = m.trim();
53:   if (!value || value.length > 255) return false;
54:   return true;
55: }
56: 
57: // ... (Simulação do restante do arquivo para o contexto do exemplo)
58: 
59: async function handleGatewayChat(params: any) {
60:   const { model, messages, temperature = 0.2, stream = false } = params;
61:   const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
62:   
63:   if (!LOVABLE_API_KEY) {
64:     throw new Error("LOVABLE_API_KEY não configurada na Edge Function.");
65:   }
66: 
67:   const response = await fetch("https://api.lovable.app/v1/chat/completions", {
68:     method: "POST",
69:     headers: {
70:       "Content-Type": "application/json",
71:       "Authorization": `Bearer ${LOVABLE_API_KEY}`,
72:       "x-lovable-model": model // Claude 3.5 Sonnet ou GPT-5.5 Pro
73:     },
74:     body: JSON.stringify({
75:       messages,
76:       temperature,
77:       stream
78:     })
79:   });
80: 
81:   return response;
82: }
