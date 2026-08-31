/**
 * Everything about turning written text into speech that both the handbook's
 * read-aloud bar and the guided demos need.
 *
 * Kept out of the components because there are now two callers and the rules
 * here were all learned the hard way — see the comments on each.
 */

/** Chrome stops speaking somewhere past a quarter of a minute and never fires
 *  `end`, so nothing is handed over as one long utterance. Kept as long as that
 *  limit safely allows: every cut is a place the voice can draw breath, and
 *  short pieces made it stutter. */
export const MAX_CHUNK = 320;

/** How many pieces are handed to the synthesiser before the current one ends.
 *  This is the whole reason a reading sounds continuous: speechSynthesis keeps
 *  its own queue and runs straight from one utterance into the next, but only
 *  if the next is already in that queue. Waiting for `end` before calling
 *  `speak` leaves an audible gap at every single cut. */
export const LOOKAHEAD = 3;

/** macOS ships a set of joke voices — Bad News sings, Zarvox is a robot — and
 *  they are in getVoices() alongside the real ones. */
const NOVELTY = new Set([
  "Albert", "Bad News", "Bahh", "Bells", "Boing", "Bubbles", "Cellos",
  "Good News", "Jester", "Organ", "Superstar", "Trinoids", "Whisper",
  "Wobble", "Zarvox", "Fred", "Junior", "Kathy", "Ralph", "Princess",
  "Deranged", "Hysterical",
]);

/** Best first. Network voices from the browser vendor beat the OS ones, and
 *  among the OS ones these are the full-quality voices rather than compact
 *  fallbacks. */
const PREFERRED = [
  "Google US English", "Google UK English Female", "Microsoft Aria",
  "Samantha", "Daniel", "Karen", "Moira", "Tessa", "Alex",
];

/** macOS and Windows both ship a small compact version of each voice and a
 *  much clearer neural one that has to be downloaded. When both are installed
 *  they appear side by side in getVoices(), distinguished only by a suffix, so
 *  the good one is ranked ahead of its own compact twin. */
export function rankVoice(v: SpeechSynthesisVoice) {
  const better = /\((Enhanced|Premium|Natural)\)/i.test(v.name) ? -1000 : 0;
  const i = PREFERRED.findIndex((n) => v.name.startsWith(n));
  if (i >= 0) return better + i;
  return better + (v.localService ? 100 : 50);
}

/** The voices worth offering, best first. */
export function usableVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return [];
  return window.speechSynthesis
    .getVoices()
    .filter((v) => v.lang.startsWith("en") && !NOVELTY.has(v.name.split(" (")[0]))
    .sort((a, b) => rankVoice(a) - rankVoice(b) || a.name.localeCompare(b.name));
}

/** Typographic marks a reader handles and a synthesiser does not. An em dash
 *  is spoken as a hard stop mid-clause, and this book uses hundreds of them. */
export function speakable(text: string) {
  return text
    .replace(/[—–]/g, ", ")
    .replace(/[·•]/g, ", ")
    .replace(/…/g, ". ")
    .replace(/["""'']/g, "")
    .replace(/https?:\/\/\S+/g, "a link")
    .replace(/\s*,\s*,\s*/g, ", ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Split at sentence boundaries into pieces no longer than MAX_CHUNK. */
export function sentences(text: string): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const parts = clean.match(/[^.!?]+[.!?]*\s*/g) ?? [clean];
  const out: string[] = [];
  let buf = "";
  for (const s of parts) {
    if (buf && buf.length + s.length > MAX_CHUNK) {
      out.push(buf.trim());
      buf = "";
    }
    buf += s;
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}
