// Sentry client-side init (browser). DORMANT unless NEXT_PUBLIC_SENTRY_DSN is
// set — with no DSN the SDK installs no transport and does nothing, so local
// dev and any un-provisioned deploy are unaffected. Loaded natively by Next.js
// (instrumentation-client.ts), no build wrapper required.
//
// Honours the site's content-free logging rule (LOGGING_SPEC §6):
//   - Session Replay is NOT enabled (that integration records the DOM incl.
//     typed text) — we never add replayIntegration, so nothing is recorded.
//   - tracesSampleRate: 0.1 — RUM (O2): the default browserTracingIntegration
//     records a pageload/navigation transaction on 10% of visits and attaches
//     Core Web Vitals (LCP, INP, CLS, FCP, TTFB) as measurements on it. Numbers
//     only; beforeSendTransaction below strips any URL query string so a trace
//     stays as content-free as an error. 10% keeps us inside the free quota —
//     tune in Sentry if traffic is low enough that the sample is too thin.
//   - beforeSend / beforeSendTransaction hard-strip anything that could carry
//     user content or PII: the user object (holds IP), and any request
//     body/cookies/headers.
// What it DOES send: the error, its stack, the route, the browser, sampled
// performance timings — plus the analytics session id as a tag so a crash links
// back to the events table. See src/app/privacy/page.tsx (third-parties section).
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

/** Shared PII/content scrub — the user object holds the IP, request carries
 * body/cookies/headers. Used for both error and transaction events. */
function scrub<T extends { user?: unknown; request?: { data?: unknown; cookies?: unknown; headers?: unknown; url?: string } }>(event: T): T {
  delete event.user;
  if (event.request) {
    delete event.request.data;
    delete event.request.cookies;
    delete event.request.headers;
    // A transaction's URL can carry a query string; keep the path only.
    if (typeof event.request.url === "string") event.request.url = event.request.url.split(/[?#]/)[0];
  }
  return event;
}

Sentry.init({
  dsn,
  enabled: !!dsn,
  tracesSampleRate: 0.1,
  beforeSend(event) {
    scrub(event);
    try {
      const sid = localStorage.getItem("_ml_session");
      if (sid) event.tags = { ...event.tags, session_id: sid };
    } catch {
      // localStorage can throw in private mode — a missing tag is fine.
    }
    return event;
  },
  beforeSendTransaction(event) {
    return scrub(event);
  },
});
