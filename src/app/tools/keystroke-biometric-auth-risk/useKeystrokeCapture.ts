import { useCallback, useRef, useState } from "react";
import {
  extractDwellFlight, buildProfile, scaledManhattanScore, riskBand,
  type KeyEvent, type AttemptFeatures, type Profile, type RiskBand,
} from "./keystrokeAuthRisk";

export const PHRASE = "the quick fox";
const ENROLL_REPS = 3;

export type Stage = "enroll" | "ready" | "scored";

export type ScoredResult = { score: number; band: RiskBand; attempt: AttemptFeatures };

/** Captures real keydown/keyup timing on a controlled text input to build
 * a keystroke-dynamics enrollment profile, then scores a later verification
 * attempt against it — see keystrokeAuthRisk.ts for the scoring math. */
export function useKeystrokeCapture() {
  const [stage, setStage] = useState<Stage>("enroll");
  const [repIndex, setRepIndex] = useState(0); // completed reps
  const [value, setValue] = useState("");
  const [mismatchFlash, setMismatchFlash] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [reps, setReps] = useState<AttemptFeatures[]>([]);
  const [result, setResult] = useState<ScoredResult | null>(null);

  const eventsRef = useRef<KeyEvent[]>([]);
  // Set by onChange once the typed value matches PHRASE — but the browser
  // fires its native "input" event (which drives onChange) BEFORE "keyup"
  // for the very key that completed the phrase, so the buffer is one keyup
  // short at that point. Finalizing here instead, in onKeyUp, once the
  // buffer's down/up counts are actually balanced again, was found via live
  // testing: finalizing directly in onChange left a stray trailing "keyup"
  // that landed in the NEXT attempt's buffer, shifting every dwell pairing
  // in that next attempt by one index and producing garbage negative dwells.
  const pendingFinalizeRef = useRef(false);

  const resetTyping = useCallback(() => {
    eventsRef.current = [];
    pendingFinalizeRef.current = false;
    setValue("");
  }, []);

  const restart = useCallback(() => {
    setStage("enroll");
    setRepIndex(0);
    setReps([]);
    setProfile(null);
    setResult(null);
    setMismatchFlash(false);
    resetTyping();
  }, [resetTyping]);

  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    // Ignore modifier/navigation keys — only real character-producing keys
    // and backspace matter for phrase timing, and backspace mid-attempt
    // invalidates this rep rather than silently corrupting its timing.
    if (e.key === "Backspace") { setMismatchFlash(true); resetTyping(); return; }
    if (e.key.length !== 1) return;
    setMismatchFlash(false);
    eventsRef.current.push({ key: e.key, type: "down", t: performance.now() });
  }, [resetTyping]);

  const finalize = useCallback(() => {
    const attempt = extractDwellFlight(eventsRef.current);
    if (stage === "enroll") {
      const nextReps = [...reps, attempt];
      setReps(nextReps);
      if (nextReps.length >= ENROLL_REPS) {
        setProfile(buildProfile(nextReps));
        setStage("ready");
      } else {
        setRepIndex(nextReps.length);
      }
    } else if (stage === "ready" && profile) {
      const score = scaledManhattanScore(profile, attempt);
      setResult({ score, band: riskBand(score), attempt });
      setStage("scored");
    }
    resetTyping();
  }, [stage, reps, profile, resetTyping]);

  const onKeyUp = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key.length !== 1) return;
    eventsRef.current.push({ key: e.key, type: "up", t: performance.now() });

    if (pendingFinalizeRef.current) {
      const downs = eventsRef.current.filter(ev => ev.type === "down").length;
      const ups = eventsRef.current.filter(ev => ev.type === "up").length;
      if (downs === ups) finalize();
    }
  }, [finalize]);

  const onChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setValue(next);
    if (next.length < PHRASE.length) return;

    const typed = next.slice(0, PHRASE.length);
    if (typed !== PHRASE) {
      setMismatchFlash(true);
      resetTyping();
      return;
    }

    // Mark ready to finalize — the actual finalize happens in onKeyUp once
    // the final keyup lands, see pendingFinalizeRef's docstring above.
    pendingFinalizeRef.current = true;
  }, [resetTyping]);

  const tryAgain = useCallback(() => {
    setStage("ready");
    setResult(null);
    resetTyping();
  }, [resetTyping]);

  const start = useCallback(() => {
    resetTyping();
  }, [resetTyping]);

  return {
    phrase: PHRASE, enrollReps: ENROLL_REPS,
    stage, repIndex, value, mismatchFlash, reps, result,
    onKeyDown, onKeyUp, onChange, restart, tryAgain, start,
  };
}
