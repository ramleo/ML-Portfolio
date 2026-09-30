// Sentry init for the Next.js server runtime (API routes, RSC, route handlers).
// DORMANT unless SENTRY_DSN (or NEXT_PUBLIC_SENTRY_DSN) is set — no DSN, no
// transport, no-op. Content-free per LOGGING_SPEC §6: no tracing, and beforeSend
// hard-strips the user object (IP) and any request body/cookies/headers.
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: !!dsn,
  tracesSampleRate: 0,
  beforeSend(event) {
    delete event.user;
    if (event.request) {
      delete event.request.data;
      delete event.request.cookies;
      delete event.request.headers;
    }
    return event;
  },
});
