export const AI_CODE_DETECTOR_GUIDE = `
# AI-Generated Code Detector — User Guide

## What this tool does
Paste a code snippet and see two independent, low-confidence signals side by
side: a **stylometric heuristic layer** (instant, client-side, checks for
documented stylistic tendencies) and an **independent LLM opinion**. Neither
one — separately or combined — produces a probability or a "written by AI"
verdict. This is a deliberate design choice, not a missing feature.

## Purpose
There is no reliable, published, general-purpose way to determine with
confidence whether a piece of code was written by an AI or a human. Style
alone isn't proof: a careful human can write clean, well-commented,
consistently-formatted code, and any LLM can be prompted to write messy,
inconsistent code. This tool exists to show what the actual, real signals
people point to look like — and, just as importantly, to demonstrate why
none of them, alone or combined, should be trusted as a verdict. It's an
honesty-first sibling to this site's other "documented, evadable heuristics
shown as raw evidence" tools ([[extension-permission-analyzer]],
[[prompt-injection-playground]]).

## How to use it
1. Paste a code snippet, or click one of the three example buttons.
2. Click **Analyze code**.
3. Review the stylistic signals found (each with a plain-language "why" that
   also states its own weakness) and the LLM's independent read, then the
   qualitative overall label.

## A worked example
Click **AI-style snippet** — a Python example with dense Google-style
docstrings, generic variable names (\`result\`, \`data\`, \`output\`), a broad
\`except Exception\` block, and "Step 1/Step 2" comment framing. It correctly
surfaces 4 stylistic signals and an overall **"Several AI-style signals"**
label. Now click **Clean human snippet (should NOT flag)** — a tidy,
well-commented human function with a single clean docstring and no
boilerplate framing. It correctly returns **"No notable AI-style signals"**
— proof this tool doesn't punish a human for writing careful code. The third
example, **Messy human snippet**, has a TODO, a leftover debug \`print\`, and
inconsistent naming — also correctly returns no signals, since messiness is
itself just another style, not a determination of authorship either way.

## Reading the result
- **Overall label** — "Several," "A few," or "No notable" AI-style signals.
  Never a percentage, never "AI-written"/"human-written." A high signal count
  means "worth a second look for other reasons," not "confirmed."
- **Stylistic signals** — each one names what was found, a concrete detail,
  and an honest explanation of why it's only weakly suggestive.
- **Independent LLM opinion** — a second model's own read, instructed to
  answer "inconclusive" unless there's a genuinely distinctive tell (like an
  LLM chat artifact leaking into the code) — inconclusive is the expected,
  correct answer for most ordinary code, not a failure to decide.

## Notes & limits
- **No detector here is validated against a real benchmark of known
  human-vs-AI code samples.** This is disclosed prominently, not glossed
  over — the same reason two other candidate security tools for this site
  (a wildfire visual detector, a signature-verification tool) were rejected
  outright rather than shipped with a misleading confidence number.
- **Every signal is trivially fakeable in either direction.** Treat this as
  an educational demonstration of what people look for, not a way to catch
  anyone doing anything.
- **A high overall label is not evidence of wrongdoing** in any context
  (job interviews, academic integrity, code review) — using it that way
  would be exactly the overclaiming this tool is built to avoid.
`.trim();

export const AI_CODE_DETECTOR_SUGGESTIONS = [
  "Why doesn't this tool give a percentage or a final verdict?",
  "Can a human really write code that looks \"AI-style\"?",
  "Why does the LLM judge default to \"inconclusive\"?",
  "Is there any code-authorship detector that actually works reliably?",
];
