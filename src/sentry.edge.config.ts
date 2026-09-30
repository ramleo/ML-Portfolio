// Sentry init for the Next.js edge runtime (middleware, edge routes). DORMANT
// unless SENTRY_DSN (or NEXT_PUBLIC_SENTRY_DSN) is set. Content-free per
// LOGGING_SPEC §6 — same guards as the server config.
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
