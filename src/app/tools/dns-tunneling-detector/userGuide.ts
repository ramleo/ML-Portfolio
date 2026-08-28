// User guide for DNS Tunneling / Exfiltration Detector — rendered in
// DnsTunnelUserGuideModal (the "User Guide" header button) AND injected
// into the floating AI Assistant as its ONLY tool knowledge. Keep factual
// and in sync with the actual feature set.

export const DNS_TUNNEL_GUIDE = `
# DNS Tunneling / Exfiltration Detector — User Guide

## What this tool does
DNS tunneling abuses the DNS protocol to smuggle data in or out of a network
past firewalls that trust DNS traffic by default (MITRE ATT&CK T1071.004).
Attacker-controlled malware encodes stolen data (or command-and-control
instructions) into the *subdomain* part of a hostname and queries it against
a domain the attacker controls — e.g.
\`c2VjcmV0LWRhdGEtY2h1bmsxMjM.attacker-domain.com\`. This tool applies the
real, published heuristics security teams use to spot that pattern in a
pasted DNS query log, or on a single hostname.

## The three real signals (published technique, not invented here)
- **Subdomain length** — ordinary hostnames are short and readable.
  Tunneling tools try to cram as much payload as possible into each query,
  commonly pushing subdomains past ~50 characters (DNS caps a single label
  at 63 characters, 255 total).
- **Shannon entropy** — encoded/encrypted payload data looks statistically
  random. A practical published threshold is entropy above ~4.0 bits per
  character; ordinary English-ish hostnames sit well below that.
- **Query volume per parent domain** — a real tunneling session doesn't send
  one weird query, it sends many unique high-entropy subdomains under the
  *same* attacker-controlled parent domain in a short window.

**This tool only flags a parent domain when multiple signals agree** —
never length or entropy alone. A single long, high-entropy-looking
subdomain is common and completely legitimate (CDN cache-busting, S3 bucket
names, tracking pixels) — it's the *combination* of length + entropy +
repetition under one parent domain that's the real tell, which is why the
"Try a sample log" button includes a legitimate-looking mixed log, not just
an obvious attack.

## How to use it
1. **Paste a DNS query log** — one hostname per line, the common format
   for a pasted \`dig\`/resolver/Pi-hole export. Click **Analyze log**.
   Click **Try a sample log** to see a worked example with both ordinary
   traffic and an injected synthetic tunneling burst.
2. **Or check a single hostname** — a much weaker signal on its own, since
   real detection depends on volume this mode can't see. Useful as a quick
   gut-check on one suspicious-looking name someone shared with you.

## Reading the result
- **Log mode**: each parent domain in your log gets its own card showing
  the real numbers behind the verdict (query count, unique subdomains,
  average entropy, max subdomain length) — never just a bare "flagged/not
  flagged" label. A domain is only marked **"Possible DNS tunneling
  channel"** when its entropy is above threshold AND at least one other
  signal (length or repetition) also crosses its own threshold.
- **Single-host mode**: shown as "worth investigating" only when *both*
  length and entropy are above threshold for that one query — explicitly
  never called a verdict, since one query is thin evidence either way.

## What this is (and isn't)
This is real, published heuristic analysis — the same signals security
tools like Splunk/SNORT-based DNS tunneling detectors use — but it's
heuristics, not a trained classifier and not a live network capture. It
only sees what you paste in. A parent domain grouping uses a small curated
list of known multi-part suffixes (\`co.uk\`, \`com.au\`, etc.), not a full
Public Suffix List — an unusual ccTLD not on that list may get grouped
slightly differently, though this rarely changes the overall verdict since
detection relies on the combination of signals, not exact domain grouping.
A "not flagged" result means these particular heuristics didn't trigger —
it isn't proof no tunneling is happening, and a genuinely sophisticated
tunnel could pace its queries or use lower-entropy encoding specifically to
stay under these thresholds.
`.trim();

export const DNS_TUNNEL_SUGGESTIONS = [
  "What is DNS tunneling?",
  "Why does entropy matter here?",
  "Why isn't a long subdomain flagged by itself?",
  "What does 'parent domain' mean?",
  "Is a single-hostname check reliable?",
];
