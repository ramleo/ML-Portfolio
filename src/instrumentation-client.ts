// Sentry client-side init (browser). DORMANT unless NEXT_PUBLIC_SENTRY_DSN is
// set — with no DSN the SDK installs no transport and does nothing, so local
// dev and any un-provisioned deploy are unaffected. Loaded natively by Next.js
// (instrumentation-client.ts), no build wrapper required.
//
// Honours the site's content-free logging rule (LOGGING_SPEC §6):
//   - Session Replay is NOT enabled (that integration records the DOM incl.
//     typed text) — we never add replayIntegration, so nothing is recorded.
//   - tracesSampleRate: 0 — no performance spans (keeps payload minimal).
//   - beforeSend hard-strips anything that could carry user content or PII:
//     the user object (holds IP), and any request body/cookies/headers.
// What it DOES send: the error, its stack, the route, and the browser — plus
// the analytics session id as a tag so a crash links back to the events table.
// See src/app/privacy/page.tsx (third-parties section).
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: !!dsn,
  tracesSampleRate: 0,
  beforeSend(event) {
    delete event.user; // holds ip_address
    if (event.request) {
      delete event.request.data;
      delete event.request.cookies;
      delete event.request.headers;
    }
    try {
      const sid = localStorage.getItem("_ml_session");
      if (sid) event.tags = { ...event.tags, session_id: sid };
    } catch {
      // localStorage can throw in private mode — a missing tag is fine.
    }
    return event;
  },
});
