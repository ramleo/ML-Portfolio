// User guide for Multimodal RAG — rendered in MmRagUserGuideModal (the "User
// Guide" header button) AND injected into the floating AI Assistant as its
// ONLY tool knowledge. Keep factual and in sync with the actual feature set.

export const MM_RAG_GUIDE = `
# Multimodal RAG — User Guide

## What this tool does
Upload a PDF that mixes prose, tables, and charts/figures — a quarterly
report, a research paper, a spec sheet — and ask questions about it. Unlike
plain text search, this tool reads tables as structured data and writes an AI
description of every chart or photo, so it can answer questions whose answer
lives in a number buried in a table or a trend shown in a chart, not just in
paragraphs. Every answer cites the page and content type (text, table, or
figure) it came from.

## How to use it
1. Upload a PDF (max 10 MB, first 8 pages are processed).
2. Watch the ingestion steps: page extraction → table detection → figure
   captioning → embedding. A summary shows how many text, table, and figure
   chunks were found.
3. Ask questions in the chat below. Answers stream in with citations you can
   expand to see the source page, content type, and a thumbnail.

## Two upload choices, both with real tradeoffs
- **Find visually similar figures (optional)**: off by default. Turning it on
  additionally encodes each figure/chart image with a small image-recognition
  model, adding a "find similar figures" button to figure citations. This
  does NOT change how chat questions are answered — captions always power
  that — it only adds a bonus visual-search feature. Downloads an extra model
  the first time it's used and adds a few seconds per figure during upload.
- **Sharing scope**: "Session only" (default) means only you can query what
  you uploaded, and it's gone if you refresh. "Share with all visitors right
  now" makes it queryable by anyone using the tool while this server keeps
  running — useful for showing a document to someone else in the same
  sitting. Neither option is permanent: this demo runs without persistent
  storage, so a server restart clears everything uploaded, shared or not.

## Reading citations
- Each citation shows its source document, page number, and content type
  (Text / Table / Figure) when known.
- Table citations mean the answer came from a detected table's actual rows
  and columns, not from prose that happened to mention similar numbers.
- Figure citations mean the answer came from an AI-written description of a
  chart, diagram, or photo — retrieval quality here depends on how well that
  description captures the image, so very unusual charts may be harder to
  find than a table's exact numbers.
- Click a citation to expand it and see a thumbnail of that page.

## What it can't do
- Only PDF is supported for multimodal ingestion (not DOCX/images — see the
  separate Document Intelligence tool for those).
- It won't fabricate an answer that isn't in the document — if nothing
  relevant is found, it says so instead of guessing.
- Nothing uploaded here is permanent. For document field extraction with
  human-editable results and export, use Document Intelligence instead.

## Your data is not stored anywhere permanently
The original PDF file itself is never saved — only the extracted text,
table, and figure-caption chunks are indexed, and only in this server's
temporary memory/disk for as long as it keeps running. There is no database
backup, no export of your file to any other system, and no persistence
layer behind this demo. A server restart (which can happen at any time on
this free-tier demo) wipes everything — your upload, its chunks, and any
"shared" copy — with no way to recover it. Treat this as a scratch space for
trying the tool, not a place to keep anything you need later.
`.trim();

export const MM_RAG_SUGGESTIONS = [
  "What's the difference between a Table and a Figure citation?",
  "What happens if I turn on 'find visually similar figures'?",
  "Does anything I upload here stay saved?",
];