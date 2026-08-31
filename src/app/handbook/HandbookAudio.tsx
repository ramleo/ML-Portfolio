"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

/**
 * Reading the handbook aloud, using the browser's own speech synthesiser.
 *
 * Deliberately not a hosted audio file. The book is roughly 140,000 words —
 * fifteen-odd hours of speech, several hundred megabytes of MP3 — so shipping
 * it as audio would cost more to host than the whole rest of the site, and
 * generating it would cost a real bill at any TTS vendor. `speechSynthesis`
 * is already in every browser, costs nothing, needs no backend, and works
 * offline once the voice is installed.
 *
 * The price is that voice quality is whatever the reader's operating system
 * has, which is why the voice picker is not hidden away: on a Mac the good
 * voices are there but rarely the default.
 */

/** What is worth reading aloud. Tables and code are skipped — a two-column
 *  fact table read as prose is noise, and so is a shell command. */
const LEAF = new Set(["P", "H1", "H2", "H3", "H4", "BLOCKQUOTE", "LI"]);
const SKIP = new Set(["TABLE", "PRE", "FIGURE", "NAV"]);

/** Chrome stops speaking somewhere past a quarter of a minute and never fires
 *  `end`, so nothing is handed over as one long utterance — the text is cut at
 *  sentence boundaries. Kept as long as that limit safely allows: every cut is
 *  a place the voice can draw breath, and short pieces made it stutter. */
const MAX_CHUNK = 320;

/** How many pieces are handed to the synthesiser before the current one ends.
 *  This is the whole reason the reading sounds continuous: speechSynthesis
 *  keeps its own queue and runs straight from one utterance into the next, but
 *  only if the next is already in that queue. Waiting for `end` before calling
 *  `speak` leaves an audible gap at every single cut. */
const LOOKAHEAD = 3;

/** macOS ships a set of joke voices — Bad News sings, Zarvox is a robot — and
 *  they are in getVoices() alongside the real ones. Nobody is listening to a
 *  140,000-word book in Bubbles. */
const NOVELTY = new Set([
  "Albert", "Bad News", "Bahh", "Bells", "Boing", "Bubbles", "Cellos",
  "Good News", "Jester", "Organ", "Superstar", "Trinoids", "Whisper",
  "Wobble", "Zarvox", "Fred", "Junior", "Kathy", "Ralph", "Princess",
  "Deranged", "Hysterical",
]);

/** Best first. Network voices from the browser vendor beat the OS ones, and
 *  among the OS ones these are the full-quality speech-synthesis voices rather
 *  than the compact fallbacks. */
const PREFERRED = [
  "Google US English", "Google UK English Female", "Microsoft Aria",
  "Samantha", "Daniel", "Karen", "Moira", "Tessa", "Alex",
];

/** macOS and Windows both ship a small compact version of each voice and a
 *  much clearer neural one that has to be downloaded. When both are installed
 *  they appear side by side in getVoices(), distinguished only by a suffix, so
 *  the good one is ranked ahead of its own compact twin. */
function rank(v: SpeechSynthesisVoice) {
  const better = /\((Enhanced|Premium|Natural)\)/i.test(v.name) ? -1000 : 0;
  const i = PREFERRED.findIndex((n) => v.name.startsWith(n));
  if (i >= 0) return better + i;
  return better + (v.localService ? 100 : 50);
}

/** Typographic marks a screen reads correctly and a synthesiser does not. An
 *  em dash is spoken as a hard stop mid-clause, and this book uses hundreds of
 *  them; a middot is often spoken as the word "dot". */
function speakable(text: string) {
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

type Chunk = { el: HTMLElement; text: string; where: string };

function collect(root: Element, out: HTMLElement[]) {
  for (const el of Array.from(root.children) as HTMLElement[]) {
    if (SKIP.has(el.tagName) || el.classList.contains("bk-titlepage")) continue;
    if (LEAF.has(el.tagName)) {
      if (el.innerText.trim()) out.push(el);
    } else {
      collect(el, out);
    }
  }
}

function chunksOf(el: HTMLElement, where: string): Chunk[] {
  const text = el.innerText.replace(/\s+/g, " ").trim();
  if (!text) return [];
  const sentences = text.match(/[^.!?]+[.!?]*\s*/g) ?? [text];
  const out: Chunk[] = [];
  let buf = "";
  for (const s of sentences) {
    if (buf && buf.length + s.length > MAX_CHUNK) {
      out.push({ el, text: buf.trim(), where });
      buf = "";
    }
    buf += s;
  }
  if (buf.trim()) out.push({ el, text: buf.trim(), where });
  return out;
}

/** Which chapter the reader is looking at — the last heading that has scrolled
 *  past the top quarter of the window, so pressing play starts where they are
 *  rather than at page one of fifty. */
function nearestBlock(blocks: HTMLElement[]): number {
  const line = window.innerHeight * 0.25;
  let best = 0;
  blocks.forEach((el, i) => {
    if (el.getBoundingClientRect().top < line) best = i;
  });
  return best;
}

export default function HandbookAudio() {
  // Read rather than stored: the server has no speechSynthesis, so a plain
  // useState initialiser would disagree with the server's HTML at hydration,
  // and setting it from an effect is a cascading render.
  const supported = useSyncExternalStore(
    () => () => {},
    () => typeof window !== "undefined" && "speechSynthesis" in window,
    () => false
  );
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceURI, setVoiceURI] = useState("");
  const [rate, setRate] = useState(0.95);
  const [where, setWhere] = useState("");

  const chunks = useRef<Chunk[]>([]);
  /** Index of the chunk being spoken — where a voice or speed change resumes. */
  const at = useRef(0);
  /** Index of the next chunk not yet handed to the synthesiser. */
  const pushed = useRef(0);
  /** How many are sitting in the synthesiser's queue right now. */
  const inFlight = useRef(0);
  const marked = useRef<HTMLElement | null>(null);
  /** Set while stopping, so the `end` handlers of the utterances being
   *  cancelled do not immediately queue their successors. */
  const halted = useRef(false);
  const rateRef = useRef(rate);
  const voiceRef = useRef(voiceURI);

  useEffect(() => {
    rateRef.current = rate;
  }, [rate]);
  useEffect(() => {
    voiceRef.current = voiceURI;
  }, [voiceURI]);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    // getVoices() is empty on first call in Chrome and fills in asynchronously.
    const load = () => {
      const list = window.speechSynthesis
        .getVoices()
        .filter((v) => v.lang.startsWith("en") && !NOVELTY.has(v.name.split(" (")[0]))
        .sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
      setVoices(list);
      // The OS default is often a compact voice, so the best available one is
      // chosen rather than inherited.
      setVoiceURI((cur) => cur || list[0]?.voiceURI || "");
    };
    // Off the effect's own tick, so the first voice list does not land as a
    // second render inside the first one.
    const t = window.setTimeout(load, 0);
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => {
      window.clearTimeout(t);
      window.speechSynthesis.removeEventListener("voiceschanged", load);
    };
  }, []);

  const mark = (el: HTMLElement | null) => {
    marked.current?.classList.remove("hb-reading");
    marked.current = el;
    el?.classList.add("hb-reading");
  };

  const stop = useCallback(() => {
    halted.current = true;
    window.speechSynthesis.cancel();
    inFlight.current = 0;
    mark(null);
    setPlaying(false);
    setPaused(false);
    setWhere("");
  }, []);

  // Leaving the page mid-sentence otherwise keeps the voice talking, because
  // speech synthesis belongs to the browser and not to this document.
  useEffect(() => stop, [stop]);

  /** Top the synthesiser's queue back up to LOOKAHEAD. Called once to start
   *  and again as each utterance finishes, so the queue never runs dry mid-way
   *  through a sentence. */
  /** fill() queues the next utterance from inside the previous one's `end`
   *  handler, so it has to be able to reach itself. A callback cannot name
   *  itself before it is declared; the ref is the hook-safe way to close that
   *  loop. */
  const again = useRef<() => void>(() => {});

  const fill = useCallback(() => {
    const list = chunks.current;
    while (pushed.current < list.length && inFlight.current < LOOKAHEAD) {
      const i = pushed.current++;
      const { el, text, where: label } = list[i];
      const u = new SpeechSynthesisUtterance(speakable(text));
      u.rate = rateRef.current;
      // Compact system voices get muddy at the top of their range; a touch
      // below neutral is measurably easier to follow over long stretches.
      u.pitch = 0.95;
      const v = window.speechSynthesis.getVoices().find((x) => x.voiceURI === voiceRef.current);
      if (v) {
        u.voice = v;
        u.lang = v.lang;
      }
      // The highlight follows what is actually being said, not what was queued
      // — which is why it moves on `start` and not when the chunk is pushed.
      u.onstart = () => {
        at.current = i;
        if (el !== marked.current) {
          mark(el);
          el.scrollIntoView({ block: "center", behavior: "smooth" });
          setWhere(label);
        }
      };
      const done = () => {
        inFlight.current = Math.max(0, inFlight.current - 1);
        if (halted.current) return;
        if (pushed.current >= list.length && inFlight.current === 0) stop();
        else again.current();
      };
      u.onend = done;
      u.onerror = done;
      inFlight.current++;
      window.speechSynthesis.speak(u);
    }
  }, [stop]);

  useEffect(() => {
    again.current = fill;
  }, [fill]);

  const play = () => {
    if (paused) {
      window.speechSynthesis.resume();
      setPaused(false);
      return;
    }
    const body = document.querySelector(".hb-body");
    if (!body) return;
    const blocks: HTMLElement[] = [];
    collect(body, blocks);
    if (!blocks.length) return;
    const from = nearestBlock(blocks);
    // Which chapter each block belongs to, so the bar can say where the voice
    // is. A part wraps many chapters, so the answer is the nearest preceding
    // h1, not the first one inside the enclosing .bk-part.
    let head = "";
    const labels = blocks.map((el) => {
      if (el.tagName === "H1") head = el.innerText.replace(/\s+/g, " ").trim();
      return head;
    });
    chunks.current = blocks
      .slice(from)
      .flatMap((el, i) => chunksOf(el, labels[from + i]));
    halted.current = false;
    window.speechSynthesis.cancel();
    pushed.current = 0;
    inFlight.current = 0;
    at.current = 0;
    setPlaying(true);
    setPaused(false);
    fill();
  };

  const pause = () => {
    window.speechSynthesis.pause();
    setPaused(true);
  };

  /** Changing voice or speed mid-flow: an utterance already handed to the
   *  synthesiser cannot be re-tuned, so the current one is dropped and the
   *  same chunk is spoken again with the new settings. */
  const restart = () => {
    if (!playing) return;
    const i = at.current;
    halted.current = true;
    window.speechSynthesis.cancel();
    // Everything queued behind the current chunk was built with the old voice
    // and speed, so the queue is thrown away and rebuilt from where the voice
    // had got to.
    window.setTimeout(() => {
      halted.current = false;
      pushed.current = i;
      inFlight.current = 0;
      fill();
    }, 60);
  };

  if (!supported) return null;

  return (
    <div className="hb-audio" role="region" aria-label="Listen to the handbook">
      {!playing ? (
        <button onClick={play} className="hb-audio-btn hb-audio-main">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M8 5v14l11-7z" />
          </svg>
          Listen
        </button>
      ) : (
        <>
          <button onClick={paused ? play : pause} className="hb-audio-btn hb-audio-main">
            {paused ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M8 5v14l11-7z" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
              </svg>
            )}
            {paused ? "Resume" : "Pause"}
          </button>
          <button onClick={stop} className="hb-audio-btn" aria-label="Stop reading">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <rect x="5" y="5" width="14" height="14" rx="2" />
            </svg>
          </button>
        </>
      )}

      <select
        className="hb-audio-select"
        aria-label="Voice"
        value={voiceURI}
        onChange={(e) => {
          setVoiceURI(e.target.value);
          voiceRef.current = e.target.value;
          restart();
        }}
      >
        {voices.map((v) => (
          <option key={v.voiceURI} value={v.voiceURI}>
            {v.name}
          </option>
        ))}
      </select>

      <select
        className="hb-audio-select hb-audio-rate"
        aria-label="Reading speed"
        value={rate}
        onChange={(e) => {
          const r = Number(e.target.value);
          setRate(r);
          rateRef.current = r;
          restart();
        }}
      >
        {[0.75, 0.85, 0.95, 1, 1.1, 1.25, 1.5].map((r) => (
          <option key={r} value={r}>
            {r}×
          </option>
        ))}
      </select>

      {playing && where && <span className="hb-audio-where">{where}</span>}
    </div>
  );
}
