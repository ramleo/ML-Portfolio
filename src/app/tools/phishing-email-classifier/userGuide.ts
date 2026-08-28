// User guide for Phishing Email Body Classifier — rendered in
// PhishingEmailUserGuideModal (the "User Guide" header button) AND
// injected into the floating AI Assistant as its ONLY tool knowledge.
// Keep factual and in sync with the actual feature set.

import { MEASURED_HELD_OUT_ACCURACY, HELD_OUT_COUNT } from "./emailBodyClassifier";

export const PHISHING_EMAIL_GUIDE = `
# Phishing Email Body Classifier — User Guide

## What this tool does
This site's other phishing/security tools check a link's URL structure
(QR Phishing Detector), a domain's SPF/DKIM/DMARC records (Email Auth
Checker), or DNS query patterns (DNS Tunneling Detector) — none of them
read what an email actually *says*. This tool does: it scores the body
text itself for real phishing-style language, using a Naive Bayes
classifier trained on 18,630 real emails and measured at
**${Math.round(MEASURED_HELD_OUT_ACCURACY * 100)}% accuracy on a genuine ${HELD_OUT_COUNT}-email held-out test set**
— a real, disclosed number, not assumed from the technique's reputation.

## The real technique
**Multinomial Naive Bayes** is the classic technique for spam/phishing
text classification — well-established since before deep learning, still
a strong and, importantly, *interpretable* baseline. It was trained once,
locally (not part of this live app), on a real combined dataset of
phishing emails (the Nazario phishing corpus) and legitimate business
emails (the real Enron email corpus) — the same class of dataset this
research area actually uses, not something assembled for this project.
The trained model (a ~3,000-word vocabulary plus per-word probabilities)
ships as a small file and every prediction runs **entirely in your
browser** — nothing about the email you paste is sent anywhere.

## Two independent signals, not one fused score
1. **The trained model's verdict** — a phishing probability, plus its
   actual **top contributing words** for that specific prediction. This
   is real Naive Bayes interpretability: each word genuinely pushed the
   score toward "phishing" (red) or "safe" (green) based on how often it
   appeared in each class during training — not a fabricated explanation
   layered on afterward.
2. **A small, transparent rule-based check** — a curated (not exhaustive)
   list of urgency phrases ("act now," "your account will be suspended,"
   etc.) and generic greetings ("Dear Customer," "Dear Valued Member").
   Shown separately so you can see whether the trained model and the
   plain-English rules agree, rather than trusting one blended number.

## How to use it
Paste the body text of an email — click **Try a phishing example** or
**Try a safe example** to see two real emails from the training dataset's
own held-out test set (not fabricated for this demo).

## What this is (and isn't)
This scores **language only** — it has no idea who actually sent the
email, whether the sender address matches the claimed identity, or
whether any link inside actually goes somewhere malicious (use the QR
Phishing Detector or Email Auth Checker for those). It's a real,
measured-accuracy classifier, not a perfect one: ${Math.round((1 - MEASURED_HELD_OUT_ACCURACY) * 100)}%
of the held-out test set was misclassified either direction, and the
model is trained on this specific dataset's writing style — a
sophisticated, well-written phishing email crafted to sound exactly like
ordinary business correspondence could plausibly slip past a language-only
check like this one. Treat a "likely phishing" result as a real reason to
scrutinize the email further, and a "likely safe" result as one signal
among several, not a guarantee.
`.trim();

export const PHISHING_EMAIL_SUGGESTIONS = [
  "What is Naive Bayes and why use it here?",
  "What does the accuracy number actually mean?",
  "How are the top contributing words chosen?",
  "What can this tool NOT catch?",
  "What dataset was this trained on?",
];
