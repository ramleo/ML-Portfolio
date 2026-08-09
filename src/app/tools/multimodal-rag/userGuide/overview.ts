export const MM_RAG_OVERVIEW = `
## What this tool does
Upload a PDF that mixes prose, tables, and charts/figures — a quarterly
report, a research paper, a spec sheet — and ask questions about it. Unlike
plain text search, this tool reads tables as structured data and writes an AI
description of every chart or photo, so it can answer questions whose answer
lives in a number buried in a table or a trend shown in a chart, not just in
paragraphs. Every answer cites the page and content type (text, table, or
figure) it came from. A page with two unrelated visuals — say, a chart and
a company logo — gets each one described and cited separately instead of
blended into one caption, so an answer about the chart doesn't accidentally
pull in details from the logo sitting next to it. A row of several small
images that only make sense together — a career timeline of company
logos, for instance — is recognized as one group and captioned as such,
even though no single logo in it is large enough to trigger captioning on
its own. When a chart has genuinely readable numeric values — printed data
labels, or bar heights read against the axis scale — those values are
pulled out as their own little data table alongside the prose description,
so a precise question ("what was Q3 revenue, exactly") gets answered from
the real extracted number, not the AI's rough paraphrase of the chart.
That table shows up as its own citation, downloadable as CSV and plottable
as a mini bar chart, exactly like a table pulled straight from the
document. This depends on the AI reading the chart correctly — a chart
with clear printed data labels is reliable; one with no data labels at
all (values only readable by judging bar height against the axis), a
rotated/cramped axis, a log scale, or overlapping bars is inherently
harder to read accurately and hasn't been extensively tested. Treat an
extracted chart value the same as any other AI-read number: quick to
check against the original if the answer matters.

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
are then the only available signal. Those frames aren't just evenly spaced
in time — the video is scanned for real scene changes first (comparing
frames in the frequency domain, the same technique behind the blur-quality
check), so a video with a couple of distinct shots samples near where they
actually change instead of risking 6 near-duplicate frames of the same
shot. A video with no clear scene changes (a static talking-head shot)
falls back to plain even spacing. Each sampled frame is described and
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
panel works. A citation for a captioned video FRAME (something visual, not
spoken — e.g. "what's written on the whiteboard") jumps and seeks the same
way, straight to the exact second that frame was sampled from, even though
there's no transcript segment behind it.

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
   figure/image caption — without asking a question first. Whenever there's
   substantial extracted text to show (a PDF, CSV, or standalone image, not
   just a video's transcript), the same search-as-you-type box described
   above for videos appears here too — highlighting every match and letting
   you step through them one at a time.
`.trim();