export const MM_RAG_DOCUMENT_TOOLS = `
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
The same row also lets you filter by the key-fact type a chunk contains —
Money, Date, Percent, Person, Organization, or Location — once at least
one uploaded chunk has one, for narrowing down to (say) only chunks that
name a specific person or company.

## Using your own API key (optional)
The "Provider" button above the chat lets you pick a specific AI provider
and model, and optionally paste in your own API key for it. This is entirely
optional — the tool works out of the box using shared demo keys, which is
enough for normal use. Bringing your own key is useful if you want a
specific model, or want your usage on a quota you control rather than the
shared demo's. Your key is stored only in your browser (localStorage) and is
sent directly to that provider to generate your answer — never stored on
this server or logged anywhere.
`.trim();