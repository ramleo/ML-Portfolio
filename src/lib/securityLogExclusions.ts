/** Tools that must never appear in the security log — LOGGING_SPEC.md §5b.
 *
 * "The password tool is excluded from this log entirely. Its whole promise is
 * that the password never leaves the browser, and that promise is currently
 * true. No hash, no length, no row."
 *
 * Its own module so the client helper and the server route share one list
 * rather than each keeping a copy that can drift apart.
 */
export const EXCLUDED_TOOLS = new Set<string>([
  "password-audit",
  "password-strength",
]);
