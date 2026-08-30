## What problem it solves

Email has no built-in sender authentication. The `From:` header is a string the
sender writes, and nothing in the original protocol checks it. Anyone can send a
message that says it came from your bank.

Three standards were bolted on afterwards to fix this — **SPF**, **DKIM** and
**DMARC** — and together they work well. The catch is that they are configured by
the *sending* domain, and a great many domains configure them incompletely or
not at all. When someone forwards you a suspicious email, the question is not
just "does this look phishy" but **"do the authentication results actually say
this came from where it claims?"**

This tool answers that from the headers alone. Paste them in and it reports what
the receiving server already determined, and — independently — what the claimed
sending domain has actually published in DNS.

## How it works, step by step

1. **Paste raw headers.** No message body needed.
2. **Parse the `Authentication-Results` headers** — the receiving mail server's
   own verdicts, stamped at delivery.
3. **Extract the `From:` domain** and any `DKIM-Signature` headers.
4. **Look up the real DNS records** for that domain, live: SPF, DMARC, and the
   DKIM selector's public key if a signature named one.
5. **Check alignment** between the From domain, the DKIM signing domain and the
   SPF-checked domain.
6. **Produce a warnings list** and one qualitative verdict.

## The model or algorithm

### The three standards, and what each actually does

**SPF — Sender Policy Framework.** The domain publishes a DNS TXT record listing
which servers are allowed to send mail for it. The receiving server compares the
connecting IP against that list. It authenticates the **envelope sender**, which
is not necessarily what you see in the `From:` line — and it breaks on
forwarding, because the forwarder's IP is not on the original domain's list.

**DKIM — DomainKeys Identified Mail.** The sending server signs parts of the
message with a private key and puts the signature in a `DKIM-Signature` header.
The public key lives in DNS under a *selector*. The receiver fetches it and
verifies. Unlike SPF, DKIM survives forwarding, because the signature travels
with the message.

**DMARC** ties the two together and adds the missing piece: **alignment**. SPF
and DKIM each authenticate *some* domain, and DMARC requires that domain to match
the one in the visible `From:` header. It also publishes a **policy** — what a
receiver should do when the check fails: `none`, `quarantine`, or `reject`.

**Alignment is the concept worth understanding**, because it is where spoofing
actually gets caught. A message can pass SPF perfectly — the attacker's own
domain has a valid SPF record and they sent from their own server — while
displaying `From: security@yourbank.com`. SPF passed, for `attacker.com`. Without
alignment, "SPF: pass" is nearly meaningless as a statement about the sender you
can see. This tool implements **relaxed alignment**: an organisational-domain
match is enough, so `mail.example.com` aligns with `example.com`.

### Two independent sources of evidence

The design keeps these strictly apart, and the docstring is explicit about why.

**What the receiving server found.** Most providers stamp an
`Authentication-Results` header containing real `spf=`, `dkim=` and `dmarc=`
verdicts, computed against the actual message at delivery time, with the sending
IP and the full body available. The tool **parses and relays this — it does not
re-verify it.** A message can pick up more than one such header as it passes
through several hops, so all of them are parsed.

**What the domain publishes now.** Live DNS lookups against the `From:` domain.
This is genuinely informative even without a cryptographic check: a domain with
**no SPF record**, **no DMARC record**, or a DMARC policy of **`p=none`** has
weak spoofing protection as a matter of published fact, independently confirmable
and nothing to do with this particular message.

Keeping the two apart matters because they answer different questions —
*"what happened to this message"* versus *"how well is this domain defended"* —
and conflating them would let a weak domain configuration look like a verdict
about the email in front of you.

### What is deliberately not done

**Cryptographic DKIM verification is not performed**, and the reason is
structural rather than a shortcut: verifying a DKIM signature requires computing
a hash over the **message body**, and a headers-only paste does not have one.

The docstring's phrasing is the point: attempting it against headers alone would
*"either silently do nothing or mislead"*. So it is disclosed in the API response
and in the interface rather than quietly skipped — because a "DKIM: checked" that
did nothing is worse than an honest gap.

### The warnings

Each names a specific published fact and its consequence:

- **No `Authentication-Results` header** — could be a raw outbound message, a
  server that does not stamp one, or headers trimmed on paste. Three innocent
  explanations offered rather than an accusation.
- **No DMARC record** — spoofed mail claiming this domain has no enforced policy
  to be rejected against.
- **`p=none`** — spoofing attempts are monitored and reported, not blocked. This
  is the most common real-world gap: domains publish DMARC and never move past
  monitoring mode.
- **No SPF record.**
- **SPF ending in `+all`** — explicitly allows *any* server to send as this
  domain, which defeats the entire point of publishing SPF.
- **Neither DKIM nor SPF aligns with the From domain** — described in the code
  as *"a classic display-name-spoofing pattern"*, which is exactly what it is.

The positive verdict requires **both** a DMARC policy of `quarantine` or `reject`
**and** at least one alignment check passing. Publishing a strict policy is not
enough on its own; this message has to actually satisfy it.

## Why these choices

**Why headers only.** It is what people can paste. Full message source is
awkward to extract from most clients, and the headers carry the authentication
evidence.

**Why relay rather than re-verify the receiving server's results.** The receiver
had the connecting IP, the envelope sender and the body. A tool given a pasted
text block has none of those and cannot reproduce the check. Relaying a real
verdict is honest; recomputing a fake one is not.

**Why no fabricated legitimate/phishing verdict.** The docstring rules it out
directly. These signals describe *authentication*, and authentication is not
intent — a perfectly authenticated email from a domain the attacker registered
this morning passes everything.

**Why no SSRF guard here**, unlike the TLS scanner. This tool does DNS TXT
lookups only and never opens a connection to a user-supplied host, so the risk
does not arise. Worth knowing which of your endpoints have that property.

## How to read the output

- **Alignment is the field that matters.** SPF pass with no alignment is the
  signature of display-name spoofing.
- **`p=none` is extremely common** and means the domain is monitoring, not
  enforcing. It is a finding about the domain, not about this message.
- **`+all` in an SPF record is a serious misconfiguration** and unambiguous.
- **A missing `Authentication-Results` header is usually innocent** — most often
  headers trimmed on paste.
- **Passing everything is not "safe".** It means the sender is who they claim to
  be. A lookalike domain the attacker owns will pass every check here.
- **The DNS checks describe the domain today**, not the moment the message was
  sent. Records change.
- **DKIM is not cryptographically verified**, and the response says so.

## Limits

- **No cryptographic DKIM verification** — no body available.
- **SPF is not re-evaluated** — the connecting IP is not available from headers.
- **Headers can be forged**, including `Authentication-Results`. If the receiving
  server stamped it, it is trustworthy; a hand-pasted block might not be.
- **DNS records are read now**, not as of delivery.
- **Authentication is not legitimacy.** A newly registered lookalike domain with
  correct SPF, DKIM and DMARC passes cleanly.
- **No body analysis** — no link inspection, no attachment check, no content
  classification.
- **Relaxed alignment only.** DMARC's strict mode is not distinguished.
- **Forwarding legitimately breaks SPF**, so a forwarded genuine message can
  present exactly like a failure.

## Likely interview questions

**"Explain SPF, DKIM and DMARC and how they fit together."**
SPF publishes which servers may send for a domain and is checked against the
connecting IP — it authenticates the envelope sender and breaks on forwarding.
DKIM signs the message with a private key whose public half is in DNS, so it
survives forwarding. DMARC ties both to the visible `From:` domain through
alignment, and publishes a policy — none, quarantine or reject — telling receivers
what to do on failure. DMARC is the one that makes the other two meaningful,
because without alignment they can both pass for a domain that is not the one the
recipient sees.

**"A message passes SPF but is still spoofed. How?"**
Because SPF authenticates the envelope sender, not the `From:` header. An
attacker sends from their own domain, with a valid SPF record and their own
server, so SPF passes for `attacker.com` — while the `From:` line displays
`security@yourbank.com`. SPF passed; it just passed for the wrong domain. That is
precisely the gap DMARC alignment closes, and it is why alignment is the field to
read.

**"Why don't you verify the DKIM signature yourself?"**
Because DKIM verification hashes the message **body**, and this tool takes
headers only — there is no body to hash. I could have run something that looked
like a check and silently did nothing, which is worse than not doing it, so it is
disclosed in both the response and the interface. Instead the tool relays the
receiving server's DKIM verdict, which was computed when the full message was
available.

**"What's the most common real-world misconfiguration?"**
`p=none`. Domains publish DMARC, set it to monitoring mode to collect reports,
and never move to quarantine or reject. It looks like DMARC is deployed and in
practice nothing is enforced — spoofed mail is reported and delivered. After that,
`+all` in an SPF record, which explicitly permits any server on the internet to
send as the domain and defeats the entire point of publishing SPF.

**"All checks pass. Is the email safe?"**
No, and I would push back on the question. These checks establish that the sender
is who they claim to be — they say nothing about intent. An attacker who
registers a lookalike domain and configures SPF, DKIM and DMARC properly passes
everything here, and that is a very common phishing pattern precisely because it
survives authentication checks. Authentication is one signal; the domain's age,
reputation and the content are others.
