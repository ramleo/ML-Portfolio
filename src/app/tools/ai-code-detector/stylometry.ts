export type Signal = { id: string; label: string; detail: string; why: string };
export type OverallLabel = "several" | "few" | "none";
export type CodeAnalysis = { signals: Signal[]; overallLabel: OverallLabel };

/** Documented stylistic tendencies discussed in practitioner/security writeups
 * on AI-generated code — NOT a validated classifier. Each signal is
 * individually weak and trivially fakeable in either direction (a careful
 * human can write "clean" code; an LLM can be prompted to write "messy"
 * code), so this only ever surfaces raw evidence, never a probability. */

const GENERIC_NAMES = ["result", "data", "temp", "item", "value", "output", "response", "obj", "foo", "bar", "baz"];
const BOILERPLATE_PHRASES = [
  /this function\b/i, /this script\b/i, /here('?s| is)\b/i,
  /#\s*step\s*\d+/i, /\/\/\s*step\s*\d+/i, /note:\s/i,
];
const MESS_MARKERS = [/\bTODO\b/, /\bFIXME\b/, /\bXXX\b/, /console\.log\(/, /print\(f?"debug/i];

function codeLines(code: string): string[] {
  return code.split("\n");
}

function isCommentLine(line: string): boolean {
  const t = line.trim();
  return t.startsWith("#") || t.startsWith("//") || t.startsWith("*");
}

function commentDensity(lines: string[]): number {
  const nonBlank = lines.filter(l => l.trim().length > 0);
  if (nonBlank.length === 0) return 0;
  const comments = nonBlank.filter(isCommentLine);
  return comments.length / nonBlank.length;
}

function genericNameHits(code: string): number {
  let count = 0;
  for (const name of GENERIC_NAMES) {
    const re = new RegExp(`\\b${name}\\s*[=:]`, "gi");
    count += (code.match(re) || []).length;
  }
  return count;
}

function namingConsistency(code: string): { snake: number; camel: number } {
  const identifiers = code.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g) || [];
  let snake = 0, camel = 0;
  for (const id of identifiers) {
    if (/^[a-z][a-z0-9]*(_[a-z0-9]+)+$/.test(id)) snake++;
    else if (/^[a-z][a-z0-9]*([A-Z][a-z0-9]*)+$/.test(id)) camel++;
  }
  return { snake, camel };
}

function hasFormalDocstring(code: string): boolean {
  return /"""[\s\S]*?(Args:|Returns:|Parameters\s*\n\s*-+)[\s\S]*?"""/i.test(code)
    || /\/\*\*[\s\S]*?@(param|returns)[\s\S]*?\*\//i.test(code);
}

function hasBroadExceptionHandling(code: string): boolean {
  return /except\s*(Exception)?\s*(as\s+\w+)?\s*:/i.test(code) || /catch\s*\(\s*\w*\s*\)\s*\{\s*console\.(log|error)/i.test(code);
}

function boilerplatePhraseHits(code: string): number {
  return BOILERPLATE_PHRASES.reduce((n, re) => n + (re.test(code) ? 1 : 0), 0);
}

function hasMessMarkers(code: string): boolean {
  return MESS_MARKERS.some(re => re.test(code));
}

function hasCommentedOutCode(lines: string[]): boolean {
  return lines.some(l => {
    const t = l.trim();
    if (!isCommentLine(t)) return false;
    const stripped = t.replace(/^[#/*]+\s?/, "");
    return /[=(){};]/.test(stripped) && !/^["']/.test(stripped);
  });
}

function functionBlankLineGaps(lines: string[]): number[] {
  const defIdx: number[] = [];
  lines.forEach((l, i) => { if (/^\s*(def |function |const \w+\s*=\s*\(|export function)/.test(l)) defIdx.push(i); });
  const gaps: number[] = [];
  for (let k = 1; k < defIdx.length; k++) {
    let blanks = 0;
    for (let i = defIdx[k] - 1; i >= 0 && lines[i].trim() === ""; i--) blanks++;
    gaps.push(blanks);
  }
  return gaps;
}

export function analyzeCode(code: string): CodeAnalysis {
  const lines = codeLines(code);
  const signals: Signal[] = [];

  const density = commentDensity(lines);
  if (density > 0.3) {
    signals.push({
      id: "comment_density", label: "High comment density",
      detail: `${Math.round(density * 100)}% of non-blank lines are comments`,
      why: "AI-generated code often explains routine operations in comments more densely than typical human code — but a well-documented human function looks identical.",
    });
  }

  const genericHits = genericNameHits(code);
  if (genericHits >= 3) {
    signals.push({
      id: "generic_names", label: "Frequent generic/placeholder variable names",
      detail: `${genericHits} uses of names like result/data/temp/value/output`,
      why: "Generic \"textbook\" naming shows up often in AI-generated snippets — but plenty of human code uses these names too, especially in short scripts.",
    });
  }

  const { snake, camel } = namingConsistency(code);
  const totalNamed = snake + camel;
  if (totalNamed >= 8 && (snake === 0 || camel === 0)) {
    signals.push({
      id: "naming_consistency", label: "Perfectly uniform naming convention",
      detail: `${totalNamed} identifiers, zero convention deviation`,
      why: "Real human code usually has a few inconsistencies in casing; mechanically perfect consistency is a weak tell — but plenty of humans, and every linter/formatter, also produce this.",
    });
  }

  if (hasFormalDocstring(code)) {
    signals.push({
      id: "formal_docstring", label: "Formal Google/NumPy-style docstring",
      detail: "Args:/Returns:/Parameters: block found",
      why: "This formal docstring style is common in AI output even for trivial functions — but it's also standard practice in many real human codebases and style guides.",
    });
  }

  if (hasBroadExceptionHandling(code)) {
    signals.push({
      id: "broad_exception", label: "Broad, generic exception handling",
      detail: "A catch-all except/catch block with a generic error message",
      why: "AI-generated code often wraps operations in broad exception handling by default — but defensive programming is a legitimate human habit too.",
    });
  }

  const boilerplate = boilerplatePhraseHits(code);
  if (boilerplate >= 1) {
    signals.push({
      id: "boilerplate_phrasing", label: "Boilerplate explanatory phrasing",
      detail: `${boilerplate} phrase(s) like "This function...", "Here's...", "Step N:"`,
      why: "These framing phrases read like a chat-response explanation carried into a comment — but some humans write comments this way too, especially in tutorials.",
    });
  }

  const noMess = !hasMessMarkers(code) && !hasCommentedOutCode(lines);
  const gaps = functionBlankLineGaps(lines);
  const uniformSpacing = gaps.length >= 2 && new Set(gaps).size === 1;
  if (noMess && uniformSpacing) {
    signals.push({
      id: "no_mess", label: "No debugging leftovers, mechanically uniform spacing",
      detail: "No TODO/FIXME/debug prints/commented-out code, identical blank-line spacing between every function",
      why: "Real-world human code usually accumulates some mess over time; its total absence alongside mechanically uniform spacing is a weak tell — but a fresh, tidy human script looks the same.",
    });
  }

  const overallLabel: OverallLabel = signals.length >= 3 ? "several" : signals.length >= 1 ? "few" : "none";
  return { signals, overallLabel };
}
