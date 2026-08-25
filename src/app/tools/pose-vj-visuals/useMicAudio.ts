import { useCallback, useEffect, useRef, useState } from "react";

/** Live microphone amplitude via Web Audio's AnalyserNode — no precedent
 * elsewhere in this codebase (first audio-driven feature). Reacts to
 * whatever the mic hears (music playing nearby, clapping, talking); this
 * is plain volume, not beat/genre detection. Separate opt-in from the
 * camera since a mic permission prompt is a bigger ask than camera alone. */
export function useMicAudio() {
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [amplitude, setAmplitude] = useState(0); // 0-1

  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    ctxRef.current?.close();
    ctxRef.current = null;
    analyserRef.current = null;
    setActive(false);
    setAmplitude(0);
  }, []);

  const start = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      ctxRef.current = ctx;
      analyserRef.current = analyser;

      const data = new Uint8Array(analyser.frequencyBinCount);
      const loop = () => {
        analyser.getByteTimeDomainData(data);
        let sumSq = 0;
        for (const v of data) { const c = (v - 128) / 128; sumSq += c * c; }
        setAmplitude(Math.min(1, Math.sqrt(sumSq / data.length) * 4));
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
      setActive(true);
    } catch {
      setError("Couldn't access the microphone — check browser permissions.");
    }
  }, []);

  useEffect(() => () => stop(), [stop]);

  return { active, error, amplitude, start, stop };
}
