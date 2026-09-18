/**
 * Pure JWT decoding + security checks, plus a real in-browser HMAC crack.
 *
 * Everything here is genuine: base64url decoding of the real token, real
 * structural checks, and — for HS256/384/512 — real HMAC verification via the
 * browser's Web Crypto, so a "weak secret" finding means a candidate actually
 * reproduced the signature, not a guess. Nothing is sent anywhere; the token
 * never leaves the page.
 */

export type Severity = "critical" | "warning" | "info" | "ok";

export interface Finding {
  severity: Severity;
  title: string;
  detail: string;
}

export interface DecodedJwt {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  headerB64: string;
  payloadB64: string;
  signatureB64: string;
  alg: string;
}

const HMAC_HASH: Record<string, string> = {
  HS256: "SHA-256", HS384: "SHA-384", HS512: "SHA-512",
};

function b64urlToString(b64url: string): string {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/")
    + "===".slice((b64url.length + 3) % 4);
  const bin = atob(b64);
  // Decode as UTF-8 so non-ASCII claims render correctly.
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/** Parse a compact JWS. Throws a readable error on anything malformed. */
export function decodeJwt(token: string): DecodedJwt {
  const t = token.trim();
  const parts = t.split(".");
  if (parts.length !== 3) {
    throw new Error(
      parts.length < 3
        ? "This doesn't look like a JWT — a JWT has three parts separated by dots (header.payload.signature)."
        : "Too many dots — a compact JWT has exactly three parts.",
    );
  }
  const [headerB64, payloadB64, signatureB64] = parts;
  let header: Record<string, unknown>;
  let payload: Record<string, unknown>;
  try {
    header = JSON.parse(b64urlToString(headerB64));
  } catch {
    throw new Error("The header isn't valid base64url-encoded JSON.");
  }
  try {
    payload = JSON.parse(b64urlToString(payloadB64));
  } catch {
    throw new Error("The payload isn't valid base64url-encoded JSON.");
  }
  const alg = typeof header.alg === "string" ? header.alg : "";
  return { header, payload, headerB64, payloadB64, signatureB64, alg };
}

const SENSITIVE_KEYS = [
  "password", "passwd", "pwd", "secret", "api_key", "apikey", "access_token",
  "refresh_token", "private_key", "credit_card", "card_number", "cvv", "ssn",
  "social_security", "pin",
];

function fmtDuration(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  if (d > 365) return `${(d / 365).toFixed(1)} years`;
  if (d >= 1) return `${d} day${d === 1 ? "" : "s"}`;
  const h = Math.floor(seconds / 3600);
  if (h >= 1) return `${h} hour${h === 1 ? "" : "s"}`;
  return `${Math.max(0, Math.floor(seconds / 60))} minutes`;
}

/** Structural / claim security checks. The weak-secret result is added
 *  separately by the caller once the async crack finishes. */
export function runChecks(d: DecodedJwt): Finding[] {
  const f: Finding[] = [];
  const { header, payload, alg } = d;
  const now = Math.floor(Date.now() / 1000);

  // Algorithm.
  if (!alg || alg.toLowerCase() === "none") {
    f.push({ severity: "critical", title: "Algorithm is \"none\"",
      detail: "The token declares no signature algorithm. If the server accepts alg:none it trusts the token without verifying it at all — anyone can forge any claims. Servers must reject alg:none." });
  } else if (HMAC_HASH[alg]) {
    f.push({ severity: "info", title: `Symmetric signature (${alg})`,
      detail: "Signed with a shared secret (HMAC). Its safety depends entirely on that secret being long and random — see the weak-secret check below." });
  } else if (/^(RS|ES|PS)/.test(alg)) {
    f.push({ severity: "info", title: `Asymmetric signature (${alg})`,
      detail: "Signed with a private key; verified with a public key. Watch for algorithm-confusion attacks, where a server that also accepts HS* can be tricked into verifying an HS token using the PUBLIC key as the HMAC secret." });
  } else {
    f.push({ severity: "warning", title: `Unusual algorithm (${alg})`,
      detail: "Not a common JWT algorithm — confirm the server actually expects this and pins it." });
  }

  // Expiry.
  if (typeof payload.exp !== "number") {
    f.push({ severity: "warning", title: "No expiry (exp)",
      detail: "The token never expires. A leaked token is then valid forever — always set a short exp." });
  } else if (payload.exp < now) {
    f.push({ severity: "info", title: "Expired",
      detail: `Expired ${fmtDuration(now - payload.exp)} ago. A correct server rejects it.` });
  } else {
    const life = payload.exp - (typeof payload.iat === "number" ? payload.iat : now);
    if (life > 86400 * 30) {
      f.push({ severity: "warning", title: "Very long lifetime",
        detail: `This token is valid for about ${fmtDuration(life)}. Long-lived access tokens widen the window a stolen token can be abused — prefer short expiries with refresh tokens.` });
    }
  }

  // Not-before / issued-at.
  if (typeof payload.nbf === "number" && payload.nbf > now) {
    f.push({ severity: "info", title: "Not yet valid (nbf)",
      detail: `Becomes valid in ${fmtDuration(payload.nbf - now)}.` });
  }
  if (typeof payload.iat !== "number") {
    f.push({ severity: "info", title: "No issued-at (iat)",
      detail: "Without iat the server can't reason about the token's age or revoke by issue time." });
  }

  // Audience / issuer.
  if (payload.iss === undefined || payload.aud === undefined) {
    const missing = [payload.iss === undefined && "iss", payload.aud === undefined && "aud"].filter(Boolean).join(" and ");
    f.push({ severity: "info", title: `Missing ${missing}`,
      detail: "Without issuer/audience claims, a token minted for one service can be replayed against another that shares the key." });
  }

  // Sensitive data in the (unencrypted) payload.
  const leaked = Object.keys(payload).filter((k) => SENSITIVE_KEYS.includes(k.toLowerCase()));
  if (leaked.length) {
    f.push({ severity: "warning", title: "Sensitive data in the payload",
      detail: `The payload is only base64-encoded, NOT encrypted — anyone holding the token can read it. Sensitive-looking claim${leaked.length > 1 ? "s" : ""}: ${leaked.join(", ")}.` });
  }

  // kid — potential injection surface.
  if (typeof header.kid === "string") {
    f.push({ severity: "info", title: "Key ID (kid) present",
      detail: "The kid header tells the server which key to use. If the server builds a file path or SQL query from it unsafely, kid becomes an injection point — worth confirming it's validated." });
  }

  return f;
}

// ── Real HMAC verification (Web Crypto) ────────────────────────────────────

function bytesToB64url(bytes: ArrayBuffer): string {
  const bin = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** True if `secret` reproduces this token's HMAC signature. */
export async function verifyHmac(d: DecodedJwt, secret: string): Promise<boolean> {
  const hash = HMAC_HASH[d.alg];
  if (!hash) return false;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(`${d.headerB64}.${d.payloadB64}`));
  return bytesToB64url(sig) === d.signatureB64;
}

export interface CrackResult {
  secret: string | null;
  tried: number;
}

/** Try each candidate against the token's HMAC signature. Reports progress so
 *  a big user wordlist can show a live counter, and yields to the event loop
 *  periodically so the tab stays responsive. */
export async function crackSecret(
  d: DecodedJwt,
  wordlist: string[],
  onProgress?: (tried: number) => void,
): Promise<CrackResult> {
  if (!HMAC_HASH[d.alg]) return { secret: null, tried: 0 };
  let tried = 0;
  for (const candidate of wordlist) {
    if (await verifyHmac(d, candidate)) return { secret: candidate, tried: tried + 1 };
    tried++;
    if (tried % 500 === 0) {
      onProgress?.(tried);
      await new Promise((r) => setTimeout(r, 0));
    }
  }
  onProgress?.(tried);
  return { secret: null, tried };
}
