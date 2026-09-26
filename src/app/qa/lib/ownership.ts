// Ownership gating for Testwright targets. First-party demo hosts run freely;
// any other (third-party) host requires the caller to confirm they own it or are
// authorized to test it. Mirrors the backend allowlist in routers/qa/config.py —
// the backend is the real gate; this is just for the UI (show the checkbox and
// disable the action until it's ticked). Keep both lists in sync.

const FIRST_PARTY_HOSTS = [
  "ml-portfolio-rho.vercel.app",
  "wram1708-ml-unified.hf.space",
];

/** True when the URL targets a first-party host (no confirmation needed). An
 *  empty or unparseable URL counts as first-party so we don't nag prematurely. */
export function isFirstParty(url: string): boolean {
  const u = (url || "").trim();
  if (!u) return true;
  let host: string;
  try {
    host = new URL(u.includes("://") ? u : `https://${u}`).hostname.toLowerCase();
  } catch {
    return true;
  }
  return FIRST_PARTY_HOSTS.some((d) => host === d || host.endsWith("." + d));
}
