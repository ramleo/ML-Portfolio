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
 * With NEXT_PUBLIC_TURNSTILE_SITE_KEY unset this returns null and the route
 * accepts requests as before, so switching Turnstile on is opt-in.
 *
 * Once it IS configured the endpoint fails CLOSED: no token, no row. Note
 * what that costs — a visitor who blocks Cloudflare (an ad-blocker will) can
 * still use every tool normally, but their uploads go unlogged. For a
 * security log that is the right way round, since the alternative is
 * accepting unverified rows, but it is a real gap rather than a detail: the
 * log is a record of what most visitors uploaded, not provably all of them.
 * §6 rule 2 still holds — the UPLOAD never fails, only its log entry.
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
export async function getTurnstileToken(timeoutMs = 8000): Promise<string | null> {
  if (!SITE_KEY || typeof window === "undefined") return null;
  try {
    await loadScript();
    if (!window.turnstile) return null;
    return await new Promise<string | null>((resolve) => {
      // Off-screen, NOT display:none. Turnstile refuses to execute inside a
      // hidden element, which is what made the first attempt return no token
      // at all while looking perfectly correct.
      const host = document.createElement("div");
      host.style.cssText = "position:fixed;left:-9999px;top:0;width:300px;height:65px;";
      document.body.appendChild(host);

      let settled = false;
      const done = (v: string | null) => {
        if (settled) return;
        settled = true;
        host.remove();
        resolve(v);
      };
      const timer = setTimeout(() => done(null), timeoutMs);

      try {
        // No `size` option. "invisible" is a WIDGET setting chosen in the
        // Cloudflare dashboard, not a client parameter — passing it as one
        // is rejected, and the widget then never runs.
        window.turnstile!.render(host, {
          sitekey: SITE_KEY,
          callback: (t: string) => { clearTimeout(timer); done(t); },
          "error-callback": () => { clearTimeout(timer); done(null); },
          "timeout-callback": () => { clearTimeout(timer); done(null); },
          "expired-callback": () => { clearTimeout(timer); done(null); },
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
