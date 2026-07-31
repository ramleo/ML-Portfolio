export const RECONCILIATION_GUIDE = `
# Contract/Invoice Reconciliation Assistant

Upload a contract, then one or more invoices. This tool compares them and flags
places where an invoice states a different amount, date, or term than the
contract does — a discrepancy report, not a general chat.

## How it works

- The **first document you upload defaults to the contract**; every document after
  that defaults to an invoice. Click the role pill on any document chip ("Contract"
  / "Invoice") to flip it if that's wrong — for example if you uploaded an invoice
  first.
- Once you have exactly one contract and at least one invoice, click **"Check for
  discrepancies."** The tool compares the contract against every invoice
  individually — invoices are never compared against each other, since different
  invoices are supposed to differ from one another (that's not a discrepancy).
- Each flagged discrepancy shows the contract clause and the invoice line
  side-by-side, a short explanation of what disagrees, and a match-confidence
  percentage (how topically related the two passages are — not how confident the
  discrepancy itself is).
- Every flagged discrepancy is double-checked by a second, independently-worded
  pass. If that second check disagrees, the discrepancy still shows (nothing is
  ever silently hidden) but is marked **"Unconfirmed"** — worth reading the two
  passages yourself before trusting it.

## What it's good at

Numeric and date mismatches are the strongest case: "contract says \\$50,000,
invoice bills \\$52,500," or "contract says net-30, invoice says net-45." The tool
prioritizes checking passages that contain a detected amount or date first, since
those are the most likely genuine discrepancies.

## Limitations, honestly

- It only checks a bounded number of contract/invoice passage pairs per request
  (the same small budget the underlying contradiction-detection engine always
  uses) — a very long contract with many clauses may not have every clause
  checked against every invoice line in one pass.
- It reads free text, not structured line-item tables — a contract with a complex
  itemized schedule may not compare as cleanly as a simple "total amount due"
  clause.
- "No discrepancies found" means none were detected within what was checked — not
  a guarantee the documents fully agree everywhere.
- The confirmation pass reduces, but can't eliminate, false positives — two
  passages that state the same value in different wording ("30 days" vs. "30
  days from issue") have been observed to get flagged. It can also occasionally
  mark a genuine discrepancy "Unconfirmed" rather than dismiss it outright; this
  tool is built to surface a report for you to review, not to decide anything on
  its own.
`;

export const RECONCILIATION_SUGGESTIONS = [
  "What counts as a document's \"role\" here?",
  "Why weren't my two invoices compared against each other?",
  "How many passages does the discrepancy check actually look at?",
];