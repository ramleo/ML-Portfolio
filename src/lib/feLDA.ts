// ── LDA (Latent Dirichlet Allocation) via Collapsed Gibbs Sampling ────────────

export interface LDATopicResult {
  topicColumns: { name: string; values: number[] }[];
  topWords: { topic: number; words: string[]; weights: number[] }[];
  vocabulary: string[];
  nTopics: number;
}

const STOPWORDS = new Set([
  'the','a','an','is','are','was','were','be','been','have','has','had',
  'do','does','did','will','would','could','should','may','might','can',
  'to','of','in','for','on','with','at','by','from','up','about','into',
  'and','but','or','not','this','that','it','its','we','you','he','she',
  'they','i','my','your','his','her','our','their','as','so','if','then',
  'than','when','what','which','who','how',
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length >= 2 && !STOPWORDS.has(w));
}

function buildVocab(docs: string[][], cap = 500): string[] {
  const freq: Record<string, number> = {};
  for (const doc of docs) {
    for (const w of doc) freq[w] = (freq[w] ?? 0) + 1;
  }
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, cap)
    .map(([w]) => w);
}

// Simple LCG random (deterministic, no external deps)
function makeLCG(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function runLDA(
  texts: string[],
  nTopics: number,
  nIter: number,
  nTopWords: number,
): LDATopicResult {
  const MAX_ROWS = 1000;
  const safeTexts = texts.slice(0, MAX_ROWS);
  const D = safeTexts.length;
  const K = nTopics;
  const ALPHA = 0.1;
  const BETA  = 0.01;

  // 1. Tokenize
  const tokenizedDocs = safeTexts.map(tokenize);

  // 2. Build vocabulary (cap 500 most frequent)
  const vocab = buildVocab(tokenizedDocs);
  const wordIndex = new Map(vocab.map((w, i) => [w, i]));
  const V = vocab.length;

  // 3. Build doc-word id lists (filter to vocab)
  const docWords: number[][] = tokenizedDocs.map(doc =>
    doc.map(w => wordIndex.get(w)).filter((id): id is number => id !== undefined)
  );

  // 4. Init counts
  const docTopic  = Array.from({ length: D }, () => new Array<number>(K).fill(0)); // [D][K]
  const wordTopic = Array.from({ length: V }, () => new Array<number>(K).fill(0)); // [V][K]
  const topicTotal = new Array<number>(K).fill(0);                                  // [K]
  const docLen     = docWords.map(d => d.length);

  // Per-token topic assignments
  const assignments: number[][] = [];
  const rng = makeLCG(42);

  for (let d = 0; d < D; d++) {
    const docAssign: number[] = [];
    for (const w of docWords[d]) {
      const k = Math.floor(rng() * K);
      docAssign.push(k);
      docTopic[d][k]++;
      wordTopic[w][k]++;
      topicTotal[k]++;
    }
    assignments.push(docAssign);
  }

  // 5. Gibbs iterations
  for (let iter = 0; iter < nIter; iter++) {
    for (let d = 0; d < D; d++) {
      const words = docWords[d];
      for (let ti = 0; ti < words.length; ti++) {
        const w = words[ti];
        const oldK = assignments[d][ti];

        // Remove token
        docTopic[d][oldK]--;
        wordTopic[w][oldK]--;
        topicTotal[oldK]--;

        // Compute proportional probabilities
        const probs = new Array<number>(K);
        let sum = 0;
        for (let k = 0; k < K; k++) {
          probs[k] =
            (docTopic[d][k] + ALPHA) *
            (wordTopic[w][k] + BETA) /
            (topicTotal[k] + V * BETA);
          sum += probs[k];
        }

        // Sample new topic
        let r = rng() * sum;
        let newK = K - 1;
        for (let k = 0; k < K; k++) {
          r -= probs[k];
          if (r <= 0) { newK = k; break; }
        }

        // Reassign
        assignments[d][ti] = newK;
        docTopic[d][newK]++;
        wordTopic[w][newK]++;
        topicTotal[newK]++;
      }
    }
  }

  // 6. Compute theta[d][k] (document-topic distributions)
  const topicColumns = Array.from({ length: K }, (_, k) => ({
    name: `lda_topic_${k}`,
    values: Array.from({ length: D }, (__, d) => {
      const denom = docLen[d] + K * ALPHA;
      return denom > 0
        ? parseFloat(((docTopic[d][k] + ALPHA) / denom).toFixed(6))
        : 0;
    }),
  }));

  // 7. Compute phi[k][w] and extract top words per topic
  const topWords = Array.from({ length: K }, (_, k) => {
    const phi = vocab.map((_, w) =>
      (wordTopic[w][k] + BETA) / (topicTotal[k] + V * BETA)
    );
    const sorted = phi
      .map((p, w) => ({ w, p }))
      .sort((a, b) => b.p - a.p)
      .slice(0, nTopWords);
    return {
      topic: k,
      words: sorted.map(x => vocab[x.w]),
      weights: sorted.map(x => parseFloat(x.p.toFixed(6))),
    };
  });

  return { topicColumns, topWords, vocabulary: vocab, nTopics: K };
}