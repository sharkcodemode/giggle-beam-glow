// Higiene anti-loop para envios fix_error / relay ACTO.
// Objetivos (ordem do produto):
//   1. thread estável por assinatura de erro (nova conversa só p/ problema novo)
//   2. nunca reenviar automaticamente um pedido que já falhou
//   3. mesmo error_id para retries do MESMO erro
//   4. error_id novo só quando a assinatura muda de verdade
//   5. avisar quando o prompt está muito parecido com envios recentes

export type AntiLoopVerdict = {
  /** id determinístico derivado da assinatura do erro */
  error_id: string;
  /** thread sugerida — estável enquanto a assinatura for a mesma */
  thread_hint: string;
  /** 0..1 — similaridade com o envio recente mais próximo */
  similarity: number;
  /** quantas vezes essa assinatura já foi enviada na janela */
  repeat_count: number;
  /** true quando o envio deve ser barrado (duplicata imediata ou retry de falha) */
  blocked: boolean;
  /** motivo legível do bloqueio/aviso, ou null */
  reason: string | null;
  /** aviso não-bloqueante para exibir na extensão */
  warning: string | null;
};

type Entry = {
  sig: string;
  errorId: string;
  tokens: Set<string>;
  firstAt: number;
  lastAt: number;
  count: number;
  lastStatus: number | null;
};

const WINDOW_MS = 15 * 60 * 1000; // janela de memória por assinatura
const DUP_MS = 45 * 1000; // duplicata exata dentro disso = bloqueio
const FAIL_COOLDOWN_MS = 20 * 1000; // após falha, exige espera antes de reenviar
const SIMILAR_THRESHOLD = 0.82; // aviso de prompt quase idêntico
const MAX_ENTRIES = 400;

const store = new Map<string, Entry>();

function now(): number {
  return Date.now();
}

function prune(): void {
  const cutoff = now() - WINDOW_MS;
  for (const [key, entry] of store) {
    if (entry.lastAt < cutoff) store.delete(key);
  }
  if (store.size > MAX_ENTRIES) {
    const sorted = [...store.entries()].sort((a, b) => a[1].lastAt - b[1].lastAt);
    for (const [key] of sorted.slice(0, store.size - MAX_ENTRIES)) store.delete(key);
  }
}

/** Normaliza o texto removendo ruído volátil (ids, timestamps, números, paths). */
export function normalizeMessage(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, " ")
    .replace(/\b\d{4}-\d{2}-\d{2}t[\d:.]+z?\b/g, " ")
    .replace(/\b0x[0-9a-f]+\b/g, " ")
    .replace(/\b\d+\b/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(normalized: string): Set<string> {
  return new Set(normalized.split(" ").filter((word) => word.length > 2));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const token of a) if (b.has(token)) inter++;
  return inter / (a.size + b.size - inter);
}

async function sha(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Avalia um envio. `scope` deve isolar licença + projeto.
 * `force` ignora bloqueios (usuário confirmou o reenvio manualmente).
 */
export async function evaluateSend(
  scope: string,
  message: string,
  force = false,
): Promise<AntiLoopVerdict> {
  prune();
  const normalized = normalizeMessage(message);
  const tokens = tokenize(normalized);
  const sig = (await sha(`${scope}|${normalized}`)).slice(0, 24);
  const key = `${scope}|${sig}`;
  const errorId = `err_${sig}`;
  const threadHint = `thr_${sig.slice(0, 12)}`;
  const t = now();

  let best = 0;
  for (const [otherKey, entry] of store) {
    if (otherKey === key || !otherKey.startsWith(`${scope}|`)) continue;
    const score = jaccard(tokens, entry.tokens);
    if (score > best) best = score;
  }

  const existing = store.get(key);
  let blocked = false;
  let reason: string | null = null;

  if (existing && !force) {
    if (t - existing.lastAt < DUP_MS) {
      blocked = true;
      reason = "duplicate_recent";
    } else if (
      existing.lastStatus !== null &&
      existing.lastStatus >= 400 &&
      t - existing.lastAt < FAIL_COOLDOWN_MS
    ) {
      blocked = true;
      reason = "previous_attempt_failed";
    }
  }

  const similarity = existing ? Math.max(best, 1) : best;
  let warning: string | null = null;
  if (blocked && reason === "duplicate_recent") {
    warning = "Pedido idêntico enviado há poucos segundos — reenvio bloqueado para evitar loop detection.";
  } else if (blocked) {
    warning = "A tentativa anterior deste mesmo erro falhou. Aguarde ou reescreva antes de reenviar.";
  } else if (existing && existing.count >= 2) {
    warning = `Este erro já foi enviado ${existing.count}x. Reescreva a abordagem em vez de repetir o mesmo texto.`;
  } else if (similarity >= SIMILAR_THRESHOLD) {
    warning = `Prompt ${Math.round(similarity * 100)}% parecido com um envio recente — varie a estrutura para não acionar o detector de loop.`;
  }

  if (!blocked) {
    store.set(key, {
      sig,
      errorId,
      tokens,
      firstAt: existing?.firstAt ?? t,
      lastAt: t,
      count: (existing?.count ?? 0) + 1,
      lastStatus: null,
    });
  }

  return {
    error_id: errorId,
    thread_hint: threadHint,
    similarity: Number(similarity.toFixed(2)),
    repeat_count: existing?.count ?? 0,
    blocked,
    reason,
    warning,
  };
}

/** Registra o desfecho real do envio para bloquear auto-retry de falhas. */
export function recordOutcome(scope: string, errorId: string, status: number): void {
  const key = `${scope}|${errorId.replace(/^err_/, "")}`;
  const entry = store.get(key);
  if (entry) {
    entry.lastStatus = status;
    entry.lastAt = now();
  }
}
