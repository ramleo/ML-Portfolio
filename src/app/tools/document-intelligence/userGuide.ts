// User guide for Document Intelligence — rendered in DocUserGuideModal (the
// "User Guide" header button) AND injected into the floating AI Assistant as
// its ONLY tool knowledge. Keep factual and in sync with the actual feature set.

export const DOC_INTEL_GUIDE = `
# Document Intelligence — User Guide

## What this tool does
Upload a document (invoice, receipt, contract, resume/CV, medical report, bank
statement, ID card, or purchase order) and AI extracts its key fields as
structured data. Fields stream in live with confidence scores, validation
checks, and bounding boxes that highlight where each value sits in the document.

## Supported formats
PDF, DOCX (Word), PNG, JPG, JPEG, WEBP. Max 10 MB per file.
- Digital PDFs: text is read directly; fastest and most accurate path.
- Scanned PDFs and images: converted to text by AI OCR first, then processed
  like a digital document.
- DOCX: text, tables, text boxes, headers and footers are all extracted. Word
  files have no fixed page layout, so there is no visual preview and no
  bounding boxes for them — fields still extract normally.

## How to use it
1. (Optional) Pick a document type in the left sidebar, or leave "Auto-detect" —
   AI classifies the document and shows its confidence in the sidebar.
2. (Optional) In "Extra fields to extract", type additional fields you want,
   comma-separated — e.g. "GST Number, HSN Code, PO Reference". They are added
   to the standard fields for that document type.
3. Drag & drop or click to upload the file.
4. Watch the four steps: Extract → Classify → Analyze → Validate.
5. Results appear as field cards on the right; the document preview on the left
   shows bounding boxes for located fields (PDF/image only).

## Smart processing under the hood
- **Complexity-based model routing:** every document is scored before AI
  extraction. Short, single-page digital documents with no tables count as
  "simple" and are routed to a small, very fast model first; multi-page, long,
  table-heavy, scanned or photographed documents count as "complex" and go to
  the full large-model cascade. If the fast model's output fails validation,
  the document is automatically retried on the large models — you never trade
  accuracy for speed. When the fast path serves your document, the provider
  chip reads "via Groq · fast".
- **Multi-column reading order:** two-column layouts (common in designed
  resumes) are detected per page and reassembled column by column — the whole
  left column is read before the right column — so extracted text follows the
  order a human would read, instead of interleaving unrelated lines from both
  columns.
- **Automatic straightening:** uploaded photos are auto-rotated using their
  EXIF orientation (sideways phone shots), and tilted scans are deskewed —
  the tool measures the text tilt and counter-rotates anything between about
  1° and 5° before OCR, which noticeably improves recognition of crooked
  photos of receipts and invoices.

## Reading the results
- Confidence ring: percentage on each field (green ≥90%, amber 70–89%, red <70%).
- "Located" badge: the field's position was found; its box is drawn on the preview.
  Click a box or hover a card to cross-highlight.
- "Flagged" badge: an automatic validation check found an inconsistency (e.g.
  total ≠ subtotal + tax, invoice date after due date, line items not summing
  to the subtotal, bank closing balance not matching opening + credits − debits).
  Hover the badge for the reason.
- "Corrected" badge: the value was fixed — either by the AI's self-correction
  pass or by you editing it.
- "via <Provider>" chip in the header: which AI provider served the extraction
  (Groq, Mistral, Gemini, Cohere; "Groq · fast" means the small fast model
  handled a simple document). "(cached)" means this exact file was analyzed
  before and the stored result was replayed instantly without new AI calls.

## Editing fields (human-in-the-loop)
Hover any field card and click the pencil icon to edit its value. Saving marks
the field "Corrected" (human-verified) and sets confidence to 100%. The card
then shows a small struck-through "AI: <original value>" line underneath your
value, so you can always compare what the AI extracted with what you changed
it to. If you edit the value back to exactly what the AI extracted, the edit
marker disappears. Edits live in your browser session only — they are captured
in exports but reset if you re-upload or refresh.

**The tool learns from corrections.** Every edit is also reported to the
server as an (AI value → human value) pair for that document type. Recent
correction pairs are fed into future extractions of the same document type as
guidance — for example, if users keep correcting an invoice "total" from the
pre-tax to the post-tax figure, the AI is shown those corrections and infers
the pattern for the next invoice. It applies the *pattern*, not the literal
value, so one document's data never leaks into another. This memory is
short-lived by design: it holds the last ~12 corrections per document type,
expires after 7 days, resets when the server restarts, and is not applied to
cached replays of a previously analyzed file.

## Recent documents (history)
Your last 5 analyses are remembered in your browser (localStorage) and listed
in a "Recent documents" card on the upload screen — file name, detected type,
field count and how long ago. Click an entry to restore that analysis
instantly: all extracted fields, the provider chip and the document chat come
back without re-uploading or new AI calls. The page preview image is not
stored (it would exceed browser storage limits), so the preview panel stays
empty on restore. History is stored only on your device — nothing is kept on
the server — and the Clear button removes it entirely. Restored results show
the AI's original extraction, not manual edits made afterwards.

## Ask this document (chat)
After analysis, a chat box appears below the results. Ask free-form questions
about the analyzed document ("What is the total and when is it due?",
"Summarize this document"). Answers come only from the document's content; if
something is not in the document, the assistant says so. Follow-up questions
keep conversation context.

## Export
The Export menu offers JSON (fields with confidence values) and CSV (opens as
a table in Excel, Numbers, Google Sheets). Exports include your manual edits;
in JSON, any field you edited also carries "original_value" (what the AI
extracted) and "human_edited": true, so downstream systems can tell reviewed
values from raw AI output.

## Notes & limits
- Repeat uploads of the same unchanged file return instantly from a server-side
  cache (up to 24 h). Change the file, the document type, or the extra fields
  and it re-analyzes.
- Experience totals on resumes are recomputed deterministically from the career
  timeline periods, excluding employment gaps.
- If all AI providers are temporarily unavailable, an amber warning appears —
  wait a few minutes and try again.
`.trim();

export const DOC_INTEL_SUGGESTIONS = [
  "What does the Flagged badge mean?",
  "How does document history work?",
  "What happens when I edit a field?",
];