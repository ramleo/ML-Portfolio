// User guide for SIEM Alert Triage Agent — rendered in
// SiemTriageUserGuideModal (the "User Guide" header button) AND injected
// into the floating AI Assistant as its ONLY tool knowledge. Keep factual
// and in sync with the actual feature set.

export const SIEM_TRIAGE_GUIDE = `
# SIEM Alert Triage Agent — User Guide

## What this tool does
Security teams get flooded with far more raw alerts than a human can
individually review — this is the real "alert fatigue" problem SOC
analysts deal with every day. This tool does what a real triage workflow
does: it collapses near-identical alerts into groups first, then asks an
independent LLM judge to prioritize each *group* (not each raw line) and
suggest what a human analyst should check next.

## Two layers, not one black box
1. **Deduplication/grouping (runs entirely in your browser)** — every
   pasted alert line is normalized into a "template" by replacing IPv4
   addresses and numbers with placeholders, so lines that only differ by
   an IP address, username, or count collapse into the same group. This is
   a simplified version of real log-template-extraction techniques (like
   the published Drain/IPLoM algorithms use) — not an exact implementation
   of either, but the same underlying idea. Only the **grouped summary**
   (template text, count, one real example line, and the unique IPs
   involved) is ever sent to the backend — never your full raw paste,
   and capped at the 20 largest groups so a huge log can't blow up the
   request.
2. **LLM judge (backend, second opinion)** — the grouped summary is sent
   to a second, independent LLM call that assigns each group a priority
   (critical/high/medium/low/noise) plus a one-sentence reason and a
   one-sentence suggested next step. This reuses the exact same
   fixed-server-key pattern already used by this site's Prompt Injection
   Playground and AI Code Detector tools — no API key of your own is
   needed.

## Advisory only — this tool never takes action
Every suggestion is phrased as something a human should do next
("investigate the source IPs," "likely safe to suppress") — never as
something this tool already did. There is no real firewall, EDR, or
Active Directory integration behind this: it cannot actually block an IP,
disable an account, or isolate a host. Treat every "suggested action" as a
starting point for a human investigation, not a completed remediation.

## How to use it
1. Paste a batch of raw alert lines, one per line — from any source
   (SIEM export, resolver log, application log, anything text-based).
2. Click **Triage alerts**. Click **Try a sample log** to see a worked
   example mixing a brute-force-style repeated pattern, a couple of
   genuinely distinct one-off alerts, and pure noise (repeated routine
   "backup completed" messages).
3. Results appear sorted by priority (critical first), each card showing
   the real grouping data (match count, unique IPs, one real example line)
   alongside the judge's reasoning and suggested action — never a bare
   priority label with nothing behind it.

## What this is (and isn't)
This is a real two-layer triage assistant, not a trained anomaly-detection
model and not a live SIEM integration. The grouping heuristic only
collapses alerts that share the same normalized template — a genuinely
different-looking alert about the same underlying incident won't be
grouped with it. The LLM judge's priority calls are a second opinion, not
ground truth — it has no context beyond what's in front of it (no
knowledge of your specific environment's baseline, no historical
correlation across sessions). If the judge is temporarily unavailable, the
grouping data is still shown on its own — the deduplication itself is
useful even without a priority opinion layered on top.
`.trim();

export const SIEM_TRIAGE_SUGGESTIONS = [
  "How does the deduplication/grouping work?",
  "Why is this only advisory?",
  "What data actually gets sent to the LLM?",
  "Why are some alerts grouped and others not?",
  "What if the judge is unavailable?",
];
