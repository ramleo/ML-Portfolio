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

As you watch, a smooth density curve appears above the transcript labeled
"Your most re-watched moments (this session)" — every time you scrub the
video back or click a transcript line/chapter to jump to it, that moment
raises the curve there. Example: if you watch straight through once, then
go back twice to re-listen to the 1:20 mark, the curve peaks around 1:20
— a quick visual of what YOU personally rewound to, similar in spirit to
YouTube's "most replayed" graph but scoped to just your own session
(there's no cross-viewer data here to draw on, since each upload is
private to whoever uploaded it). It only appears once you've actually
jumped around at least once; a linear first watch shows nothing yet.

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

## Re-uploading a document you already added
If you upload a file that looks like a newer version of something already
in this chat — same filename, or text that's highly similar even under a
different name — a banner asks you before doing anything: "Replace the old
one, or keep both?" Nothing is ever swapped out automatically. Choosing
"Replace old" removes the earlier version the same way the × button does;
"Keep both" just dismisses the banner and leaves both documents in the
chat. This only compares against documents still in your current session,
never anything from another chat.

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

## Answer length
A "Concise / Normal / Detailed" toggle sits next to the Provider button.
"Concise" asks the AI for the shortest complete answer — 1-3 sentences,
no extra context — good for a quick fact check like "what's the invoice
total?" "Detailed" asks it to explain its reasoning and pull in related
details from the source, good for "walk me through how this pricing table
is structured." "Normal" (default) is unchanged from before this toggle
existed. It only changes how the SAME retrieved information is written up
— it doesn't change what's retrieved or which citations show.

Clicking a different length regenerates the answer you're currently
looking at, in place — you don't need to ask the question again. It
replaces just the last answer bubble; earlier answers in the conversation
keep whatever length they were originally given at.

## Checking your documents for contradictions
Once you've uploaded 2 or more documents into the same chat, a "Check
documents for contradictions" button appears. Click it and the tool scans
your uploaded documents for passages that make a factual claim about the
same specific thing — a date, an amount, a name, a status — but disagree
with each other. Example: one document says a deadline is March 15, a
revision memo says it moved to April 30 — that's flagged, with both
excerpts, their source document, and page number shown side by side, plus
a one-line explanation of what disagrees.

It only flags genuine disagreements, not every passage that happens to
mention a similar topic — two documents stating the same figure in
different words are correctly left alone. It only compares documents
within your current chat session, and only checks a bounded number of the
most topically-similar passage pairs, so it stays fast even with several
documents loaded.

## Only search specific content types
When your document(s) contain more than one kind of content (say a PDF
with both prose and tables), an "Only search: All / Text / Table / Figure
/ Image / Video Frame" row of chips appears above the citations. Selecting
one or more restricts retrieval to just that type — genuinely excluded
before the AI even sees it, not just hidden afterward. Example: click
"Table" before asking "what were the totals" and the AI can only answer
from detected tables, ignoring any prose that happens to mention similar
numbers — useful when you specifically want the structured-data answer,
not a paraphrase from surrounding text. Click "All" to go back to normal.
This only appears when a document actually has 2+ distinct content types
to choose between — a plain-text-only upload has nothing to filter.

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
A citation is the small card under each AI answer that says exactly where
that answer came from — click one to expand it and see more.

- **Source, page, and type.** Each citation shows its source document, a
  page number, and a content type badge — Text, Table, Figure, or Image —
  whenever that's known. Example: ask "what was Q3 revenue?" and the
  citation might read "quarterly-report.pdf · p.4 · Table," meaning the
  number came from an actual detected table on page 4, not a guess.
- **Table citations are real, structured data — and downloadable.** If a
  citation is typed "Table," the answer came from that table's actual rows
  and columns (shown below as a real rendered table, not raw text). A
  "Download CSV" link sits right above it — click it and that exact table
  saves to your computer as a real .csv file you can open in Excel or
  Google Sheets. Example: upload an invoice, ask "what line items are on
  this invoice," get a Table citation, click "Download CSV" — you now have
  the invoice's line items in spreadsheet form without retyping anything.
  When the table has at least one column of real numbers (prices,
  quantities, scores), a "Table / Chart" toggle also appears next to
  Download CSV — switching to "Chart" turns that column into a quick bar
  chart, using whichever non-numeric column (e.g. item name) as labels. If
  a table has more than one numeric column (say Price and Quantity), small
  buttons above the chart let you pick which one to plot. This is view-only
  — it doesn't change the answer or the underlying data, just a faster way
  to eyeball a trend than reading raw numbers.
- **Figure and Image citations combine an AI description with exact OCR
  text.** These mean the answer came from an AI-written description of a
  chart, diagram, or photo, PLUS a separate OCR pass that reads out any
  exact text or numbers visible in the image. Example: a citation for a
  timeline graphic might say "shows quarterly milestones from Jan to Dec"
  (the AI's description) AND list every date printed on the graphic (the
  OCR reading) — so you can ask both "what does this chart show" and
  "what's the exact date next to milestone 3" and get real answers either way.
- **Click to expand and see a thumbnail.** Every citation can be clicked
  open to show a thumbnail of the actual page or image it came from, so
  you can visually confirm it yourself.
- **Mixed pages get both extracted.** A page that has both real text and
  an embedded graphic (e.g. a resume with a text sidebar next to a skills
  chart) is split into two chunks: the text as usual, plus a separate AI
  caption for the graphic — so the chart isn't silently skipped just
  because the page is mostly text.
- **"Show everything else on this page."** Every expanded citation with a
  page number has this link. Example: the AI answers from one paragraph on
  page 3 of your report; click this link on that citation and you'll also
  see the table and the chart caption that came from that same page 3,
  even though the answer only cited the paragraph.
- **"Verify number" warning (red).** Every figure/chart gets both an AI
  description and a separate OCR reading. If the two disagree on a number
  from the SAME image — e.g. the description says "revenue grew to $42M"
  but OCR read "$24M" off the same chart — the citation shows a red
  "Verify number" badge, since one of the two likely misread the value.
  The AI itself is told about the disagreement too, so if it answers using
  that citation it will say the number is uncertain rather than stating
  either figure as fact. Check the original page yourself before trusting
  either number in that case.
- **"Contains [type]" warning (amber).** If a chunk's own extracted text
  contains something like an email address, phone number, Social Security
  Number, or credit card number — common on an uploaded resume or invoice
  — that citation shows an amber "Contains email" (or phone/SSN/card
  number) badge. This is only a heads-up before you screenshot or share
  that citation with someone else; nothing is hidden, masked, or withheld
  — the AI can still see and use that text normally when answering you.
- **"Maybe blurry" note (gray).** Every figure/chart/photo is run through a
  quick sharpness check at upload time (an edge-detail scan, no extra
  model or delay). If it reads low, the citation shows a gray "Maybe
  blurry" badge — a heads-up that the AI's description or OCR reading of
  that specific image might be less reliable than usual, so it's worth a
  quick look at the original. It's a heuristic, not a certainty: a very
  plain, low-detail image can occasionally trip it even when perfectly sharp.
- **Key facts chips.** Expand a citation and you may see small colored chips
  above the source text — amounts, dates, or percentages found in that
  exact chunk (e.g. "$1,245.50", "April 30, 2026", "12.4%"). These are
  pulled out automatically at upload time so you can scan a citation for
  its hard numbers without reading the whole paragraph. Only chunks that
  actually contain one of these show any chips.
- **Groundedness score.** Open "How I searched" under any answer and you'll
  see a Groundedness badge (High/Medium/Low, plus a %) — how well the
  answer's own sentences actually match the retrieved sources, checked
  automatically right after the answer is generated. If a sentence doesn't
  match anything retrieved well, it's listed underneath as "possibly
  unsupported" so you know exactly which part to double-check. It's a
  heuristic based on text similarity, not a fact-checker — a true but
  unusually-worded sentence can occasionally get flagged too.

## Locating objects in an image or video frame
Every standalone image and every sampled video frame is also run through a
closed-vocabulary object detector (601 possible object types — everyday
things like Bicycle, Car, Bus, Backpack, Traffic light, Person, and many
more) once, at upload time — not a fresh AI call every time you ask. So a
question like "where is the bicycle?" or "locate the bus" is answered from
that precomputed list, and the answer describes a coarse position: "spans
most of the frame" for something large/close, or a rough zone like
"top-left," "center," or "bottom-right" for something smaller. This is
intentionally coarse — a phrase, not pixel coordinates — since the model is
meant to place things in general terms, not measure them precisely.

- **The detected object list is baked into the same text the AI reads and
  the same text used to grade the answer.** Earlier versions of this
  feature fed detected objects to the AI separately from what backed the
  "Groundedness" score above, which could make a correct, precise answer
  ("the car spans most of the frame") show up as Low groundedness even
  though it was right — the score just couldn't see where that fact came
  from. That's fixed: the object list is now part of the citation's stored
  text itself, so the answer and its groundedness score are always looking
  at the same thing. Images/videos uploaded before this fix need to be
  re-uploaded to pick it up.
- **A visible bounding box only appears on a clicked citation, and only if
  its labels match your last question.** Click a citation card open (not
  the document "▸ summary" pill — that just opens a plain page preview) and
  the panel on the right can draw a colored box directly on the image. But
  it only draws when the wording of the question you most recently asked
  matches one of THAT SPECIFIC citation's own detected labels. Example: if
  you ask "locate the bicycle" and then click a car photo's citation, no
  box appears — "bicycle" doesn't match anything the detector found in that
  car photo. Click the bicycle photo's own citation instead, or re-ask a
  question that names something actually detected in the image you're
  looking at.
  Two easy ways to end up with no box even when you're looking at the
  "right" image: (1) opening the image via the document's "▸ summary" pill
  instead of clicking an actual citation row — the summary view is a plain
  page preview and never triggers box-matching at all, regardless of what
  you last asked; (2) clicking a citation whose OWN labels don't match your
  last question, even if a different citation earlier in the chat would
  have matched. Concrete example: you ask "locate car" (matched fine
  against a car citation), then click a DIFFERENT citation — the bicycle
  photo's card. No box appears, because the matching always re-checks
  against the citation you just clicked, and "car" isn't one of the
  bicycle photo's detected labels ("Bicycle," "Wheel," "Tire," etc). To see
  a box on the bicycle photo, ask something that names one of ITS labels —
  "where is the bicycle" or "locate wheel" — right before or after clicking
  its citation.
- **A "spans most of the frame" box looks like a thin border, not a tight
  box.** When an object fills most of the photo (common for a single
  product shot or a close-up), the drawn box runs almost all the way around
  the image's edges rather than tightly hugging just the object — easy to
  miss at a glance since it looks similar to the image's own border.
- **The detected list can look repetitive or overlapping.** Because the
  601-type vocabulary includes both general and specific categories (e.g.
  "Wheel," "Bicycle wheel," and "Tire" are all separate types), a single
  wheel in a photo can genuinely trigger more than one of these labels at
  once — that's the detector correctly recognizing the same object under
  several valid category names, not a bug repeating itself. Ask "locate
  object" (no specific name) to see the full raw list it found, deduplicated
  labels and all.
- **It only recognizes what's in its 601-type vocabulary.** Something
  outside that list (a specific brand of an item, an unusual object) won't
  be found or positioned, even if the AI's plain-text caption still
  describes it in words. If a "where is X" question gets a generic
  caption-only answer with no position, X likely wasn't one of the 601
  recognized types.
- **Detected objects and caption details aren't linked to each other.**
  The detector and the AI caption are two separate passes over the same
  image with no shared memory — so a question like "which side is the
  person in the blue jacket on" won't reliably work even if a "Person" was
  detected and the caption mentions a blue jacket, since nothing connects
  that specific detected box to that specific caption detail. The tool will
  say the information isn't available rather than guess.

## Sharing a session
Once you've uploaded a document, a "Share this session" chip appears next
to it. Clicking it warns you first, then gives you a link good for 24
hours. Anyone who opens it lands in a read/chat-only view: they can ask
questions and see citations, but can't upload, delete, or re-share. Three
protections apply automatically to that view, none of which touch your own:
1. **Locked to first opener.** Whoever's network opens the link first is
   the only one it works for afterward — forwarding it to someone else
   won't extend access to them.
2. **PII hidden from the AI and the citations.** Anything the detector
   flags (email, phone, SSN, credit card number) is replaced with a
   placeholder like "[REDACTED EMAIL]" before it reaches the shared
   viewer's AI answers or citation text — the AI genuinely can't repeat
   it back to them, no matter how the question is phrased.
3. **Traceable watermark.** A faint, repeating tag (the link's ID and the
   date) is stamped across the shared view's chat and citations. It can't
   stop someone from screenshotting the page, but it means a leaked
   screenshot can be traced back to which link produced it.

You can cut off access at any time with the "Revoke" button, independently
of deleting the document yourself; the link also stops working on its own
after 24 hours either way. A shared viewer's citation cards work the same
as yours otherwise, but the page-image preview and per-document summary
panel are only available in the tab that did the uploading — the share
link carries chat access, not the full workspace.

## Usage stats
A "Usage stats" button in the header opens a dashboard in a pop-up panel,
right here on this page — it never navigates away or disturbs your
current upload/chat session. It shows total uploads by file type, total
questions asked, average answer time, cache hit rate, and which AI
provider actually served each answer (shown as an interactive donut
chart — hover a slice or its legend entry to see that provider's exact
count and share). It only ever shows aggregate counts, never anything
about what any specific person uploaded or asked. Like every upload on
this tool, the numbers reset to zero the next time this demo server
restarts — nothing here is a permanent record.

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
  "How does the contradiction check between documents work?",
];