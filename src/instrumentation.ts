// Next.js instrumentation hook — loads the right Sentry init per runtime.
// Both configs are dormant unless a DSN is present, so this is a no-op until
// SENTRY_DSN / NEXT_PUBLIC_SENTRY_DSN is provisioned.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Captures errors thrown in nested React Server Components.
export { captureRequestError as onRequestError } from "@sentry/nextjs";
