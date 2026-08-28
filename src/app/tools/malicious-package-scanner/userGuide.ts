// User guide for Malicious Package Scanner — rendered in
// PackageScannerUserGuideModal (the "User Guide" header button) AND
// injected into the floating AI Assistant as its ONLY tool knowledge.
// Keep factual and in sync with the actual feature set.

export const PACKAGE_SCANNER_GUIDE = `
# Malicious Package Scanner — User Guide

## What this tool does
Real supply-chain attacks against npm/PyPI use a small set of well-known
techniques over and over: a malicious install script that runs
automatically the moment a package is installed, or a package name that's
one keystroke away from a popular one (a typosquat). This tool
static-analyzes pasted manifest files and source code for those exact
techniques — the same approach open-source tools like Datadog's GuardDog
use: pattern-matching common attacker techniques, not comparing against a
database of known-malware signatures. That's what lets this kind of check
catch a malicious package that's never been seen before — it doesn't need
to have seen it.

## Two independent scan modes

### Manifest scan (package.json / requirements.txt)
- **Suspicious lifecycle scripts** — npm's \`preinstall\`/\`install\`/
  \`postinstall\` fields in \`package.json\` run automatically the instant a
  package is installed, before any of its actual code is even imported.
  This is a real, repeatedly-abused technique in genuine npm supply-chain
  incidents. Any of these three script fields being present is flagged,
  with the actual script content shown so you can judge it yourself.
- **Typosquat check** — every dependency name is compared (via edit
  distance) against a curated list of ~150-200 well-known real npm/PyPI
  package names. A name 1-2 characters off from a well-known one (like
  \`lodahs\` vs \`lodash\`, or \`reqeusts\` vs \`requests\`) is flagged as a
  possible typosquat.

### Source code scan (JS/TS or Python)
- **Suspicious API calls** — \`eval(\`, \`new Function(\`,
  \`child_process.exec\`, Python \`exec(\`/\`eval(\`/\`subprocess.*\`/
  \`os.system(\` — real techniques for running dynamically-constructed or
  fetched code, rather than the package's own plainly-readable source.
- **Obfuscation tells** — long string literals with unusually high
  character-level entropy (the same Shannon-entropy technique this site's
  DNS Tunneling Detector and Malware-Image-Triage tools use) — a common
  tell for a base64/hex-encoded payload sitting next to an \`eval\`/\`exec\`
  call, the classic "decode, then run" pattern.
- **Embedded URLs** — any hardcoded network address found in the source,
  surfaced as evidence worth reviewing (not scored or judged — that's a
  different job from this tool's).
- **Hardcoded secrets** — recognizable real secret formats (AWS
  \`AKIA...\` access key IDs, GitHub \`ghp_\`/\`github_pat_\` tokens, Slack
  \`xox...\` tokens, PEM private-key blocks) plus a generic
  \`api_key\`/\`password\`/\`token\` \`= "..."\` assignment pattern — obvious
  placeholder values (\`changeme\`, \`your-password\`, etc.) are skipped to
  cut noise from docs/config examples. Matched values are shown partially
  masked in the UI.
- **SQL-injection-shaped query building** (CWE-89) — a line naming a SQL
  keyword (\`SELECT\`/\`INSERT\`/\`UPDATE\`/\`DELETE\`) combined with an
  f-string, template-literal, string-concatenation, or \`%\`-format
  interpolation, rather than a properly parameterized placeholder.
- **Insecure deserialization** (CWE-502) — Python's classic, well-documented
  unsafe patterns: \`pickle.loads(\`/\`pickle.load(\`, \`marshal.loads(\`, and
  \`yaml.load(\` used without \`SafeLoader\` (PyYAML's own documented fix).

## What this is (and isn't)
Every result here is a **signal, not a verdict** — real, non-fabricated
evidence for a human to weigh, never a fabricated "malicious"/"safe"
label. A flagged lifecycle script might be completely legitimate (many
real packages compile native code on install); a flagged typosquat could
just be a name that happens to be close to a popular one; a high-entropy
string could be a genuine cryptographic key or compressed asset, not a
payload. Conversely, a clean result here is **not proof of safety** — this
only sees what's pasted, checks a curated (not exhaustive) list of
well-known package names, and cannot detect more sophisticated evasion
(code that's obfuscated below the entropy threshold, or a malicious
payload fetched at runtime from a URL that isn't hardcoded in the source).
`.trim();

export const PACKAGE_SCANNER_SUGGESTIONS = [
  "Why are install scripts risky?",
  "What counts as a typosquat here?",
  "Why does entropy matter for obfuscation?",
  "What can this tool NOT catch?",
  "Is a flagged result proof of malware?",
];
