/** Owner identity. The site has exactly one owner (the portfolio's subject),
 * identified by the OWNER_EMAIL env var — NOT a database role, so it can never be
 * granted by signup. Only the owner sees their own portfolio while signed in and
 * manages recruiter share-links.
 *
 * Server-only: OWNER_EMAIL has no NEXT_PUBLIC_ prefix, so it is never shipped to
 * the browser. Use this in server components, route handlers and the proxy.
 */
const OWNER_EMAIL = (process.env.OWNER_EMAIL ?? "").trim().toLowerCase();

export function isOwnerEmail(email?: string | null): boolean {
  return !!email && !!OWNER_EMAIL && email.trim().toLowerCase() === OWNER_EMAIL;
}
