// Real, published DNS tunneling/exfiltration detection heuristics — not
// invented for this project. See userGuide.ts for the full explanation and
// sources. Combines three signals (subdomain length, Shannon entropy,
// query volume per parent domain) rather than any single one alone, since
// length or entropy in isolation both produce false positives on ordinary
// long/random-looking-but-legitimate subdomains (CDN cache-busting, S3
// bucket names, etc).

const LENGTH_THRESHOLD = 50; // published rule of thumb for tunneling payloads
const ENTROPY_THRESHOLD = 4.0; // bits/char; plain hostnames sit well below this
const MIN_UNIQUE_SUBDOMAINS_FOR_LOG_FLAG = 5; // repetition signal for the aggregate mode

// Small curated list of common multi-part public suffixes, same "not
// exhaustive, disclosed" pattern as the QR Phishing Detector's typosquat
// brand list — a full Public Suffix List parse would add a large new
// dependency for a heuristic tool where an occasional missed edge case
// (an unusual ccTLD) doesn't change the overall verdict logic.
const MULTI_PART_TLDS = new Set([
  "co.uk", "org.uk", "ac.uk", "gov.uk", "com.au", "net.au", "org.au",
  "co.jp", "co.in", "co.nz", "co.za", "com.br", "com.mx", "com.sg",
]);

export function shannonEntropy(text: string): number {
  if (!text) return 0;
  const counts = new Map<string, number>();
  for (const ch of text) counts.set(ch, (counts.get(ch) || 0) + 1);
  const len = text.length;
  let entropy = 0;
  for (const count of counts.values()) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

/** Best-effort registrable ("parent") domain extraction — strips the
 * leftmost label(s) down to a curated set of known suffixes. Not a full
 * Public Suffix List implementation (disclosed in the User Guide). */
export function extractParentDomain(host: string): string {
  const labels = host.toLowerCase().trim().replace(/\.$/, "").split(".");
  if (labels.length <= 2) return labels.join(".");
  const lastTwo = labels.slice(-2).join(".");
  if (MULTI_PART_TLDS.has(lastTwo) && labels.length >= 3) {
    return labels.slice(-3).join(".");
  }
  return lastTwo;
}

/** The "subdomain" is everything left of the parent domain — the part an
 * attacker actually controls the content of and could encode payload into. */
function subdomainPart(host: string, parent: string): string {
  const trimmed = host.toLowerCase().trim().replace(/\.$/, "");
  if (trimmed === parent) return "";
  return trimmed.slice(0, trimmed.length - parent.length - 1);
}

export type SingleHostResult = {
  host: string;
  parentDomain: string;
  subdomain: string;
  length: number;
  entropy: number;
  lengthFlag: boolean;
  entropyFlag: boolean;
};

export function analyzeSingleHost(host: string): SingleHostResult {
  const parentDomain = extractParentDomain(host);
  const subdomain = subdomainPart(host, parentDomain);
  const length = subdomain.length;
  const entropy = shannonEntropy(subdomain);
  return {
    host,
    parentDomain,
    subdomain,
    length,
    entropy,
    lengthFlag: length > LENGTH_THRESHOLD,
    entropyFlag: entropy > ENTROPY_THRESHOLD,
  };
}

export type ParentDomainStats = {
  parentDomain: string;
  queryCount: number;
  uniqueSubdomains: number;
  avgLength: number;
  maxLength: number;
  avgEntropy: number;
  maxEntropy: number;
  flagged: boolean;
  matchedSignals: string[];
};

export type LogAnalysisResult = {
  totalQueries: number;
  parentDomains: ParentDomainStats[];
  flaggedDomains: ParentDomainStats[];
};

/** Groups a pasted DNS query log (one hostname per line) by parent domain
 * and flags a parent domain only when at least two of the three signals
 * (length, entropy, repetition) agree AND entropy is one of them — never a
 * single heuristic alone. Repetition needs 5 unique subdomains, so a real
 * tunnel with only three still flags on length + entropy; saying all three
 * must agree would describe a stricter tool than this one. */
export function analyzeLog(rawText: string): LogAnalysisResult {
  const hosts = rawText
    .split("\n")
    .map(l => l.trim())
    .filter(l => l.length > 0 && !l.startsWith("#"));

  const byParent = new Map<string, { subdomains: Set<string>; count: number }>();

  for (const host of hosts) {
    const parent = extractParentDomain(host);
    if (!parent.includes(".")) continue; // skip malformed/bare-word lines
    const sub = subdomainPart(host, parent);
    const entry = byParent.get(parent) || { subdomains: new Set<string>(), count: 0 };
    entry.subdomains.add(sub);
    entry.count += 1;
    byParent.set(parent, entry);
  }

  const parentDomains: ParentDomainStats[] = Array.from(byParent.entries()).map(([parentDomain, entry]) => {
    const subs = Array.from(entry.subdomains).filter(s => s.length > 0);
    const lengths = subs.map(s => s.length);
    const entropies = subs.map(s => shannonEntropy(s));
    const avgLength = lengths.length ? lengths.reduce((a, b) => a + b, 0) / lengths.length : 0;
    const maxLength = lengths.length ? Math.max(...lengths) : 0;
    const avgEntropy = entropies.length ? entropies.reduce((a, b) => a + b, 0) / entropies.length : 0;
    const maxEntropy = entropies.length ? Math.max(...entropies) : 0;

    const matchedSignals: string[] = [];
    if (maxLength > LENGTH_THRESHOLD) matchedSignals.push(`long subdomain (${maxLength} chars)`);
    if (avgEntropy > ENTROPY_THRESHOLD) matchedSignals.push(`high average entropy (${avgEntropy.toFixed(1)} bits/char)`);
    if (entry.subdomains.size >= MIN_UNIQUE_SUBDOMAINS_FOR_LOG_FLAG) matchedSignals.push(`${entry.subdomains.size} unique subdomains under one parent`);

    const flagged = matchedSignals.length >= 2 && avgEntropy > ENTROPY_THRESHOLD;

    return {
      parentDomain,
      queryCount: entry.count,
      uniqueSubdomains: entry.subdomains.size,
      avgLength,
      maxLength,
      avgEntropy,
      maxEntropy,
      flagged,
      matchedSignals,
    };
  });

  parentDomains.sort((a, b) => Number(b.flagged) - Number(a.flagged) || b.avgEntropy - a.avgEntropy);

  return {
    totalQueries: hosts.length,
    parentDomains,
    flaggedDomains: parentDomains.filter(p => p.flagged),
  };
}
