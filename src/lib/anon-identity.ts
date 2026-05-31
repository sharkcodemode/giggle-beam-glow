// PULSE — identidade anônima persistente
const CID_KEY = "pulse:client_id";
const HANDLE_KEY = "pulse:handle";

const ADJ = [
  "noctâmbulo","liminar","obsidiano","alvorecente","plásmico","oníric","subliminar",
  "espectral","cromático","abissal","ferro","cintilante","fulgur","cristalino",
  "veludo","cobalto","aurora","etéreo","sigíl","órbita","lunar",
];
const NOUN = [
  "raposa","corvo","lobo","mantra","ônix","fênix","quasar",
  "tigre","cervo","orca","falcão","pantera","cobra","ouriço",
  "polvo","grifo","linx","lince","gárgula","golem","drago",
];

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
}

function djb2(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h;
}

export interface AnonIdentity {
  clientId: string;
  handle: string;
  colorHash: number;
  hue: number;
}

export function getAnonIdentity(): AnonIdentity {
  if (typeof window === "undefined") {
    return { clientId: "ssr-placeholder", handle: "viajante", colorHash: 0, hue: 200 };
  }
  let clientId = window.localStorage.getItem(CID_KEY);
  if (!clientId) {
    clientId = uuid();
    window.localStorage.setItem(CID_KEY, clientId);
  }
  let handle = window.localStorage.getItem(HANDLE_KEY);
  if (!handle) {
    const a = ADJ[Math.floor(Math.random() * ADJ.length)];
    const n = NOUN[Math.floor(Math.random() * NOUN.length)];
    const num = String(Math.floor(Math.random() * 9000) + 1000);
    handle = `${a}-${n}-${num}`;
    window.localStorage.setItem(HANDLE_KEY, handle);
  }
  const colorHash = djb2(clientId);
  return { clientId, handle, colorHash, hue: colorHash % 360 };
}

export function regenerateHandle(): AnonIdentity {
  if (typeof window !== "undefined") window.localStorage.removeItem(HANDLE_KEY);
  return getAnonIdentity();
}
