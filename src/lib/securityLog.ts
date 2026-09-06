/** Client half of the security log — LOGGING_SPEC.md §5b.
 *
 * Records facts ABOUT an upload: name, type, size, and a SHA-256 of the bytes.
 * Never the bytes. The file is discarded when the response returns; the
 * fingerprint outlives it, which is the whole point — if a malicious sample
 * turns up later, hashing it and searching this table says exactly when and
 * how often it came through, without a copy ever having been kept.
 *
 * The hash is computed in the BROWSER via SubtleCrypto. The file is already
 * in memory there, and doing it here means the server never needs the bytes
 * in order to fingerprint them.
 */
import { EXCLUDED_TOOLS } from "@/lib/securityLogExclusions";
import { getTurnstileToken } from "@/lib/turnstile";

async function sha256Hex(file: File): Promise<string | null> {
  try {
    // Only available over HTTPS and on localhost. On plain HTTP it is
    // undefined, so the row goes without a hash rather than throwing.
    if (!globalThis.crypto?.subtle) return null;
    const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return null;
  }
}

const sessionId = () => {
  try { return localStorage.getItem("_ml_session") ?? ""; } catch { return ""; }
};

/** Fire-and-forget. Never blocks an upload, never throws, never delays it —
 * the hash is computed and posted alongside the real request, not before it. */
export function logUpload(file: File, tool: string, runId?: string): void {
  if (EXCLUDED_TOOLS.has(tool)) return;   // §5b — the password tool, entirely
  void (async () => {
    try {
      const body = {
        session_id: sessionId(),
        run_id: runId ?? "",
        tool,
        filename: file.name,
        ext: file.name.split(".").pop()?.toLowerCase() ?? "",
        size_bytes: file.size,
        mime: file.type || "unknown",
        sha256: await sha256Hex(file),
        // null when Turnstile is not configured; the route then skips the
        // check rather than rejecting.
        turnstile_token: await getTurnstileToken(),
      };
      await fetch("/api/security-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        keepalive: true,
      });
    } catch { /* a logging outage must be invisible to a visitor (§6 rule 2) */ }
  })();
}

/** Prompt LENGTH only, for the tools where the input is typed rather than
 * uploaded. §5b is explicit that this is a length, not the text. */
export function logPromptLength(chars: number, tool: string, runId?: string): void {
  if (EXCLUDED_TOOLS.has(tool)) return;
  void fetch("/api/security-log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId(), run_id: runId ?? "", tool, prompt_len: chars }),
    keepalive: true,
  }).catch(() => {});
}


/** Catches every file a visitor puts into the page, in one place.
 *
 * A capture-phase `change` listener on any `input[type=file]`. This is the
 * only mechanism, deliberately: tools send their uploads in two different
 * shapes — FormData for the ML endpoints, base64 inside a JSON body for most
 * of the vision ones — and hooking the transport would have caught the first
 * and missed the second. The file input is the one place both agree on.
 *
 * The tool name comes from the URL, so no tool page needs to remember to call
 * anything, and a tool added later is covered the day it ships.
 *
 * It logs on SELECT, not on send. A file chosen and then abandoned still went
 * into the page, and for a log whose question is "was anything malicious put
 * in here" that is the honest boundary.
 */
export function installUploadLogging(): () => void {
  const onChange = (e: Event) => {
    const el = e.target as HTMLInputElement | null;
    if (!el || el.type !== "file" || !el.files?.length) return;
    const m = window.location.pathname.match(/^\/tools\/([^/]+)/);
    const tool = m ? m[1] : "site";
    for (const file of Array.from(el.files)) logUpload(file, tool);
  };
  document.addEventListener("change", onChange, true);
  return () => document.removeEventListener("change", onChange, true);
}
