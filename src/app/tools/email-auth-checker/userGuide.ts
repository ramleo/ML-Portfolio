export const EMAIL_AUTH_GUIDE = `
# Email Header Authentication Checker — User Guide

## What this tool does
Paste the raw headers of an email (from "View Source" / "Show Original" in
most mail clients). The tool gives you two honest signals: what the
**receiving mail server already found** (the real SPF/DKIM/DMARC verdicts
most providers stamp into an \`Authentication-Results\` header at delivery
time), and independent **live DNS checks** — real-time TXT lookups of the
sending domain's actual SPF record, DMARC policy, and DKIM key status —
plus a From:-domain alignment check between them.

## Purpose
Email spoofing relies on the From: address being trusted at face value.
SPF, DKIM, and DMARC are the real, standardized mechanisms mail servers use
to catch that — but most people never see the technical verdict a mail
provider already computed, and can't easily check a sending domain's actual
DNS-level protections themselves. This tool surfaces both: it relays what
was already checked, and independently re-verifies the domain's own current
DNS configuration, live, against the real public DNS system.

## How to use it
1. Open the suspicious (or simply unfamiliar) email and find "Show
   Original" / "View Source" — copy the full raw headers.
2. Paste them into the text box and click **Check authentication**.
3. Review the overall verdict, any warnings, the receiving-server's own
   findings, the independent DNS checks, and the domain alignment result.

## A worked example
Click **Load sample headers** to load a synthetic example headers block for
a GitHub notification email, then click **Check authentication**. This
performs a real live DNS lookup against github.com's actual SPF and DMARC
records — verified during development to return \`spf=pass\`/\`dkim=pass\`/
\`dmarc=pass\` from the stamped Authentication-Results, a real SPF record
ending in \`~all\` (soft fail), a real DMARC policy of \`p=quarantine\`, an
active (non-revoked) DKIM key, full alignment, and an overall
**"Likely legitimate"** verdict. Try pasting headers for a domain with no
real DNS records at all (or edit the sample's \`From:\` domain to something
nonexistent) — the verdict correctly drops to **"Weak authentication"**
with explicit warnings about the missing SPF/DMARC records, rather than
claiming "phishing detected" outright.

## Reading the result
- **Overall verdict** — "Likely legitimate," "Suspicious," "Weak
  authentication," or "Inconclusive," each with a plain-language reason.
- **Reported by the receiving server** — the actual spf=/dkim=/dmarc=
  verdicts already computed by whichever mail server received this email;
  relayed, not re-verified.
- **Independent live DNS checks** — the sending domain's real, current SPF
  record strictness, DMARC policy, and DKIM key status (found / revoked /
  not found), fetched live via public DNS.
- **From:-domain alignment** — whether the DKIM signature's domain and the
  SPF-checked domain both match the visible From: domain (a classic
  spoofing tell is a mismatch here).

## Notes & limits
- **Does not cryptographically verify the DKIM signature.** That requires
  the full raw message body to recompute the body hash, which a
  headers-only paste doesn't include — disclosed rather than silently
  skipped.
- **DNS records reflect the domain's *current* configuration**, which may
  differ from what was in effect when the email was actually sent.
- **Authentication-Results verdicts are only as trustworthy as the mail
  provider that stamped them** — this tool relays them, it doesn't
  re-check them independently.
- A "Weak authentication" result means the sending domain isn't well
  protected against spoofing — it is not proof that a specific email is
  fraudulent.
`.trim();

export const EMAIL_AUTH_SUGGESTIONS = [
  "Why doesn't this verify the DKIM signature cryptographically?",
  "What's the difference between the two DNS checks and the receiving server's verdict?",
  "What does a DMARC policy of p=none actually mean?",
  "Where do I find an email's raw headers?",
];
