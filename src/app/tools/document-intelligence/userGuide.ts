// User guide for Document Intelligence — rendered nowhere yet, but injected
// into the floating AI Assistant as its ONLY tool knowledge. Keep factual and
// in sync with the actual feature set.

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
  (Groq, Mistral, Gemini, Cohere). "(cached)" means this exact file was analyzed
  before and the stored result was replayed instantly without new AI calls.

## Editing fields (human-in-the-loop)
Hover any field card and click the pencil icon to edit its value. Saving marks
the field "Corrected" (human-verified) and sets confidence to 100%. Edits live
in your browser session only — they are captured in exports but reset if you
re-upload or refresh.

## Ask this document (chat)
After analysis, a chat box appears below the results. Ask free-form questions
about the analyzed document ("What is the total and when is it due?",
"Summarize this document"). Answers come only from the document's content; if
something is not in the document, the assistant says so. Follow-up questions
keep conversation context.

## Export
The Export menu offers JSON (fields with confidence values) and CSV (opens as
a table in Excel, Numbers, Google Sheets). Exports include your manual edits.

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
  "What file formats are supported?",
  "What does the Flagged badge mean?",
  "How do custom extra fields work?",
];