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

You can also upload a single photo or image (PNG, JPG, GIF, WEBP) on its own
— no PDF needed. The AI writes a thorough description of everything in it
(subjects, objects, setting, colors, any visible text or numbers), and you
can then ask follow-up questions about that description in the same chat,
just like with a document.

A CSV file works too — its rows and columns are indexed the same way a
PDF's embedded tables are, so you can ask questions about the data directly.

You can also upload a short video (MP4, MOV, WEBM, AVI, MKV). If it has an
audio track, that's transcribed first and indexed as regular text — so you
can ask what was said, not just what's shown. Once a real transcript
exists, only 2 visual frames are sampled (rather than 6): for a
talking-head video the audio already carries the content, so extra frames
mostly just confirm the scene hasn't changed. A silent video, or one whose
audio can't be transcribed, samples the full 6 frames instead, since frames
are then the only available signal. Each sampled frame is described and
OCRed just like a PDF's figures (the caption itself notes what timestamp it
was taken at), and citations are labeled "Video Frame."

The full transcript (not just the chunked pieces used for chat retrieval)
is readable in a video's "▸ summary" panel, timestamped by segment
(e.g. "[0:07] ..."). Download it as a plain .txt file, or as a
timestamped .srt subtitle file. If the video has enough content, a row of
clickable chapter markers (like YouTube's auto-chapters) appears above the
transcript — click one to jump straight to that part. Clicking a
transcript-based citation in the chat also jumps to and highlights the
exact segment it came from. A search box above the transcript highlights
every matching word and lets you step through matches one at a time.

The actual video is also playable right there in the summary panel —
clicking any transcript line, a chapter, or a transcript-based citation
seeks playback to that exact moment, the same way YouTube's transcript
panel works.

For videos with more than one person talking, each transcript segment is
also labeled with who's speaking ("Speaker 1," "Speaker 2," etc.) when
that can be reliably determined — included in the .srt export too. A
video with just one speaker won't show labels, since there's nothing to
distinguish.

## How to use it
0. You can upload more than one file into the same chat — each stays listed
   above the chat with a way to remove it, and questions are answered across
   all of them together, with citations naming which document each part of
   the answer came from. Good for "compare these two reports" style questions.
1. Upload a PDF or an image (max 20 MB; PDFs process their first 8 pages).
   A video's audio is automatically split into smaller pieces for
   transcription if needed, so a longer recording still works within the
   same 20 MB upload limit.
2. Watch the ingestion steps: for a PDF — page extraction → table detection →
   figure captioning → embedding; for a standalone image — captioning →
   embedding. A summary shows how many text, table, figure, or image chunks
   were found.
3. Ask questions in the chat below. Answers stream in with citations you can
   expand to see the source page, content type, and a thumbnail.
4. Clicking a citation jumps the preview panel to that page. A thumbnail
   strip on the far right lets you browse every page of the document on
   your own, independent of citations (hidden for single-page/image
   uploads, since there's nothing else to browse).
5. Click "summary" next to any uploaded document's name to see everything
   extracted from it — every table (shown as an actual table) and every
   figure/image caption — without asking a question first.

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

## Answers keep working even if a provider is busy
Chat answers are generated by an AI provider (Groq, Gemini, Cohere, etc). If
your selected provider is rate-limited or briefly unavailable, the tool
automatically retries with another provider behind the scenes. This only
happens before an answer has started; if a provider fails partway through
writing a response, that's shown as an error rather than silently switched,
since splicing two providers' text together would produce a garbled answer.

A tag above the chat always shows which provider actually generated the
answer. Normally it just says "Answered via X." If your chosen provider
failed and a fallback stepped in, it says so plainly instead — e.g.
"cohere unavailable (rate limited) — answered via groq" — so a different
provider answering is never a silent surprise.

## Using your own API key (optional)
The "Provider" button above the chat lets you pick a specific AI provider
and model, and optionally paste in your own API key for it. This is entirely
optional — the tool works out of the box using shared demo keys, which is
enough for normal use. Bringing your own key is useful if you want a
specific model, or want your usage on a quota you control rather than the
shared demo's. Your key is stored only in your browser (localStorage) and is
sent directly to that provider to generate your answer — never stored on
this server or logged anywhere.

## Reading citations
- Each citation shows its source document, page number, and content type
  (Text / Table / Figure / Image) when known.
- Table citations mean the answer came from a detected table's actual rows
  and columns, not from prose that happened to mention similar numbers —
  shown as a real table, not raw markdown text. A "Download CSV" link above
  the table lets you save those exact rows/columns as a real .csv file.
- Figure and Image citations (including standalone image uploads) mean the
  answer came from an AI-written description of a chart, diagram, or photo,
  PLUS an OCR pass that reads exact text/numbers out of the image (e.g.
  every date in a dense timeline graphic, or every line-item on an invoice)
  — so both the gist and the precise values are searchable, not just a
  summary.
- Click a citation to expand it and see a thumbnail of that page or image.
- A page that mixes real text with an embedded graphic (e.g. a resume with
  a text sidebar plus a chart) gets both extracted: the text as usual, and
  a separate AI caption for the graphic — so image content on an otherwise
  text-heavy page is no longer skipped.
- Expanding a citation also shows a "Show everything else on this page"
  link — click it to see every other text, table, or figure chunk that
  came from that same page, not just the one piece the answer cited.
- If a figure's AI-written caption and its separate OCR pass read a
  different number off the SAME chart or table (e.g. one says "$42M", the
  other reads "$24M"), that citation shows a red "Verify number" warning —
  a sign one of the two misread the value, so check the original page
  before trusting either number. The AI is also told about this directly,
  so its answer will hedge any number drawn from that citation instead of
  stating it as fact.
- If a chunk's own text contains an email address, phone number, SSN, or
  credit card number (common in an uploaded resume or invoice), that
  citation shows an amber "Contains [type]" badge — a heads-up before you
  screenshot or share it, not an automatic redaction. The underlying text
  and the AI's answers are unaffected; only the citation display flags it.

## What it can't do
- PDF, standalone images (PNG/JPG/GIF/WEBP/BMP/TIFF), CSV, and short videos
  (MP4/MOV/WEBM/AVI/MKV) are supported (CSV rows up to 500, video: up to 6
  sampled frames — fewer once a real transcript exists — plus an audio
  transcript when present); DOCX and XLSX are not — see the separate
  Document Intelligence tool for DOCX.
- A video's visual understanding only comes from a handful of sampled
  frames, not every frame — something that flashes on screen briefly
  between samples could be missed, even though the audio transcript (if
  present) covers the entire runtime.
- It won't fabricate an answer that isn't in the document/image — if nothing
  relevant is found, it says so instead of guessing.
- Nothing uploaded here is permanent. For document field extraction with
  human-editable results and export, use Document Intelligence instead.

## Your data is not stored anywhere permanently
The original PDF, image, or CSV you upload is never saved — only the
extracted text, table, figure-caption, or image-caption chunks are indexed.
A video is the one exception: its raw file is kept in memory for this
session only, specifically so you can play it back and click-to-seek in
the transcript — capped to only a few videos in memory at once, evicted
immediately when you remove the document, and never written to disk.
Everything here lives only in this server's temporary memory for as long
as it keeps running. There is no database backup, no export of your file
to any other system, and no persistence layer behind this demo. A server
restart (which can happen at any time on this free-tier demo) wipes
everything — every upload, its chunks, and any "shared" copy — with no way
to recover it. Treat this as a scratch space for trying the tool, not a
place to keep anything you need later.
`.trim();

export const MM_RAG_SUGGESTIONS = [
  "What's the difference between a Table and a Figure citation?",
  "What happens if I turn on 'find visually similar figures'?",
  "Does anything I upload here stay saved?",
];