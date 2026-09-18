/**
 * A curated list of weak / default HMAC secrets to test a JWT against.
 *
 * This is a DEMO set, disclosed as such — same honesty pattern as the YARA
 * built-in rules and the QR-phishing brand list. It CANNOT crack a strong,
 * random secret; nothing can, by design — that is cryptography working. What
 * it catches is the real-world failure that actually causes JWT breaches: a
 * developer shipping a framework's default secret or a human-chosen password.
 *
 * Two sources are folded in:
 *   1. Well-known default secrets from popular frameworks, tutorials and the
 *      jwt.io editor (e.g. "your-256-bit-secret") — the single most common
 *      real-world weakness.
 *   2. Common weak passwords people reuse as signing keys.
 *
 * For anything beyond this, the tool lets you paste your OWN wordlist
 * (rockyou.txt, a company list, whatever) — that runs in your browser and is
 * as large as you like. See useJwtAnalyzer.ts.
 */

// Framework / tutorial / documentation defaults that ship in real projects.
const DEFAULT_SECRETS = [
  "your-256-bit-secret", "your-384-bit-secret", "your-512-bit-secret",
  "secret", "secretkey", "secret_key", "secretKey", "SECRET", "mysecret",
  "mysecretkey", "my-secret", "my_secret_key", "supersecret", "supersecretkey",
  "jwt", "jwtsecret", "jwt_secret", "jwtSecret", "jwt-secret", "jwtkey",
  "jwt_secret_key", "jsonwebtoken", "token", "tokensecret", "token_secret",
  "changeme", "change-me", "change_this", "changethis", "please-change-me",
  "defaultsecret", "default_secret", "default", "example", "example_secret",
  "test", "testsecret", "test_secret", "testing", "demo", "demosecret",
  "dev", "devsecret", "development", "staging", "prod", "production",
  "key", "keyboard cat", "keyboardcat", "privatekey", "private_key",
  "signingkey", "signing_key", "signature", "sign", "hmac", "hmackey",
  "auth", "authsecret", "auth_secret", "authkey", "auth_key", "session",
  "sessionsecret", "session_secret", "app_secret", "appsecret", "apisecret",
  "api_secret", "apikey", "api_key", "clientsecret", "client_secret",
  "password", "passphrase", "pass", "iloveyou", "letmein", "welcome",
  "shhhhh", "shh", "topsecret", "top_secret", "verysecret", "veryverysecret",
  "nodejs", "express", "expressjs", "django", "flask", "laravel", "rails",
  "spring", "springboot", "nestjs", "fastapi", "symfony", "codeigniter",
  "0000", "1111", "admin", "administrator", "root", "toor", "guest", "user",
  "qwerty", "abc123", "a", "aa", "aaa", "aaaa", "1", "12", "42", "0", "null",
];

// Common weak passwords (a small slice of the classic breach lists).
const COMMON_PASSWORDS = [
  "123456", "123456789", "12345678", "1234567", "1234567890", "12345",
  "password", "password1", "password123", "passw0rd", "p@ssw0rd", "p@ssword",
  "qwerty123", "qwertyuiop", "1q2w3e4r", "1qaz2wsx", "zaq12wsx", "asdfghjkl",
  "111111", "000000", "121212", "654321", "666666", "112233", "888888",
  "abcdef", "abcd1234", "abc12345", "a1b2c3d4", "monkey", "dragon", "master",
  "sunshine", "princess", "football", "baseball", "superman", "batman",
  "trustno1", "hello", "hello123", "whatever", "login", "access", "secret1",
  "admin123", "root123", "toor123", "letmein123", "welcome1", "welcome123",
  "iloveyou1", "starwars", "michael", "jordan", "harley", "ranger", "shadow",
  "hunter2", "hunter", "changeme123", "test123", "test1234", "qazwsx",
  "zxcvbnm", "asdf1234", "1234abcd", "pass123", "pass1234", "temp", "temp123",
];

/** The bundled demo wordlist, de-duplicated. */
export const WEAK_SECRETS: string[] = Array.from(
  new Set([...DEFAULT_SECRETS, ...COMMON_PASSWORDS]),
);

/** Parse a user-supplied wordlist (option 2 — bring your own). One candidate
 *  per line; blank lines and #comments dropped; capped so a huge paste can't
 *  hang the tab. The cap is generous — a rockyou-sized list should be tried in
 *  chunks, but for an in-browser demo a few hundred thousand is plenty. */
export function parseWordlist(text: string, cap = 200_000): string[] {
  const out: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    out.push(line);
    if (out.length >= cap) break;
  }
  return out;
}
