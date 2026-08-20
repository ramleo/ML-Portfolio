// User guide for QR Phishing Detector — rendered in QrPhishingUserGuideModal
// (the "User Guide" header button) AND injected into the floating AI
// Assistant as its ONLY tool knowledge. Keep factual and in sync with the
// actual feature set.

export const QR_PHISHING_GUIDE = `
# QR Phishing Detector — User Guide

## What this tool does
Upload a photo or screenshot containing a QR code, and the tool decodes it
and checks the destination link two ways: structural analysis of the link's
own text (local heuristics, always runs, no cost), and a reputation lookup
against Google Safe Browsing's database of already-known malicious sites
(a hash-prefix lookup, not a page visit). The decoded link is **never
actually visited** by this tool either way — so scanning a link here can't
itself trigger anything on the destination.

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
  a lookalike domain), closely resembles a well-known brand's domain by only
  a character or two (a likely typosquat, e.g. "paypa1.com" instead of
  "paypal.com"), or — strongest signal of all — is already listed in
  Google Safe Browsing's own database of known malware/phishing sites.

A small note under each photo's results says whether the Google Safe
Browsing check actually ran for that scan ("Also checked against Google
Safe Browsing's known-threat database") or fell back to structural
heuristics only.

## What this is (and isn't)
This is **two signals, not a verdict**: structural red flags in the link's
own text, plus (when configured) whether Google already knows this exact
site is malicious. A "high risk" result — especially one flagged by Safe
Browsing specifically — is worth real suspicion. But a "low risk" result
still isn't a guarantee: Safe Browsing only knows about sites it has already
seen and classified, so a **freshly-registered phishing domain that hasn't
been indexed yet** can still pass both checks clean. When in doubt: don't
scan unfamiliar QR codes in public places, and never enter credentials or
payment details after following a code you didn't expect.

## Notes & limits
- Only decodes QR codes (not other barcode formats).
- If no QR code is found in the image, the tool says so rather than
  guessing — try a clearer, more direct shot of just the code.
- The typosquat check compares against a small curated list of frequently
  impersonated brands (PayPal, Amazon, major banks, shipping carriers, etc.)
  — it is not exhaustive, so a typosquat of a brand outside that list won't
  be flagged by that specific check (other signals like punycode or an
  unusual TLD may still catch it).
- The Safe Browsing check is a lookup against Google's existing database,
  not a live analysis of the page — it can only flag a site Google has
  already crawled and classified as malicious, so very new or low-traffic
  malicious sites may not be listed yet. If the check is unavailable (not
  configured, or a temporary lookup failure), the scan still runs on
  structural heuristics alone and says so.
`.trim();

export const QR_PHISHING_SUGGESTIONS = [
  "What makes a link 'high risk' here?",
  "Does this tool actually visit the link?",
  "What does a typosquat mean?",
];
