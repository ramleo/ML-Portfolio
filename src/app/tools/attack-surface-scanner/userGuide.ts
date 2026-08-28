// User guide for Attack-Surface / Exposed-Path Scanner — rendered in
// AttackSurfaceScanUserGuideModal (the "User Guide" header button) AND
// injected into the floating AI Assistant as its ONLY tool knowledge.
// Keep factual and in sync with the actual feature set.

export const ATTACK_SURFACE_GUIDE = `
# Attack-Surface / Exposed-Path Scanner — User Guide

## What this tool does
Type a domain and four real, entirely passive checks run against it —
the same kind of misconfiguration checks a real recon phase (or a
legitimate bug-bounty researcher) starts with. Nothing here is
exploitation: every check is a plain GET/HEAD request or a bare TCP
connect, never an attempt to actually breach anything.

## The four checks

### 1. Exposed sensitive paths
Checks for a curated list of commonly-exposed files: \`.git/HEAD\`,
\`.git/config\`, \`.env\`, \`.DS_Store\`, \`.svn/entries\`, \`backup.zip\`,
\`.aws/credentials\`. A path is only flagged when the response is a real
200 **and** its content actually looks like the real file (e.g.
\`.git/HEAD\` containing \`ref: refs/\`, a ZIP file's real magic bytes) —
this avoids false-flagging sites that return 200 for every URL with a
custom "not found" page instead of a real 404.

### 2. Directory listing
Checks a few common directory paths (\`/uploads/\`, \`/backup/\`,
\`/images/\`, \`/files/\`) for the standard Apache/nginx "Index of /"
autoindex page — a real, well-known misconfiguration that exposes a raw
file listing to anyone.

### 3. CMS fingerprint (passive only)
Fetches the homepage once and looks for the standard
\`<meta name="generator" content="...">\` tag — the same passive technique
real tools like Wappalyzer use. Only reports a CMS/version if the site
actually declares one in that tag; never guesses.

### 4. Common ports
A short, well-known list of ports (FTP 21, SSH 22, Telnet 23, SMTP 25,
MySQL 3306, PostgreSQL 5432, Redis 6379, MongoDB 27017) gets a plain TCP
connection attempt — reporting only open/closed. No banner is read, no
protocol handshake beyond the raw TCP connect itself.

## Private/internal addresses are refused, not scanned
This tool opens real connections to whatever domain you type, so before
connecting it resolves the hostname and checks every resolved address —
if any is private, loopback, link-local, or otherwise internal/reserved,
the scan is refused with a clear message instead of silently connecting.
Same protection as this site's TLS/Security-Headers Scanner.

## What this is (and isn't)
This is real, non-exhaustive recon — a genuinely clean result across all
four checks is a real positive signal, but it is **not** proof a site has
no vulnerabilities. It doesn't check application logic, authentication,
input handling, or anything beyond these four specific, well-known
misconfiguration classes. An open port isn't automatically a problem
either — plenty of legitimate servers run SSH or a database port openly
by design; it's evidence worth reviewing in context, not an automatic
verdict.
`.trim();

export const ATTACK_SURFACE_SUGGESTIONS = [
  "Why is a .git exposure dangerous?",
  "How does the plausibility check avoid false positives?",
  "What does 'passive CMS fingerprint' mean?",
  "Is an open port always a problem?",
  "Why was my domain refused?",
];
