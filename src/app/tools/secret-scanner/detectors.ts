/**
 * Secret + PII detection rules. All pattern-based, run in the browser; pasted
 * text is never uploaded.
 *
 * Honesty: this is a curated demo detector, disclosed as not exhaustive — the
 * same pattern as the YARA built-in rules and the QR brand list. It catches
 * well-known secret FORMATS and common PII, plus a high-entropy pass for
 * secrets that have no recognisable prefix. It will miss cleverly-disguised
 * secrets and can occasionally false-positive on random-looking data — which
 * is why credit-card matches are Luhn-checked and every finding shows the line
 * so a human can judge it.
 */

export type Category = "secret" | "possible-secret" | "pii";
export type Severity = "critical" | "warning" | "info";

export interface Match {
  ruleId: string;
  label: string;
  category: Category;
  severity: Severity;
  line: number;
  preview: string; // masked
}

interface Rule {
  id: string;
  label: string;
  category: Category;
  severity: Severity;
  regex: RegExp;
  /** Optional extra test on the captured match to cut false positives. */
  validate?: (m: string) => boolean;
}

// Known secret formats. Bounded quantifiers only — no catastrophic backtracking.
const RULES: Rule[] = [
  { id: "aws-akid", label: "AWS Access Key ID", category: "secret", severity: "critical", regex: /\bA(?:KIA|SIA|IDA|GPA|ROA|IPA|NPA|NVA)[0-9A-Z]{16}\b/g },
  { id: "gh-pat", label: "GitHub token", category: "secret", severity: "critical", regex: /\bgh[posru]_[A-Za-z0-9]{36,}\b/g },
  { id: "gh-fine", label: "GitHub fine-grained token", category: "secret", severity: "critical", regex: /\bgithub_pat_[A-Za-z0-9_]{60,}\b/g },
  { id: "google-api", label: "Google API key", category: "secret", severity: "critical", regex: /\bAIza[0-9A-Za-z_\-]{35}\b/g },
  { id: "slack-token", label: "Slack token", category: "secret", severity: "critical", regex: /\bxox[baprs]-[0-9A-Za-z-]{10,48}\b/g },
  { id: "slack-hook", label: "Slack webhook URL", category: "secret", severity: "critical", regex: /https:\/\/hooks\.slack\.com\/services\/[A-Za-z0-9_/]{20,}/g },
  { id: "stripe-live", label: "Stripe live secret key", category: "secret", severity: "critical", regex: /\b[rs]k_live_[0-9A-Za-z]{20,}\b/g },
  { id: "stripe-test", label: "Stripe test key", category: "secret", severity: "warning", regex: /\b[rs]k_test_[0-9A-Za-z]{20,}\b/g },
  { id: "sendgrid", label: "SendGrid API key", category: "secret", severity: "critical", regex: /\bSG\.[A-Za-z0-9_\-]{22}\.[A-Za-z0-9_\-]{43}\b/g },
  { id: "twilio-sid", label: "Twilio API key SID", category: "secret", severity: "warning", regex: /\bSK[0-9a-fA-F]{32}\b/g },
  { id: "npm", label: "npm access token", category: "secret", severity: "critical", regex: /\bnpm_[A-Za-z0-9]{36}\b/g },
  { id: "openai", label: "OpenAI-style API key", category: "secret", severity: "critical", regex: /\bsk-(?:proj-)?[A-Za-z0-9_\-]{20,}\b/g },
  { id: "private-key", label: "Private key block", category: "secret", severity: "critical", regex: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/g },
  { id: "jwt", label: "JSON Web Token", category: "secret", severity: "warning", regex: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g },
  { id: "url-cred", label: "Password in URL", category: "secret", severity: "critical", regex: /\b[a-z][a-z0-9+.-]*:\/\/[^\s:@/]+:[^\s@/]{3,}@/gi },
  { id: "basic-auth", label: "HTTP Basic auth header", category: "secret", severity: "warning", regex: /Authorization:\s*Basic\s+[A-Za-z0-9+/=]{8,}/gi },
  { id: "assign", label: "Hardcoded secret assignment", category: "secret", severity: "warning",
    regex: /\b(?:password|passwd|pwd|secret|api[_-]?key|access[_-]?key|auth[_-]?token|client[_-]?secret)\s*[:=]\s*["']?([^\s"'`,;]{6,})["']?/gi,
    validate: (m) => !/^(?:process\.env|import\.meta|os\.environ|null|undefined|true|false|xxx+|\*+|<[^>]+>|\{\{)/i.test(m.replace(/^[^:=]*[:=]\s*["']?/, "")) },
];

// PII rules.
const PII_RULES: Rule[] = [
  { id: "email", label: "Email address", category: "pii", severity: "info", regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g },
  { id: "ssn", label: "US Social Security Number", category: "pii", severity: "warning", regex: /\b(?!000|666|9\d\d)\d{3}-(?!00)\d{2}-(?!0000)\d{4}\b/g },
  { id: "cc", label: "Credit-card number (Luhn-valid)", category: "pii", severity: "warning", regex: /\b(?:\d[ -]?){13,19}\b/g, validate: (m) => luhn(m.replace(/[ -]/g, "")) },
  // Mandatory separators between the 3-3-4 groups, so bare digit runs inside
  // tokens and 4-4-4-4 card groupings don't false-positive as phone numbers.
  { id: "phone", label: "Phone number", category: "pii", severity: "info", regex: /(?<![\d-])(?:\+\d{1,3}[ .-]?)?(?:\(\d{3}\)|\d{3})[ .-]\d{3}[ .-]\d{4}(?![\d-])/g },
  { id: "ipv4", label: "IP address", category: "pii", severity: "info", regex: /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g },
];

/** Luhn checksum — real validation, so a random 16-digit string doesn't
 *  false-positive as a card number. */
export function luhn(digits: string): boolean {
  if (!/^\d{13,19}$/.test(digits)) return false;
  let sum = 0, alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48;
    if (alt) { d *= 2; if (d > 9) d -= 9; }
    sum += d; alt = !alt;
  }
  return sum % 10 === 0;
}

/** Shannon entropy in bits per character. */
export function entropy(s: string): number {
  const counts: Record<string, number> = {};
  for (const c of s) counts[c] = (counts[c] ?? 0) + 1;
  const n = s.length || 1;
  let h = 0;
  for (const k in counts) { const p = counts[k] / n; h -= p * Math.log2(p); }
  return h;
}

function mask(s: string): string {
  const t = s.length > 80 ? s.slice(0, 80) + "…" : s;
  if (t.length <= 8) return t[0] + "•".repeat(Math.max(1, t.length - 1));
  return `${t.slice(0, 4)}${"•".repeat(Math.min(12, t.length - 6))}${t.slice(-2)}`;
}

function lineOf(text: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index && i < text.length; i++) if (text[i] === "\n") line++;
  return line;
}

/** Run one rule set, recording each match with its line and a masked preview.
 *  `taken` marks character spans already claimed, so the entropy pass doesn't
 *  re-report a token a named rule already caught. */
function runRules(text: string, rules: Rule[], out: Match[], taken: [number, number][], skipOverlap = false) {
  for (const rule of rules) {
    rule.regex.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = rule.regex.exec(text)) !== null) {
      const val = m[0];
      const start = m.index, end = start + val.length;
      if (m.index === rule.regex.lastIndex) rule.regex.lastIndex++;
      if (rule.validate && !rule.validate(val)) continue;
      // Don't double-report something already inside a detected secret (e.g. a
      // run of digits inside an API token reading as a "phone number").
      if (skipOverlap && taken.some(([a, b]) => start < b && end > a)) continue;
      out.push({ ruleId: rule.id, label: rule.label, category: rule.category,
        severity: rule.severity, line: lineOf(text, start), preview: mask(val.trim()) });
      taken.push([start, end]);
    }
  }
}

const TOKEN_RE = /[A-Za-z0-9+/=_-]{20,}/g;

/** High-entropy pass: long tokens that look random but matched no named rule.
 *  Entropy > 3.5 bits/char on a 20+ char token is a strong "this is a key"
 *  signal (English prose sits well below that). */
function entropyPass(text: string, out: Match[], taken: [number, number][]) {
  TOKEN_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TOKEN_RE.exec(text)) !== null) {
    const start = m.index, end = start + m[0].length;
    if (taken.some(([a, b]) => start < b && end > a)) continue; // already claimed
    if (entropy(m[0]) < 3.5) continue;
    out.push({ ruleId: "entropy", label: "High-entropy string (possible secret)",
      category: "possible-secret", severity: "warning", line: lineOf(text, start), preview: mask(m[0]) });
  }
}

export interface ScanResult {
  matches: Match[];
  counts: { secret: number; "possible-secret": number; pii: number };
}

export function scan(text: string): ScanResult {
  const matches: Match[] = [];
  const taken: [number, number][] = [];
  runRules(text, RULES, matches, taken);
  runRules(text, PII_RULES, matches, taken, true);
  entropyPass(text, matches, taken);
  matches.sort((a, b) => a.line - b.line);
  const counts = { secret: 0, "possible-secret": 0, pii: 0 };
  for (const m of matches) counts[m.category]++;
  return { matches, counts };
}
