// ── LDA (Latent Dirichlet Allocation) via Collapsed Gibbs Sampling ────────────

export interface LDATopicResult {
  topicColumns: { name: string; values: number[] }[];
  topWords: { topic: number; words: string[]; weights: number[] }[];
  vocabulary: string[];
  nTopics: number;
}

export interface LDAPreprocessOpts {
  userStopwords?: string;   // comma-separated extra stopwords
  minDocFreq?: number;      // min docs a word must appear in (default 1 = no filter)
  stemming?: boolean;       // apply basic suffix-stripping stemming
}

const STOPWORDS = new Set([
  // Articles, conjunctions, prepositions, pronouns
  'a','about','above','across','after','afterwards','again','against','all',
  'almost','alone','along','already','also','although','always','am','among',
  'amongst','an','and','another','any','anyhow','anyone','anything','anyway',
  'anywhere','are','around','as','at','back','be','became','because','become',
  'becomes','becoming','been','before','beforehand','behind','being','below',
  'beside','besides','between','beyond','both','bottom','but','by',
  // C-F
  'call','can','cannot','co','con','could','cry','did','do','does','doing',
  'done','down','due','during','each','eight','either','eleven','else',
  'elsewhere','empty','enough','even','ever','every','everyone','everything',
  'everywhere','except','few','fifteen','fifty','fill','find','fire','first',
  'five','for','former','formerly','forty','found','four','from','front',
  'full','further','get','give','go',
  // H-L
  'had','has','have','he','hence','her','here','hereafter','hereby','herein',
  'hereupon','hers','herself','him','himself','his','how','however','hundred',
  'ie','if','in','inc','indeed','into','is','it','its','itself','just','keep',
  'last','latter','latterly','least','less','ltd',
  // M-N
  'made','make','many','may','me','meanwhile','might','mine','more','moreover',
  'most','mostly','move','much','must','my','myself','name','namely','neither',
  'never','nevertheless','next','nine','no','nobody','none','nor','nothing',
  'now','nowhere',
  // O-R
  'of','off','often','on','once','only','or','other','others','otherwise',
  'our','ours','ourselves','out','over','own','part','per','perhaps','please',
  'put','rather','re','really','regarding',
  // S
  'same','say','see','seem','seemed','seeming','seems','serious','several',
  'she','should','show','side','since','six','sixty','so','some','somehow',
  'someone','something','sometime','sometimes','somewhere','still','such',
  // T
  'take','ten','than','that','the','their','them','themselves','then','thence',
  'there','thereafter','thereby','therefore','therein','thereupon','these',
  'they','third','this','those','though','three','through','throughout','thus',
  'to','together','too','top','toward','towards','twelve','twenty','two',
  // U-Z
  'under','until','up','upon','us','used','using','various','very','via',
  'was','we','well','were','what','whatever','when','whence','whenever',
  'where','whereafter','whereas','whereby','wherein','whereupon','wherever',
  'whether','which','while','who','whoever','whole','whom','whose','why',
  'will','with','within','without','would','yet','you','your','yours',
  'yourself','yourselves',
  // Negation contractions (without apostrophe, post-strip)
  'arent','cant','couldnt','didnt','doesnt','dont','hadnt','hasnt','havent',
  'isnt','mightnt','mustnt','neednt','shouldnt','wasnt','werent','wont',
  'wouldnt',
]);

function stemWord(w: string): string {
  if (w.length <= 4) return w;
  if (w.endsWith("ing")) return w.slice(0, -3);
  if (w.endsWith("tion")) return w.slice(0, -4);
  if (w.endsWith("ness")) return w.slice(0, -4);
  if (w.endsWith("ment")) return w.slice(0, -4);
  if (w.endsWith("ies")) return w.slice(0, -3) + "y";
  if (w.endsWith("es") && w.length > 5) return w.slice(0, -2);
  if (w.endsWith("ed") && w.length > 4) return w.slice(0, -2);
  if (w.endsWith("ly") && w.length > 4) return w.slice(0, -2);
  if (w.endsWith("er") && w.length > 4) return w.slice(0, -2);
  if (w.endsWith("s") && w.length > 4 && !w.endsWith("ss")) return w.slice(0, -1);
  return w;
}

function tokenize(
  text: string,
  allStops: Set<string>,
  useStemming: boolean,
): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length >= 2 && !allStops.has(w))
    .map(w => (useStemming ? stemWord(w) : w));
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
  preprocessOpts: LDAPreprocessOpts = {},
): LDATopicResult {
  const MAX_ROWS = 2000;
  const safeTexts = texts.slice(0, MAX_ROWS);
  const D = safeTexts.length;
  const K = nTopics;
  const ALPHA = 0.1;
  const BETA  = 0.01;

  // Build combined stopword set (built-in + user-supplied)
  const userExtraStops = (preprocessOpts.userStopwords ?? "")
    .split(",")
    .map(w => w.trim().toLowerCase())
    .filter(Boolean);
  const allStops = new Set([...STOPWORDS, ...userExtraStops]);
  const useStemming = preprocessOpts.stemming ?? false;
  const minDocFreq  = preprocessOpts.minDocFreq ?? 1;

  // 1. Tokenize
  const tokenizedDocs = safeTexts.map(t => tokenize(t, allStops, useStemming));

  // 2. Build vocabulary (cap 500 most frequent)
  let vocab = buildVocab(tokenizedDocs);

  // 2b. Apply min-document-frequency filter
  if (minDocFreq > 1) {
    const docFreq = new Map<string, number>();
    for (const doc of tokenizedDocs) {
      const seen = new Set(doc);
      for (const w of seen) {
        docFreq.set(w, (docFreq.get(w) ?? 0) + 1);
      }
    }
    vocab = vocab.filter(w => (docFreq.get(w) ?? 0) >= minDocFreq);
  }
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