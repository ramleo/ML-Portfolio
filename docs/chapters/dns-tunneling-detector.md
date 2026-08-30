## What problem it solves

A network can block almost every outbound protocol and still leak data, because
one thing is essentially never blocked: **DNS**.

DNS has to work. Block it and nothing resolves. So on a locked-down network —
corporate, hotel, airport captive portal — DNS queries usually reach the outside
world even when HTTP does not. Attackers use that as a covert channel.

The technique is simple. Encode the data you want to exfiltrate into the
*subdomain* of a domain you control:

```
ZXhmaWx0cmF0ZWQtZGF0YS1jaHVuay0x.tunnel.attacker.com
```

Your resolver dutifully forwards that query to the attacker's authoritative
nameserver, which reads the payload out of the name it was asked about and
answers with data of its own in the response. A file leaves the network one
hostname at a time, and every query looks like ordinary DNS.

This tool detects that pattern in a DNS log.

## How it works, step by step

**Single host mode** — paste one hostname and see its statistics.

**Log mode** — paste a DNS query log, one hostname per line:

1. **Split each hostname** into a parent domain and a subdomain.
2. **Group by parent domain**, collecting the set of unique subdomains and the
   query count.
3. **Compute three signals** per parent: subdomain length, Shannon entropy, and
   how many distinct subdomains were seen.
4. **Flag a parent only when the signals agree.**
5. **Sort flagged domains first**, then by entropy.

## The model or algorithm

### Shannon entropy — the core measurement

Entropy measures how unpredictable a string's characters are, in bits per
character:

```
H = − Σ p(c) · log₂ p(c)
```

For each distinct character, take its frequency, multiply by the log of that
frequency, sum, negate. A string using few characters predictably scores low; one
using many characters evenly scores high.

The reason it works here is the difference between how humans and machines
produce names:

| String | Roughly |
|---|---|
| `www`, `mail`, `api`, `login` | **under 3** bits/char |
| English words generally | ~3–3.5 |
| base64 or hex encoded data | **4.5–6** |

Human-chosen subdomains are short, pronounceable, and reuse letters. Encoded data
uses the full alphabet uniformly, because that is what encoding does. The
threshold is **4.0 bits/char**, comfortably above ordinary hostnames and below
encoded payloads.

### Why three signals and not one

This is the design decision the file leads with, and it is the right instinct.

**Length alone** (threshold 50 characters) flags CDN cache-busting names, S3
bucket hostnames, and the long machine-generated subdomains that cloud services
produce constantly.

**Entropy alone** flags the same things — a random-looking bucket name has high
entropy because it *is* random, just legitimately so.

**Volume alone** flags any busy CDN.

Each of these is a real property of tunnelling and a common property of ordinary
traffic. So the flag requires:

```javascript
flagged = matchedSignals.length >= 2 && avgEntropy > ENTROPY_THRESHOLD
```

**At least two of three, and high entropy is mandatory.** Entropy is the
load-bearing signal — a long subdomain that is not high-entropy is just a long
name — and requiring a second signal alongside it is what suppresses the
false positives that make single-heuristic detectors unusable.

### Why grouping by parent domain matters

A tunnel is not one strange hostname. It is **many** strange hostnames under
**one** parent, because each query carries one chunk of the payload and the
attacker owns exactly one domain.

That gives the third signal: **5 or more unique subdomains under one parent**.
And it changes what a "detection" is — the output is a suspicious *domain*, which
is something you can block, rather than a list of individual queries.

It is also why the aggregate uses **average** entropy rather than the maximum.
One high-entropy subdomain under a parent is unremarkable; a parent whose
subdomains are *consistently* high-entropy is a channel.

### The public-suffix problem

Splitting `sub.example.co.uk` into parent and subdomain requires knowing that
`co.uk` is a public suffix, not a domain. Naive splitting on the last two labels
gives `co.uk` as the parent, which is wrong.

The correct answer is Mozilla's Public Suffix List, which has thousands of
entries and changes. The tool ships **a small curated set** — `co.uk`, `com.au`,
`co.jp` and a dozen more — and discloses it as the same *"not exhaustive,
disclosed"* pattern used by the QR Phishing Detector's brand list and the YARA
scanner's rule set.

The reasoning given is proportionate: a full PSL parse is a large new dependency
for a heuristic tool where an occasional missed edge case — an unusual ccTLD —
does not change the verdict logic. Worth noticing that the failure mode is
*specific*: an unusual multi-part TLD splits wrongly and its statistics are
computed over the wrong string, rather than the tool failing generally.

### Runs in the browser

DNS logs are sensitive — they reveal every site an organisation's machines
visited. Nothing is uploaded.

## Why these choices

**Why heuristics rather than a trained classifier.** The signals are
well-published and directly interpretable, and every flag comes with the reason
it fired: *"long subdomain (63 chars), high average entropy (4.7 bits/char), 42
unique subdomains under one parent"*. A classifier would give a probability an
analyst cannot act on. Detection engineering values explainability highly,
because a flag has to survive a human asking why.

**Why these specific thresholds.** 50 characters is a published rule of thumb for
tunnelling payloads, and 4.0 bits/char sits between ordinary hostnames and
encoded data. Both are stated as heuristics.

**Why 5 unique subdomains.** Low enough to catch a small exfiltration, high
enough that ordinary multi-subdomain use does not trip the repetition signal on
its own — and it can only contribute to a flag alongside high entropy anyway.

## How to read the output

- **Read the matched signals, not the flag.** They say precisely why, and that is
  what you act on.
- **Flagged domains are candidates for blocking**, which is the practical outcome
  — you block the parent, not the queries.
- **CDNs and cloud storage are the usual false positives.** Long random
  subdomains under one busy parent is exactly what they look like.
- **A single weird hostname is not a tunnel.** Volume under one parent is what
  makes it a channel.
- **Unflagged domains are still sorted by entropy**, so the near-misses are
  visible below the line — often more interesting than the flags.
- **DNS-over-HTTPS will not appear in this log at all**, which is worth
  remembering before concluding a network is clean.

## Limits

- **Heuristics, not detection.** A patient attacker who keeps subdomains short,
  low-entropy and infrequent — a slow tunnel using dictionary-word encoding —
  passes everything here.
- **Fixed thresholds** with no adaptation to the network's own baseline.
- **The public-suffix list is curated and small.**
- **No timing analysis.** Tunnelling has a characteristic query *rhythm*, and
  inter-arrival timing is one of the strongest available signals. This tool does
  not use it, because a pasted hostname list has no timestamps.
- **No record-type analysis.** TXT and NULL records carry far more data per
  response than A records and are a strong indicator; not examined.
- **No response inspection** — only queries.
- **Legitimate high-entropy DNS exists** and will be flagged: some antivirus and
  reputation services genuinely encode lookups into subdomains.
- **Offline analysis of a pasted log.** Not a live monitor and not an alerting
  system.

## Likely interview questions

**"How does DNS exfiltration work, and why DNS?"**
Because DNS is almost never blocked — block it and nothing resolves — so on a
locked-down network the queries still reach the outside. The attacker encodes
data into the subdomain of a domain they control, the victim's resolver forwards
it to their authoritative nameserver, and they read the payload out of the name
they were asked about. Data can come back in the response, usually TXT records.
Every packet looks like ordinary DNS.

**"What is Shannon entropy and why does it detect this?"**
Bits per character — how unpredictable the characters are. `−Σ p·log₂p` over the
character frequencies. It works because humans and machines name things
differently: `mail` and `login` are short, pronounceable and reuse letters, so
they score under 3, while base64 or hex uses the alphabet uniformly and scores
4.5 to 6. Encoded data cannot help looking random, and that is the tell.

**"Why require multiple signals?"**
Because each one alone is a real property of ordinary traffic. Long subdomains
are CDN cache-busting and S3 bucket names. High entropy is any randomly generated
hostname. High volume is any busy CDN. Requiring at least two, with high entropy
mandatory, is what makes the flag usable — a single-heuristic detector on a real
network produces so many false positives that people switch it off, which is
worse than not having it.

**"Why group by parent domain?"**
Because a tunnel is many queries under one domain, not one odd hostname — the
attacker owns one domain and each query carries a chunk of the payload. Grouping
gives you the repetition signal, lets you use *average* entropy so a single odd
subdomain does not dominate, and makes the output actionable: you get a domain
you can block rather than a list of individual queries.

**"How would an attacker evade this?"**
Keep subdomains short, use a dictionary-word encoding so entropy stays near
English, spread queries over many parent domains, and go slowly. That defeats all
three signals. Which is why the real answer is not better thresholds but
different signals — timing regularity, query-to-response size ratios, record-type
distribution, and comparison against the network's own historical baseline rather
than a fixed number.

**"What's the single biggest thing missing here?"**
Timing. Tunnelled DNS has a characteristic rhythm because it is a data channel
rather than a human browsing, and inter-arrival analysis is one of the strongest
signals available. It is absent because the input is a pasted hostname list with
no timestamps — which is a limitation of the input format, and I would say that
rather than imply the signal set is complete.
