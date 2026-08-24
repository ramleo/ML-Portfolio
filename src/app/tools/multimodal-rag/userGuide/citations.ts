export const MM_RAG_CITATIONS = `
## Reading citations
A citation is the small card under each AI answer that says exactly where
that answer came from — click one to expand it and see more.

- **"Directly cited" vs "Additional context."** When an answer only actually
  used some of what was retrieved, the Evidence column splits into two
  labeled groups instead of one flat list: "Directly cited" (what the
  answer's citations point to) and "Additional context (not used in this
  answer)" (other relevant passages that were retrieved but didn't end up
  backing anything the answer said). If everything retrieved was used, you
  just see one plain list — the split only appears when there's a real
  difference to show.
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
- **"Read aloud" plays a citation's caption as speech.** Open "Choose an
  action…" on an image/video citation and pick "Describe (caption + OCR)" —
  once the caption text appears, a "Read aloud" button sits right above it.
  Click it to hear that description spoken using your browser's own
  text-to-speech voices (entirely on your device, no server call); click
  "Stop reading" to cancel partway through. Only one citation reads at a
  time — starting another automatically stops whichever was already playing.
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
  that citation with someone else — in your own session nothing is hidden,
  masked, or withheld, and the AI can still see and use that text normally
  when answering you. A shared-link viewer (see "Sharing a session" below)
  sees this differently: those flagged types are actually redacted from
  what reaches them, not just flagged.
- **"Maybe blurry" note (gray).** Every figure/chart/photo is run through a
  quick sharpness check at upload time (an edge-detail scan, no extra
  model or delay). If it reads low, the citation shows a gray "Maybe
  blurry" badge — a heads-up that the AI's description or OCR reading of
  that specific image might be less reliable than usual, so it's worth a
  quick look at the original. It's a heuristic, not a certainty: a very
  plain, low-detail image can occasionally trip it even when perfectly sharp.
- **"Sharpen image (AI)" / "Sharpen region…" buttons.** Always available
  above any citation's own image (a page image has to exist — same
  requirement as "Draw region"), not just when the "Maybe blurry" badge
  shows: that badge is a whole-image average, so a photo that's mostly sharp
  with only a small blurry patch (a deliberately blurred logo/plate on an
  otherwise crisp product shot, say) never trips it even though there's real
  blur to fix. "Sharpen image (AI)" enhances the whole photo; "Sharpen
  region…" instead lets you drag a box around just the blurry part (same
  click-and-drag as "Draw region") — only that box is sent to the model and
  pasted back, so every pixel outside it is left byte-for-byte untouched, no
  matter what the model does inside the box. A progress bar shows under the
  image while a call is running. Once you have a result, a "View original /
  View sharpened" toggle lets you compare, and you can re-sharpen (whole or
  a different region) any time without starting over.
  This is a generative edit (an AI model re-renders a crisper version), not
  a mathematical fix, so it can occasionally invent plausible-looking detail
  instead of admitting a spot is unreadable — seen live on a real photo
  where a blurred license plate came back with invented text (a DIFFERENT
  invented reading on each independent attempt, which is exactly how this
  was caught).
  A region sharpen specifically corroborates itself before trusting a
  reading: it runs the AI TWICE independently on your selected box and OCRs
  each result. If both readings agree, the caption shows the confirmed text
  directly (still labeled to verify against the original); if they
  disagree, that disagreement IS the finding — the caption switches to an
  explicit "likely unreliable, do not trust this detail" warning rather than
  showing either guess as if it were real. This check only applies to actual
  text — selecting a logo, icon, or other non-text graphic correctly falls
  back to a different caption instead of a false "disagreed" warning, since
  OCR was never going to read text off a picture either way: a separate
  vision-model call looks at the sharpened region and names what it actually
  is (e.g. a specific brand or logo it recognizes), shown as "Identified as:
  ..." — this is a single AI opinion, not a corroborated reading like the
  text case above (there's no independent-agreement check for a free-text
  description), so it's always labeled unverified rather than confirmed. If
  even that call comes back empty, it falls back to the plain generic
  caption. A whole-image sharpen doesn't run either check at all (it's for
  general clarity, not reading or identifying one specific detail) and
  always keeps the plain caption. Either way, the sharpened view is never
  used as the base for
  other edits (removing objects) but CAN be downloaded — "Download" (next to
  the sharpen buttons) saves whichever version is currently on screen,
  original or sharpened.
  A region sharpen takes longer than a whole-image one (it's up to four
  calls, not one) — while it's running, the buttons are replaced by a single
  "Cancel sharpening" if you don't want to wait; a "temporarily unavailable"
  message means one of the calls failed on its own. Your drawn box gets a
  small automatic margin (not literally pixel-exact) so text you selected
  slightly too tight doesn't get clipped at the edge.
- **Key facts chips.** Expand a citation and you may see small colored chips
  above the source text — amounts, dates, percentages, people, organizations,
  or locations found in that exact chunk (e.g. "$1,245.50", "April 30, 2026",
  "12.4%", "Acme Corp"). Amounts/dates/percentages are pulled out with pattern
  matching; people/organizations/locations use a small local name-recognition
  model — both run automatically at upload time, so you can scan a citation
  for its key facts without reading the whole paragraph. A chunk mentioning
  an unusually long list caps at 8 chips with a "+N more" tail rather than
  crowding the citation. Only chunks that actually contain one of these show
  any chips.
- **Domain-term chips (legal / financial / medical).** The same chip row can
  also surface contract-clause language ("indemnification," "force majeure,"
  "non-compete"), accounting/finance terms ("EBITDA," "accounts receivable,"
  "working capital"), or medical-condition names ("diabetes," "hypertension")
  when a chunk mentions one. All three are matched against curated term
  lists, not a trained model — the medical category in particular is a plain
  keyword spotter for condition NAMES only (not symptoms, dosages, or drug
  names) and is not a diagnostic tool or clinically validated in any way.
- **Groundedness score.** Open "How I searched" under any answer and you'll
  see a Groundedness badge (High/Medium/Low, plus a %) — how well the
  answer's own sentences actually match the retrieved sources, checked
  automatically right after the answer is generated. If a sentence doesn't
  match anything retrieved well, it's listed underneath as "possibly
  unsupported" so you know exactly which part to double-check. It's a
  heuristic based on text similarity, not a fact-checker — a true but
  unusually-worded sentence can occasionally get flagged too. The badge is
  simply absent (not shown at all) for an answer in a non-English script
  (Hindi, Telugu, Chinese, Arabic, etc.) — the similarity check compares
  text using an English-centric model, which can't reliably tell a correct
  translation from an unrelated sentence once the script changes. Rather
  than risk showing a misleadingly low score on an accurate answer, it
  skips the check entirely and shows nothing — a deliberate "we chose not
  to guess," not a bug or a missing feature. (If you're looking at the raw
  API response instead of the UI, this is the groundedness field coming
  back as null for that answer.)
- **Self-correction on a weak score.** A "Low" groundedness score — or a
  "Medium" one with specific sentences flagged — triggers one automatic
  fix attempt before you're done reading. You may briefly see an answer
  start streaming in, then watch it clear and restart: that's the retry
  replacing the first attempt, not a glitch. The retry isn't a blind
  do-over — the model is told exactly which of its own sentences didn't
  match the evidence and asked to fix or drop only those, using a
  broadened set of already-retrieved candidates (no extra retrieval
  delay). A small "Self-corrected once" tag appears next to the
  Groundedness badge when this happened; hover it for the same
  explanation. It only ever fires once per answer, and only keeps the
  retry if it scores no worse than the original — a weak-but-complete
  first answer is never swapped for something worse.
- **Ask in your own language.** You don't need to ask in English — type
  your question in whatever language you're comfortable with (Hindi,
  Telugu, Spanish, French, etc.) and the answer comes back in that same
  language, translated from the underlying English captions/transcripts on
  the fly. Citations and the retrieved source text itself stay in their
  original (usually English) language either way — only the written answer
  adapts. Expect no Groundedness badge on these answers, for the reason
  above.
- **"Why was this cited?" trace.** Expand a citation and, below the source
  text, a "Why was this cited?" link opens the actual retrieval signals
  behind that specific citation's rank — not just that it was picked, but
  which of several independent search methods found it and how confidently.
  Up to four signals can run on a question, each shown as its own colored
  chip when it contributed: **dense** (semantic search — matches meaning,
  even with different wording), **keyword** (matches exact terms, even rare
  ones the semantic model might gloss over), **vision** (image-embedding
  search — matches a photo or chart by what it visually looks like, not just
  its caption text; only runs against uploads containing figures/images),
  and **graph** (matches because this chunk and your question share the
  exact same specific value — a dollar amount, date, percentage, person, or
  organization name — a stronger signal than a topical match when your
  question names one precise fact). A citation shows whichever of these
  actually surfaced it, its raw score, and its rank within that method's own
  results — some citations are found by several signals at once, some by
  only one. Hover a chip for a one-line explanation of what it means.

  The wording of your question also tilts how much each signal counts
  before ranking happens — a question naming a specific number, date, or
  name leans on the graph signal more; a question about a color, chart, or
  photo leans on vision more; a short exact-phrase lookup leans on keyword;
  a broader question leans on semantic/dense — so a citation that would
  otherwise rank lower can outrank a superficially "closer" match once your
  question's own phrasing is accounted for. When your question's wording
  also suggested a specific content type (e.g. asking about a "table" or
  "chart"), a separate boost multiplier shown here explains why a short
  table/figure citation outranked a longer passage that would otherwise
  dominate. A final relevance percentage shows the last check applied — an
  actual re-read of the citation against your exact question, which is what
  really decided its final rank and whether it made the cut at all. This
  section only appears when at least one of these signals was actually
  tracked for that citation — a cached answer (repeating an earlier
  question) doesn't carry the original trace, so it's omitted rather than
  shown empty.
  Clicking it never re-runs anything — it just reveals numbers already sent
  with that specific answer, a frozen snapshot of that one retrieval run.
  Those numbers can look different for the SAME document across different
  questions, and that's expected, not a bug: every question re-scores and
  re-ranks against whatever's in the candidate pool at that moment. Example:
  a bicycle photo's citation might rank #1 with a high semantic score when
  it's the only document uploaded, then show a lower score and #2 rank on a
  later question after a car photo (or any other document) joins the chat —
  it's now being scored and ranked alongside genuinely more candidates, not
  because anything about the bicycle photo itself changed.
`.trim();