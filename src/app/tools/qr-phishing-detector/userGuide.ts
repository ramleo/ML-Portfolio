// User guide for QR Phishing Detector — rendered in QrPhishingUserGuideModal
// (the "User Guide" header button) AND injected into the floating AI
// Assistant as its ONLY tool knowledge. Keep factual and in sync with the
// actual feature set.

export const QR_PHISHING_GUIDE = `
# QR Phishing Detector — User Guide

## What this tool does
Upload a photo or screenshot containing a QR code, and the tool decodes it
and analyzes the destination link for structural signs of phishing or a
malicious redirect — entirely with local heuristics, no ML model, no API
cost. The decoded link is **never actually visited** — only its text is
analyzed, so scanning a link here can't itself trigger anything on the
destination.

## How to use it
1. Click **Choose photo(s)** and pick one or more images, each containing a
   QR code (a poster, a flyer, a parking-meter sign, or a screenshot of a
   code you received some other way).
2. Each photo is decoded and scored in parallel — results appear as their
   own card as soon as each scan finishes, so you don't wait for the
   slowest one before seeing the rest.

## Reading the result
Each decoded QR gets one of three risk levels:
- **Low risk** (green) — no structural red flags found in the link itself.
- **Medium risk** (amber) — a soft signal: a URL shortener hiding the real
  destination, a plain-HTTP (non-encrypted) link, or a top-level domain
  (.top, .xyz, .click, etc.) commonly abused for throwaway phishing sites.
- **High risk** (red) — a strong signal: the link points straight at an IP
  address instead of a domain name, contains an "@" trick that hides the
  real destination after it, uses punycode encoding (often used to disguise
  a lookalike domain), or closely resembles a well-known brand's domain by
  only a character or two (a likely typosquat, e.g. "paypa1.com" instead of
  "paypal.com").

## What this is (and isn't)
These are **structural red flags in the link's text, not a verdict**. A
"high risk" result is worth real suspicion — but a "low risk" result can
still lead somewhere malicious in ways a structural check can't see, like a
freshly-registered domain with a completely plausible name. When in doubt:
don't scan unfamiliar QR codes in public places, and never enter credentials
or payment details after following a code you didn't expect.

## Notes & limits
- Only decodes QR codes (not other barcode formats).
- If no QR code is found in the image, the tool says so rather than
  guessing — try a clearer, more direct shot of just the code.
- The typosquat check compares against a small curated list of frequently
  impersonated brands (PayPal, Amazon, major banks, shipping carriers, etc.)
  — it is not exhaustive, so a typosquat of a brand outside that list won't
  be flagged by that specific check (other signals like punycode or an
  unusual TLD may still catch it).
`.trim();

export const QR_PHISHING_SUGGESTIONS = [
  "What makes a link 'high risk' here?",
  "Does this tool actually visit the link?",
  "What does a typosquat mean?",
];
