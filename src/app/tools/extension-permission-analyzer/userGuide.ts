export const EXTENSION_ANALYZER_GUIDE = `
# Browser Extension Permission Risk Analyzer — User Guide

## What this tool does
Paste the contents of a Chrome/Edge extension's \`manifest.json\`. The tool
parses its declared permissions, host access, and content-script injection
points, then checks them against a documented risk taxonomy: individually
risky permissions (\`debugger\`, \`nativeMessaging\`, \`webRequestBlocking\`,
\`cookies\`, \`history\`, \`tabs\`, \`proxy\`, \`clipboardRead\`,
\`management\`, and more), broad host access (\`<all_urls>\`,
\`*://*/*\`), and a fixed list of known **dangerous combinations** —
permission pairs that together unlock a real capability neither one grants
alone.

## Purpose
An extension's manifest is a public, honest declaration of what it's
*allowed* to do — before you install anything, that's real, checkable
information. This tool makes that declared-permission surface legible at a
glance, based on real documented Chrome-extension security research (in the
spirit of published studies like Duo Labs' extension permission analyses),
so you can spot combinations worth a closer look before granting them.

## How to use it
1. Open the extension's \`manifest.json\` (from its source, an unpacked
   \`.crx\`, or the Chrome Web Store's "view source" option where available)
   and copy its full contents.
2. Paste it into the text box and click **Analyze permissions**.
3. Review the overall risk verdict, any triggered dangerous combinations,
   and the full per-permission breakdown.

## A worked example
Click **Load sample manifest** to load a synthetic example declaring
\`<all_urls>\` + \`webRequestBlocking\` + \`webRequest\` + \`cookies\` +
\`tabs\` + \`history\`. Clicking **Analyze permissions** returns **High
risk**, driven by the "Broad host access + network interception + cookie
access" combination — the tool explains that this combination can
intercept network traffic AND read/write cookies across every site, enough
to hijack sessions on any site the user visits. Now try a manifest
declaring only \`storage\`, \`notifications\`, and \`contextMenus\` — the
verdict correctly drops to **Low risk**, since none of those imply any data
access.

## Reading the result
- **Overall risk** (low/medium/high) — driven by the single
  highest-severity permission or combination found; never averaged down,
  so one critical combination makes the whole result high even if every
  other permission is harmless.
- **Dangerous permission combinations** — the specific documented combos
  that fired, each with a plain-language explanation of the real
  capability they unlock together.
- **Declared permissions** — every named permission found, each with its
  own individual risk level and a one-line explanation.
- **Warnings** — call out broad host access specifically, since it's the
  ingredient most combinations depend on.

## Notes & limits
- **Static declared-permission analysis only — not a behavioral scan.**
  This does not inspect the extension's actual code or runtime behavior,
  and cannot tell you whether a permission is being misused versus
  legitimately needed.
- A high-risk result is "worth a closer look," not proof of malicious
  intent — a password manager, for example, can legitimately need broad
  host access and cookie access to do its actual job.
- Supports both Manifest V2 (URL patterns inside the single \`permissions\`
  array) and V3 (\`host_permissions\` as a separate field) formats.
- Entirely client-side — nothing you paste is sent anywhere.
`.trim();

export const EXTENSION_ANALYZER_SUGGESTIONS = [
  "What makes a permission combination 'dangerous' specifically?",
  "Can a legitimate extension still score 'high risk' here?",
  "Does this work for both Manifest V2 and V3?",
  "Is anything I paste sent to a server?",
];
