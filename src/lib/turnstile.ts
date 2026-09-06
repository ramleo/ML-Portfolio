/** Cloudflare Turnstile — the only thing here that actually separates a
 * browser from a script.
 *
 * Everything else guarding /api/security-log bounds damage rather than
 * preventing entry: an Origin header is attacker-controlled, and a
 * proof-of-work a browser can afford in 200ms costs a native attacker
 * microseconds — that would be theatre, not defence.
 *
 * Turnstile works because the verification happens on Cloudflare's side
 * against signals the client cannot forge, and the token is single-use and
 * short-lived. A forged Origin no longer gets anywhere without one.
 *
 * FAILS OPEN BY DESIGN. With NEXT_PUBLIC_TURNSTILE_SITE_KEY unset, this
 * returns null and the route accepts requests exactly as it does today.
 * A logging feature must never be the reason an upload stops working (§6
 * rule 2) — the endpoint's other guards still apply meanwhile.
 */

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
const SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type TurnstileApi = {
  execute: (el: HTMLElement, opts: Record<string, unknown>) => void;
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
};
declare global { interface Window { turnstile?: TurnstileApi } }

let scriptPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    if (window.turnstile) return resolve();
    const el = document.createElement("script");
    el.src = SCRIPT;
    el.async = true;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error("turnstile script blocked"));
    document.head.appendChild(el);
  });
  return scriptPromise;
}

/** A fresh single-use token, or null if Turnstile is not configured, is
 * blocked, or takes too long. Never throws. */
export async function getTurnstileToken(timeoutMs = 6000): Promise<string | null> {
  if (!SITE_KEY || typeof window === "undefined") return null;
  try {
    await loadScript();
    if (!window.turnstile) return null;
    return await new Promise<string | null>((resolve) => {
      // Invisible: no widget, no interaction, nothing for a visitor to see.
      const host = document.createElement("div");
      host.style.display = "none";
      document.body.appendChild(host);
      const done = (v: string | null) => { host.remove(); resolve(v); };
      const timer = setTimeout(() => done(null), timeoutMs);
      try {
        window.turnstile!.render(host, {
          sitekey: SITE_KEY,
          size: "invisible",
          callback: (t: string) => { clearTimeout(timer); done(t); },
          "error-callback": () => { clearTimeout(timer); done(null); },
          "timeout-callback": () => { clearTimeout(timer); done(null); },
        });
      } catch {
        clearTimeout(timer);
        done(null);
      }
    });
  } catch {
    return null;
  }
}
