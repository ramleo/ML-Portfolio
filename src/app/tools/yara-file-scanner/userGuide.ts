export const YARA_SCAN_GUIDE = `
# YARA File Scanner — User Guide

## What this tool does
Upload any file and it's scanned with the real, open-source **YARA**
pattern-matching engine — the actual industry-standard tool antivirus
vendors, EDR products, and threat-intel teams use to write and share
malware-detection rules. Scan with a small built-in educational rule set,
or write and test your own YARA rule against the file — the real everyday
workflow YARA exists for.

## Built-in rules — an educational demo set, not a production feed
These 7 rules are self-authored for this project, covering well-documented
indicator classes. They are deliberately small and disclosed as a demo,
NOT a pulled third-party threat-intel feed (whose licensing terms weren't
something to assume without checking):
1. **EICAR test signature** — the real, official antivirus test string.
2. **Suspicious PowerShell encoded command** — the \`-EncodedCommand\`/\`-enc\`
   flag combined with a long base64 run, a well-documented technique for
   hiding a malicious command line.
3. **Generic PHP webshell indicator** — \`eval()\`/\`base64_decode()\` combined
   with \`$_POST\`/\`$_GET\`, the standard webshell pattern.
4. **Office macro auto-exec indicator** — \`AutoOpen\`/\`Document_Open\`
   combined with \`Shell\`/\`CreateObject\`, the classic macro-malware pattern.
5. **Embedded PE smuggled in another file** — a Windows executable's own
   marker string found anywhere in the file, not just at the start.
6. **Possible Python reverse-shell pattern** — \`socket\`+\`subprocess\`+
   \`connect()\` co-occurring.
7. **High overall entropy** — uses YARA's own real \`math\` module to flag
   files with entropy above 7.5 bits/byte (near the theoretical max of 8).
   This is informational only — ordinary compressed formats (zip, jpg)
   also read this high, so it's shown as evidence, not a verdict.

## Custom rules — the real point of YARA
YARA's actual purpose is letting an analyst write a rule and test it
against real samples. Switch to "Write your own rule" to do exactly that:
type or paste a YARA rule (an example is pre-filled), and it's compiled
and run against your uploaded file on the server. A syntax mistake returns
the real compiler error rather than a generic failure — most first
attempts at a YARA rule have one, and seeing the actual error is part of
learning the syntax.

## How to use it
1. Pick a mode: **Built-in rules** or **Write your own rule**.
2. If writing your own, edit the rule text (the pre-filled example matches
   files containing the string \`SECRET_MARKER_XYZ\` — try it against a
   file you make containing that text).
3. Click **Choose file**, then **Scan**.
4. Each matched rule is shown with its description and the actual matched
   string, its identifier, and its byte offset in the file — real evidence
   for you to judge, never a fabricated malicious/clean score.

## Notes & limits
- The file is **never executed or written to disk** — only its raw bytes
  are read in memory for pattern matching.
- Files are capped at 5MB; custom rule source is capped at 20KB.
- A custom rule match runs under a 5-second timeout — a guard against a
  pathological pattern (e.g. a runaway regex) taking too long, not a
  limitation you should normally notice.
- **No result here is a verdict.** A match means the file contains a
  pattern that rule looks for — it's evidence for a human to weigh, the
  same way a real analyst reads YARA hits, not an automatic malicious/safe
  determination.
`.trim();

export const YARA_SCAN_SUGGESTIONS = [
  "What is YARA actually used for in the real world?",
  "Why is the built-in rule set called an 'educational demo'?",
  "How do I write my own YARA rule?",
  "Why does high entropy alone not mean a file is malicious?",
];
