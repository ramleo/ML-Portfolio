## What problem it solves

A language model knows what was in its training data, up to a cut-off, and
nothing about your PDF. Ask it about your document and it will either refuse or
invent — and inventing is the dangerous option, because a fabricated answer
reads exactly like a real one.

**Retrieval-Augmented Generation** fixes this by changing the question. Instead
of *"what do you know about X?"* it becomes *"here are the relevant passages
from this document — answer using only these, and say where each claim came
from."* The model stops being a knowledge store and becomes a reader.

The **multimodal** part is what makes this tool harder than a standard RAG
demo. A real document is not a stream of paragraphs. The number you want is in
the third column of a table, or it is the height of a bar in a chart, or it is
in a photograph's caption. A pipeline that only indexes prose is blind to
exactly the content people put in documents because it is important.

## How it works, step by step

### Ingest

1. **Parse the PDF** into three kinds of content: **prose, tables and figures**
   — the "3 chunk types" on the tool's card.
2. **Tables are kept as structure**, not flattened into a word stream, so which
   number belongs to which row survives.
3. **Figures get a written caption** from a vision model, which is what makes a
   chart searchable at all: you cannot embed a picture into the same space as a
   question, but you can embed a sentence describing it.
4. **Prose is chunked** at **450 words with 45 words of overlap**.
5. **Everything is indexed twice** — as embeddings in ChromaDB, and as tokens in
   a BM25 index.

### Query

6. **Route.** A cheap model decides whether the question is *simple* or
   *complex*.
7. **Decompose,** on the complex route only, into sub-questions.
8. **Retrieve** — dense and sparse in parallel, merged.
9. **Grade.** A model judges whether the retrieved chunks actually help:
   `good`, `rewrite`, or `websearch`.
10. **Loop or escalate.** `rewrite` reformulates the query and retrieves again;
    `websearch` goes outside the document.
11. **Generate,** with the chunks as context and citations required.
12. **Check the answer against its sources** and report how grounded it is.

## The model or algorithm

### Why the overlap exists

450-word chunks with 45 words of overlap. The overlap is not padding — it is
insurance against the boundary problem. A fact stated across a chunk boundary is
split in half, and neither half retrieves well. Ten percent overlap means every
boundary region appears whole in one of the two chunks.

### Hybrid retrieval — dense and sparse

**Dense retrieval** embeds the question and finds the nearest chunk vectors.
It matches *meaning*: "how do I stop overfitting" finds a passage about
regularisation with no shared words.

**BM25** is the classic sparse method — a bag-of-words score built on term
frequency and inverse document frequency, with two refinements that matter:
term frequency **saturates**, so the tenth occurrence of a word adds far less
than the second, and the score is **normalised for document length**, so a long
chunk does not win by containing more words.

They fail in opposite directions, which is exactly why both are used. Dense
retrieval is bad at rare exact tokens — a part number, an error code, an unusual
surname — because those are poorly represented in the embedding space. BM25 is
bad at synonyms. Neither is reliably better; the union is much better than
either.

### Reciprocal Rank Fusion

Merging two ranked lists is not obvious, because their scores are not
comparable: a cosine similarity of 0.82 and a BM25 score of 14.3 live in
different units, and normalising them requires assumptions that do not hold.

RRF sidesteps this by **throwing the scores away and using only the ranks**:

```
score(d) = Σ over lists of  boost × weight / (rank + k)      k = 60
```

A document ranked 1st contributes 1/61; ranked 2nd, 1/62. The differences are
small and the curve is flat, which is the point — it says *"being near the top of
several lists matters more than being at the very top of one"*, and it cannot be
fooled by one retriever's score scale. `k = 60` is the value from the original
paper, and its effect is to flatten the curve so ranks 1 and 5 are not wildly
different.

This implementation adds two things to the standard formula.

**A per-chunk-type boost.** Table, figure and image chunks are structurally
short — a caption, or a table's own text — so they are weaker dense *and* BM25
matches than verbose prose even when they are the right answer. The boost
multiplies their contribution to correct for a disadvantage that comes from
their shape rather than their relevance. Without it, the multimodal content this
tool exists to surface loses to paragraphs.

**A per-list weight,** so a question classified as visual can trust the vision
signal's votes more. The docstring is careful about what this is: *"a tilt, not
a filter — an unlisted label defaults to 1.0, never zero, so a wrong
classification degrades gracefully instead of blinding the pipeline to a
signal."* That is the right instinct for any routing heuristic — a
misclassification should cost you some ranking quality, never a whole retrieval
channel.

### Why was this cited? — the retrieval trace

Optionally, fusion records **one label per input list**, so each merged chunk
carries a trace: this chunk was rank 3 in dense with score 0.71 and rank 1 in
BM25 with score 12.4, its type boost was 1.3, and its hybrid score before any
reranking was 0.031.

This is harder than it sounds because the pipeline **overwrites `score`**
repeatedly — an outer fusion pass, then a reranker. So the trace preserves
`hybrid_score` separately, and the labels argument is deliberately **omitted on
outer fusion passes** so an inner pass's trace survives instead of being
replaced. Threading intermediate values through a pipeline whose later stages
overwrite its earlier ones is the actual engineering problem, and the solution
is to give the value you want to keep a name nothing else writes to.

### The agent loop

Five nodes, in a LangGraph state machine:

| Node | Job |
|---|---|
| **router** | simple or complex? |
| **decompose** | complex only — split into sub-questions |
| **retrieve** | hybrid retrieval |
| **grade** | `good` / `rewrite` / `websearch` |
| **rewrite** | reformulate and go round again |

Two details are worth pointing at.

**The grader sees truncated chunks.** Each is cut to 200 characters, and the
comment says why: it saves roughly 400 tokens per call. The grader is deciding
*relevance*, not answering — and the first 200 characters are enough for that.
Cheap where cheap is sufficient, so the budget goes to the generation step that
needs it.

**Every node fails toward "continue".** The router defaults to `complex` if it
errors, the grader defaults to `good`, the rewriter falls back to the original
query, and the decomposer falls back to the unsplit question. Each failure is
logged. The principle: **a meta-step that fails should degrade the answer's
quality, never prevent an answer.** The alternative — a rate-limited router
taking down the whole query — is far worse than one that occasionally takes the
expensive route unnecessarily.

**CRAG** is the escalation. When the grader says the topic is outside the
knowledge base, the pipeline searches the web (Tavily, with a DuckDuckGo
fallback) and cites those results instead — better than answering from nothing.

### Groundedness — checking the answer against its sources

After generation, the answer is split into sentences, and each is embedded and
compared against the source chunks. A sentence with no similar source sentence
is flagged as ungrounded.

**Two real bugs shaped this, and both are recorded in the code.**

**Sources are split into sentences too, not embedded whole.** A car photo's
chunk mixed a long appearance description with one short trailing spatial fact.
Embedding the whole chunk as one vector averaged that fact away under the longer
unrelated text — so the correct answer *"the car spans most of the frame"*
scored *below* an unrelated bicycle photo whose chunk happened to be mostly
spatial content already. Splitting the source into sentences lets a short
factual answer match its one relevant source sentence directly instead of an
entire diluted paragraph. **The general lesson: an embedding of a long mixed
passage is an average, and averages hide short specific facts.**

**Non-English answers were being falsely flagged.** The similarity threshold was
calibrated on English; a correct Hindi answer grounded in an English source
scored 0.185 — well inside "unsupported" — purely because of the script gap. The
fix is a script-mismatch check: if the answer is largely non-ASCII and the
sources are not, groundedness returns `None` rather than a misleading low score.
Refusing to score is the honest option when the measure does not apply.

The thresholds themselves were calibrated against measured examples, not chosen:
sentences genuinely paraphrasing their source scored 0.44–0.94; fabricated
unrelated sentences scored 0.10–0.36.

## Why these choices

**Why embedding similarity for groundedness rather than an LLM judge.** It costs
nothing extra and adds no latency, and the docstring is explicit that the
trade-off is some false positives — a correct sentence phrased very differently
also scores low. It is also written so that swapping in an LLM judge later only
needs to preserve one function's signature.

**Why the meta-calls use the cheapest model.** Routing, grading and rewriting
are one-word decisions. Spending the good model on them and the cheap one on the
answer would be exactly backwards.

**Why captions for figures rather than image embeddings.** A caption lives in
the same text space as the question, so it retrieves with the same machinery as
everything else. No second index, no cross-modal embedding model.

**Why table structure is preserved.** Flattening a table into words destroys the
row-column relationship, which is the only thing that makes a number in a table
meaningful.

## How to read the output

- **Read the citation, not just the answer.** The page reference is the point of
  the whole system.
- **A low groundedness score means check it** — the answer contains sentences
  that do not match anything retrieved. It does not prove the answer is wrong.
- **No groundedness score at all** can mean the answer was in a different script
  from the sources, where the measure does not apply.
- **A cited table or figure** means the answer came from structured or visual
  content, which is the tool working as intended.
- **The retrieval trace answers "why this chunk"** — whether it won on meaning,
  on exact words, or on both.
- **A web-search citation** means the grader decided your document did not cover
  the question.

## Limits

- **Retrieval quality is the ceiling.** If the right chunk is not retrieved, no
  amount of model quality recovers it. Most "the model got it wrong" cases in
  RAG are retrieval failures.
- **Chunking splits arguments.** 450 words with 45 of overlap handles the
  boundary case, not a claim spread across three pages.
- **Figure captions are a lossy summary.** What the vision model did not mention
  is not findable.
- **Groundedness is similarity, not entailment.** A correct paraphrase can score
  low; a fluent sentence that reuses source vocabulary while stating the
  opposite can score high.
- **The router and grader are heuristics** that fail toward continuing, so a bad
  classification costs money or quality, not an answer.
- **CRAG's web results are unvetted.**
- **Multi-hop reasoning is limited** to what decomposition catches.

## Likely interview questions

**"Why hybrid retrieval instead of just embeddings?"**
Because they fail in opposite directions. Dense retrieval matches meaning but is
bad at rare exact tokens — part numbers, error codes, unusual names — since those
are poorly represented in the embedding space. BM25 nails exact terms and is
blind to synonyms. Neither dominates, so the union beats both, and the only real
question is how to merge two ranked lists whose scores are not comparable.

**"How do you merge them, then?"**
Reciprocal Rank Fusion — throw the scores away and use ranks: sum `1/(rank + 60)`
across lists. It is scale-free, so a cosine similarity and a BM25 score never
have to be reconciled, and the flat curve encodes "near the top of several lists
beats top of one". I added a per-chunk-type boost on top, because table and
figure chunks are short and therefore structurally weaker matches than prose
even when they are the right answer.

**"How do you know the model isn't hallucinating?"**
Two things. Citations, so every claim points at a chunk a person can check. And
a groundedness score: split the answer into sentences, embed each, and compare
against the source sentences — anything with no similar source is flagged. It is
similarity rather than entailment, so it has false positives, and I would say so
rather than present it as a hallucination detector.

**"What was the hardest bug in this?"**
Groundedness scoring a correct answer as unsupported. A photo's chunk mixed a
long appearance description with one short spatial fact; embedding that whole
chunk as one vector averaged the fact away, so the right answer scored below an
unrelated photo. The fix was to split the *source* into sentences as well as the
answer. The lesson generalises: an embedding of a long mixed passage is an
average, and averages hide short specific facts.

**"How do you handle a table in a PDF?"**
Keep its structure rather than flattening it into text, index it as its own
chunk type, and boost that type during fusion so its shortness does not cost it
the ranking. Flattening is the common shortcut and it destroys the row-column
relationship, which is the only thing that makes a number in a table mean
anything.

**"Your router misclassifies a question. What happens?"**
It takes the wrong path and costs some quality or some money, and that is
deliberate. Every meta-node fails toward continuing — the router defaults to the
complex route, the grader to `good`, the rewriter to the original query — and the
list weights are a tilt rather than a filter, with unlisted labels defaulting to
1.0 rather than zero. A misclassification should never blind the pipeline to a
retrieval channel or stop an answer being produced.
