// User guide for Password Strength & Breach Checker — rendered in
// PasswordAuditUserGuideModal (the "User Guide" header button) AND injected
// into the floating AI Assistant as its ONLY tool knowledge. Keep factual
// and in sync with the actual feature set.

export const PASSWORD_AUDIT_GUIDE = `
# Password Strength & Breach Checker — User Guide

## What this tool does
Type a password and it's scored two independent ways, both without ever
sending the actual password anywhere: a real-time strength meter (runs
entirely in your browser) and an on-demand breach-exposure lookup against a
public database of previously leaked passwords (only a tiny hash fragment
ever leaves your device — see below for exactly what that means).

## Strength meter
Scoring uses **zxcvbn**, the same pattern-matching algorithm behind many
real password meters (originally built at Dropbox). Unlike a naive
character-class count (uppercase + lowercase + digit + symbol = "strong"),
zxcvbn actually checks the password against common dictionaries, keyboard
walks (\`qwerty\`, \`asdf123\`), dates, repeats, and common substitutions
(\`p@ssw0rd\`) — the kind of real password an attacker's cracking tool would
try first. This is why something like \`Password1!\` scores low here despite
looking "complex" on paper: it hits every character-class box but is still
a very common, predictable pattern. This scoring runs 100% in your browser;
nothing about your password is sent anywhere for this part.

## Breach exposure check
Click **Check breach exposure** to look up whether this exact password has
appeared in a known data breach, via Have I Been Pwned's Pwned Passwords
database — using a technique called **k-anonymity**:
1. Your password is hashed locally in your browser (SHA-1 — this is Have I
   Been Pwned's own API requirement, not a general security recommendation).
2. Only the **first 5 characters** of that hash are sent to Have I Been
   Pwned's API — never the password, and never the full hash.
3. The API returns every breached password hash that starts with those same
   5 characters (often hundreds of them). The match against your password's
   actual full hash happens locally, in your browser.

This is a real, published privacy-preserving technique (not something built
for this project) — it's the same design Have I Been Pwned's own password
manager integrations use.

## Reading the result
- **Not found** — this exact password isn't in Have I Been Pwned's breach
  corpus. Reassuring, but not proof the password is strong — a password can
  be unbreached and still weak (a strength score of 0-1 above still means
  it's easy to guess or crack, breached or not).
- **Found in N breaches** — this exact password is known to attackers from
  real leaked-credential dumps. Change it immediately anywhere it's used,
  regardless of what the strength meter says.

## What this is (and isn't)
Two independent signals, not one combined verdict: the strength meter
estimates how hard this password would be to *crack* (guess offline); the
breach check tells you whether it's already *known* from a real leak. A
password can score well on one and poorly on the other — a strong, unique
password can still show up in a breach if it was reused somewhere that got
compromised, and a weak password won't show up in this breach corpus if
literally no one else has ever used it before.

## Privacy
Nothing here is stored — no scan history, no localStorage entry, unlike
some of this site's other local-history tools. The password field is
cleared with the **Clear** button and never persisted between visits. The
only network request this tool ever makes is the 5-character hash-prefix
lookup to \`api.pwnedpasswords.com\`, and only when you click the breach
check button — never automatically, and never on every keystroke.
`.trim();

export const PASSWORD_AUDIT_SUGGESTIONS = [
  "Why did a 'complex-looking' password score low?",
  "What exactly gets sent when I check breach exposure?",
  "Why is SHA-1 used here if it's considered weak?",
  "What does k-anonymity mean?",
  "Does 'not found' mean this password is safe?",
];
