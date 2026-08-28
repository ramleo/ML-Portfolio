import phishingModel from "./phishingModel.json";

// Must exactly mirror the Python training script's tokenizer/stopword
// list (see the one-time local training step referenced in the User
// Guide) — any mismatch here silently degrades the shipped model's real
// measured accuracy without any error being raised.
const STOPWORDS = new Set(`
a an the and or but if then else for while with without to of in on at by
from as is are was were be been being this that these those it its i you
he she we they them his her their our your my me us him not no do does
did have has had will would can could should shall may might must so
than too very just also about into over under again further here there
when where why how all any both each few more most other some such nor
only own same s t don d ll m o re ve y ain aren couldn didn doesn hadn
hasn haven isn ma mightn mustn needn shan shouldn wasn weren won wouldn
`.split(/\s+/).filter(Boolean));

// Matches Python's string.punctuation exactly — stripped with no
// replacement (so "don't" -> "dont", concatenating letters across the
// removed character), same as the training script's str.translate step.
// Digits are deliberately left alone: they act as natural token
// boundaries for the [a-z]+ match below, exactly like Python's regex does
// on the punctuation-stripped (but digit-preserving) string.
const PUNCTUATION_REGEX = /[!"#$%&'()*+,\-./:;<=>?@[\]^_`{|}~]/g;

export function tokenize(text: string): string[] {
  const stripped = text.toLowerCase().replace(PUNCTUATION_REGEX, "");
  return (stripped.match(/[a-z]+/g) || []).filter(t => t.length > 2 && !STOPWORDS.has(t));
}

export const MEASURED_HELD_OUT_ACCURACY = phishingModel.heldOutAccuracy;
export const HELD_OUT_COUNT = phishingModel.heldOutCount;

const VOCAB: string[] = phishingModel.vocab;
const VOCAB_INDEX = new Map<string, number>(VOCAB.map((w, i) => [w, i]));
const SAFE_LOG_PROB: number[] = phishingModel.wordLogProb.safe;
const PHISHING_LOG_PROB: number[] = phishingModel.wordLogProb.phishing;
const SAFE_PRIOR = phishingModel.classLogPrior.safe;
const PHISHING_PRIOR = phishingModel.classLogPrior.phishing;

export type WordContribution = { word: string; count: number; delta: number };

export type ClassifyResult = {
  verdict: "phishing" | "safe";
  phishingProbability: number; // 0-1, softmax-normalized from the two log-scores
  topWords: WordContribution[];
};

/** Multinomial Naive Bayes scoring — a bag-of-words dot product against
 * per-class log-probabilities, exactly reproducing scikit-learn's
 * MultinomialNB.predict_log_proba() math (sum of log P(word|class) over
 * every token occurrence, plus the class log-prior). */
export function classifyEmailBody(text: string): ClassifyResult | null {
  const tokens = tokenize(text);
  if (tokens.length === 0) return null;

  let safeScore = SAFE_PRIOR;
  let phishingScore = PHISHING_PRIOR;

  const counts = new Map<string, number>();
  for (const t of tokens) {
    if (VOCAB_INDEX.has(t)) counts.set(t, (counts.get(t) || 0) + 1);
  }

  const contributions: WordContribution[] = [];
  for (const [word, count] of counts) {
    const idx = VOCAB_INDEX.get(word)!;
    safeScore += SAFE_LOG_PROB[idx] * count;
    phishingScore += PHISHING_LOG_PROB[idx] * count;
    contributions.push({ word, count, delta: (PHISHING_LOG_PROB[idx] - SAFE_LOG_PROB[idx]) * count });
  }

  // Softmax over the two log-scores for a displayable 0-1 probability.
  const maxScore = Math.max(safeScore, phishingScore);
  const safeExp = Math.exp(safeScore - maxScore);
  const phishingExp = Math.exp(phishingScore - maxScore);
  const phishingProbability = phishingExp / (safeExp + phishingExp);

  contributions.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  return {
    verdict: phishingScore > safeScore ? "phishing" : "safe",
    phishingProbability,
    topWords: contributions.slice(0, 8),
  };
}

// Independent, transparent rule-based signals — disclosed as a small,
// non-exhaustive curated list, same "signals not verdict" framing as QR
// Phishing Detector's typosquat brand list.
const URGENCY_PHRASES = [
  "act now", "act immediately", "verify your account", "verify immediately",
  "account will be suspended", "account has been suspended", "click here immediately",
  "urgent action required", "your account will be closed", "confirm your identity",
  "limited time", "failure to comply", "unauthorized access detected",
  "your account has been locked", "immediate attention required", "final notice",
];

const GENERIC_GREETINGS = [
  "dear customer", "dear user", "dear valued customer", "dear member",
  "dear account holder", "dear sir/madam", "dear client",
];

export type RuleFlags = {
  urgencyPhrases: string[];
  genericGreeting: string | null;
};

export function checkRuleBasedFlags(text: string): RuleFlags {
  const lower = text.toLowerCase();
  return {
    urgencyPhrases: URGENCY_PHRASES.filter(p => lower.includes(p)),
    genericGreeting: GENERIC_GREETINGS.find(g => lower.includes(g)) || null,
  };
}
