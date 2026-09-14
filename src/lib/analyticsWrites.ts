/** Whether a browser-facing logging route may write to Supabase.
 *
 * `.env.local` carries the production Supabase keys, so before this every
 * local run of the site — e2e tests, demo recordings, manual checks — wrote
 * its events into the live analytics. On 2026-09-14, 833 of the newest 1000
 * events had no country (only Vercel adds one) and every failed keepalive
 * came from a laptop pinging a backend at localhost:8000 that was not running.
 *
 * VERCEL is set in every Vercel build and runtime, previews included. Set
 * ANALYTICS_LOCAL_WRITES=1 to deliberately test writes from a local server.
 */
export function analyticsWritesEnabled(): boolean {
  return !!process.env.VERCEL || process.env.ANALYTICS_LOCAL_WRITES === "1";
}
