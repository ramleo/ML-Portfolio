// Client-side alert deduplication/grouping — a simplified version of real
// log-template-extraction techniques (Drain/IPLoM-style) used by SIEM
// correlation engines to fight alert fatigue: near-identical alert lines
// differing only by an IP/user/number get collapsed into one group so a
// human (or the LLM judge downstream) triages the pattern once, not every
// individual line. This is a heuristic normalization, not an
// implementation of either published algorithm — disclosed as such in the
// User Guide.

const MAX_GROUPS = 20;
const IPV4_REGEX = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g;

function extractIps(line: string): string[] {
  return Array.from(new Set(line.match(IPV4_REGEX) || []));
}

/** Normalizes a raw alert line into a template by replacing IPv4 addresses
 * and standalone numbers with placeholders, so lines that only differ by
 * an IP/user-id/count collapse into the same group. */
function toTemplate(line: string): string {
  return line
    .trim()
    .replace(IPV4_REGEX, "<IP>")
    // No word-boundary requirement: a digit run embedded in an
    // alphanumeric token (admin0, server7) has no \b before it since the
    // preceding letter is also a word character — blanket-replacing any
    // digit run (IPs already stripped above) still normalizes correctly.
    .replace(/\d+/g, "#")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export type AlertGroup = {
  template: string;
  count: number;
  example: string;
  uniqueIps: string[];
};

export type GroupingResult = {
  totalLines: number;
  groups: AlertGroup[];
  truncated: boolean;
};

/** Parses pasted raw alert lines (one per line) and groups near-identical
 * ones by normalized template. Returns at most MAX_GROUPS groups, sorted
 * by count descending, so a large paste can't blow up the downstream LLM
 * judge call's token cost. */
export function groupAlerts(rawText: string): GroupingResult {
  const lines = rawText
    .split("\n")
    .map(l => l.trim())
    .filter(l => l.length > 0 && !l.startsWith("#"));

  const byTemplate = new Map<string, { count: number; example: string; ips: Set<string> }>();

  for (const line of lines) {
    const template = toTemplate(line);
    const entry = byTemplate.get(template) || { count: 0, example: line, ips: new Set<string>() };
    entry.count += 1;
    for (const ip of extractIps(line)) entry.ips.add(ip);
    byTemplate.set(template, entry);
  }

  const allGroups: AlertGroup[] = Array.from(byTemplate.entries())
    .map(([template, entry]) => ({
      template,
      count: entry.count,
      example: entry.example,
      uniqueIps: Array.from(entry.ips),
    }))
    .sort((a, b) => b.count - a.count);

  return {
    totalLines: lines.length,
    groups: allGroups.slice(0, MAX_GROUPS),
    truncated: allGroups.length > MAX_GROUPS,
  };
}
