## What problem it solves

A QR code is a URL you cannot read.

That is the entire attack. Every other phishing link can be inspected — hover
over it, look at the status bar, read the domain. A QR code is a black-and-white
square, and the only way to see where it goes is to go there. People scan codes
on parking meters, restaurant tables, posters and invoices without any
opportunity to be suspicious, and the practice has its own name now:
**quishing**.

The attack is also cheap. Print a sticker with your own QR code and put it over
the real one on a parking machine. Nothing about the physical world reveals the
substitution.

This tool decodes the code and analyses the destination **without visiting it**.

## How it works, step by step

1. **Upload an image**, or paste a URL directly.
2. **Decode any QR codes** in it with OpenCV's built-in detector.
3. **Work out what the payload actually is** — a URL, Wi-Fi credentials, a
   contact card, a phone number, plain text.
4. **If it is a URL, run seven structural checks** locally.
5. **Optionally enrich** with Google Safe Browsing and an RDAP domain-age lookup.
6. **Report signals with a risk level** — never a verdict.

**The destination is never fetched.** Only the text of the URL is analysed, and
the reputation check is a hash-prefix lookup rather than a page load. So scanning
a link here cannot itself visit the destination or trigger a payload — which is a
property a tool of this kind absolutely must have.

## The model or algorithm

### The seven structural checks

All local, all instant, no key required:

**IP-literal host.** `http://192.168.1.1/login` — a legitimate service has a
domain name.

**Punycode.** Any label beginning `xn--`. This is the encoding that lets
non-ASCII characters appear in domain names, and it is how **homograph attacks**
work: Cyrillic «а» renders identically to Latin "a" in most fonts, so
`аpple.com` and `apple.com` are visually indistinguishable and are different
domains. Flagging the encoding catches the whole class without needing to reason
about which glyphs look alike.

**The `@` trick.** In `https://apple.com@evil.com/login`, everything before the
`@` is credentials, and the browser goes to **`evil.com`**. The part a human
reads as the destination is the part that is ignored. Rare in the wild now, and
still worth flagging because it is so completely invisible to a casual reader.

**URL shorteners.** Not malicious, but they hide the destination — which in a
context where you already cannot see the URL means two layers of concealment.

**Suspicious TLDs.** Some top-level domains are cheap or free and are
disproportionately used for throwaway phishing infrastructure.

**Plain HTTP.** No transport security, and increasingly unusual for anything
legitimate.

**Typosquatting**, by Levenshtein distance against a curated list of
frequently-impersonated brand domains — the same edit-distance technique as the
Malicious Package Scanner, applied to domains rather than package names. A domain
one or two edits from `paypal.com`, while not being it, is the signal.

The brand list is **small, curated and disclosed**: a typosquat of a brand not on
the list will not be caught by that specific check, though punycode or a
suspicious TLD may still catch it. This is the honest-list pattern that recurs
across the security tools in this book.

### Two external checks

**Google Safe Browsing** — is this URL already known to be malicious? A
reputation lookup against Google's database, and the strongest single signal
available when it fires. Its weakness is coverage: new phishing infrastructure
takes hours or days to appear, and a fresh campaign is invisible to it.

**RDAP domain age** — WHOIS's modern public successor. Phishing domains are
typically registered days before use and abandoned after, so **a domain
registered a week ago is a strong signal** in a way that is hard to fake: an
attacker cannot make their domain older.

The two complement each other precisely. Safe Browsing knows about *yesterday's*
campaigns; domain age catches *today's*, because whatever else is unknown about a
brand-new domain, its age is a fact.

RDAP coverage is not universal — some TLDs and registries do not expose it — so
the check is documented as best-effort, and a missing answer is reported as
missing rather than as "old".

### Non-URL payloads are not ignored

A QR code does not have to contain a URL. It can hold Wi-Fi credentials, a
contact card, a phone number, an SMS, an email, a geographic location or plain
text.

Rather than reporting "nothing to check", the tool identifies the payload type
and says what it is. **Wi-Fi codes get an explicit caution**, and the reason is
good: scanning one **auto-joins the network**. A malicious Wi-Fi QR code on a
café table joins your phone to the attacker's access point, and no URL was ever
involved.

That is a genuinely different attack surface, and a URL-only scanner would
silently pass it as harmless.

### Signals, not a verdict

The docstring names this explicitly, and ties it to the same pattern used by the
tampering detector and the signature-verification tools:

> *When detection is heuristic rather than ground truth, surface what was found
> and let a human weigh it, rather than claim "safe" or "malicious" outright.*

Risk is reported as **high / medium / low** based on which signals fired, with
every signal written out in a sentence.

The reason this matters for a URL scanner in particular: a **false "safe"** is
much more dangerous than a false "suspicious". Someone who is told a link is safe
proceeds without caution, and the tool has actively made things worse than if it
had said nothing. Reporting findings keeps the judgement with the person.

## Why these choices

**Why never fetch the URL.** Fetching means the server visits an attacker-chosen
destination — SSRF, in exactly the shape the TLS and attack-surface chapters
describe — and it means the payload gets a request from a real client, which can
be enough to trigger it or to confirm the code is being scanned. Text analysis
plus a hash-prefix reputation lookup gets most of the value with none of that.

**Why OpenCV's detector.** Already a dependency, so no `pyzbar`/`libzbar` native
library to install and keep working in a slim image.

**Why flag punycode rather than compare glyphs.** Building a homograph
confusable-character table is a large piece of work with an endless tail. The
*encoding* is a single reliable indicator of the whole class, and legitimate
punycode domains are rare enough that the false-positive cost is small.

**Why edit distance for typosquats.** Same argument as the package scanner: small
distance means plausible misreading, and proximity to a *popular* brand means
someone would actually be fooled.

## How to read the output

- **Read the signals, not the level.** Each one says exactly what was found.
- **Any punycode is worth stopping for.** Legitimate uses exist; on a QR code
  from a sticker, treat it as hostile until shown otherwise.
- **A Safe Browsing hit is close to conclusive.** No hit is not.
- **A domain registered days ago, for a brand that has existed for decades, is
  the strongest heuristic here.**
- **"Low" means these checks found nothing**, not that the destination is safe. A
  brand-new, unshortened, HTTPS, plausibly-named domain passes everything.
- **A Wi-Fi payload is a different question entirely** — joining a network, not
  visiting a page.
- **A missing RDAP answer means the registry did not answer**, not that the
  domain is old.

## Limits

- **Curated brand list**, disclosed as non-exhaustive.
- **No page content analysis**, by design — nothing is fetched.
- **No redirect following**, so a shortener's destination is unknown; the
  shortener itself is the flag.
- **Safe Browsing lags new campaigns** by hours or days.
- **RDAP coverage is patchy** across TLDs.
- **QR decoding can fail** on damaged, low-contrast, angled or very small codes.
- **Structural signals are evadable.** A patient attacker registers a plausible
  domain on a normal TLD, waits a month, uses HTTPS, and passes everything.
- **Signals, not a verdict**, and deliberately so.

## Likely interview questions

**"Why are QR codes a phishing problem specifically?"**
Because a QR code is a URL you cannot read. Every other link can be inspected
before clicking; a QR code is opaque until you have already gone there. It also
lives in the physical world, where a sticker over a parking meter's real code
costs nothing and nothing about the surroundings reveals the substitution. The
usual defence — look at the domain — is unavailable at exactly the moment it is
needed.

**"Why not fetch the URL and check the page?"**
Two reasons. It is SSRF — the server would be making requests to an
attacker-chosen destination, which can be used to reach internal services or
scan a private network. And it gives the payload a real request from a real
client, which can be enough to trigger it or simply to confirm that the code is
being scanned. Analysing the URL text plus a hash-prefix reputation lookup gets
most of the value with none of that exposure.

**"What is a homograph attack and how do you detect it?"**
Using characters from other scripts that render identically to Latin ones —
Cyrillic «а» for Latin "a" — so `аpple.com` looks exactly like `apple.com` and is
a different domain. Those domains are encoded in punycode, so every label starts
`xn--`. Flagging the encoding catches the entire class in one check. Building a
confusable-glyph table instead is a large job with a long tail, and legitimate
punycode is rare enough that the false-positive cost of the simple check is low.

**"Domain age seems like a weak signal. Is it?"**
It is one of the strongest available, because it is hard to fake. Phishing
domains are typically registered days before a campaign and abandoned after, and
an attacker cannot make their domain older — they would have to have registered it
a year ago and left it idle. It also complements Safe Browsing precisely: Safe
Browsing knows about yesterday's campaigns and misses today's, while age catches
the new ones exactly when reputation has nothing.

**"Why report signals instead of safe or malicious?"**
Because the asymmetry matters. A false "suspicious" costs someone thirty seconds
of caution; a false "safe" makes them proceed *without* caution, which is worse
than if the tool had said nothing at all. The detection here is heuristic rather
than ground truth, so the honest output is what was found, in sentences, with the
judgement left where it belongs.

**"A QR code contains Wi-Fi credentials, not a URL. What do you do?"**
Identify it and warn, rather than pass it as nothing to check. Scanning a Wi-Fi
QR code **joins the network** — so a malicious one on a café table puts a phone
onto the attacker's access point, with no URL involved anywhere. It is a
completely different attack surface, and a URL-only scanner reporting "no
findings" would be actively misleading.
