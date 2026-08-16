"use client";

import { useEffect, useRef, useState } from "react";

/** Chrome resolves getVoices() to [] until the async voice list actually
 * loads, signaled by "voiceschanged" — calling speak() before that just
 * gets the browser's single bundled fallback voice, which is the low-
 * fidelity one users are hearing. The 500ms timeout is a safety net for
 * browsers that never fire the event at all (e.g. some Safari builds). */
function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise(resolve => {
    const existing = window.speechSynthesis.getVoices();
    if (existing.length) { resolve(existing); return; }
    const handler = () => {
      window.speechSynthesis.removeEventListener("voiceschanged", handler);
      resolve(window.speechSynthesis.getVoices());
    };
    window.speechSynthesis.addEventListener("voiceschanged", handler);
    setTimeout(() => resolve(window.speechSynthesis.getVoices()), 500);
  });
}

/** Every OS/browser ships one bundled low-fidelity default voice plus
 * (usually) several higher-quality ones the user never explicitly picks —
 * this scores by naming conventions those higher-quality voices actually
 * use, so the clearer one gets selected automatically instead of whatever
 * happens to sort first. */
function pickVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (!voices.length) return null;
  const english = voices.filter(v => v.lang.toLowerCase().startsWith("en"));
  const pool = english.length ? english : voices;
  const scored = pool.map(v => {
    const name = v.name.toLowerCase();
    let score = 0;
    if (/natural|neural|premium|enhanced/.test(name)) score += 3;
    if (/google/.test(name)) score += 2;
    if (!v.localService) score += 1; // online voices are usually clearer than the bundled offline one
    return { v, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0].v;
}

/** Splits on sentence boundaries so each chunk is a short, independently
 * queued utterance — shorter utterances are what let Chrome's ~15s-pause
 * bug (see the resume() workaround below) actually recover instead of
 * leaving one long utterance stuck mid-sentence, and the natural pause
 * between chunks also reads as clearer than one run-on utterance. */
function splitSentences(text: string): string[] {
  const parts = text.match(/[^.!?\n]+[.!?\n]*/g) ?? [text];
  return parts.map(s => s.trim()).filter(Boolean);
}

/** Browser-native text-to-speech (window.speechSynthesis) for reading a
 * citation's caption aloud — zero backend cost, zero API key, entirely
 * client-side off text already generated at ingest. No server-side TTS
 * exists anywhere in this codebase, and none of the free-tier LLM
 * providers already used elsewhere (Groq/Mistral/Gemini/Cohere/Cerebras)
 * offer a comparable free TTS endpoint to cascade onto — the Web Speech
 * API is the only zero-setup option, so this stays 100% client-side. */
export function useNarration() {
  const [speaking, setSpeaking] = useState(false);
  const resumeTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const supported = typeof window !== "undefined" && !!window.speechSynthesis;

  const clearResumeWorkaround = () => {
    if (resumeTimer.current) { clearInterval(resumeTimer.current); resumeTimer.current = null; }
  };

  const stop = () => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    clearResumeWorkaround();
    setSpeaking(false);
  };

  useEffect(() => stop, [supported]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = async (text: string) => {
    if (!supported) return;
    if (speaking) { stop(); return; }
    window.speechSynthesis.cancel(); // stop any other citation already reading

    const voice = pickVoice(await loadVoices());
    const sentences = splitSentences(text);
    setSpeaking(true);

    // Chrome silently pauses an active speechSynthesis session ~15s in and
    // never resumes on its own — a long-standing browser bug, not something
    // fixable upstream. Nudging resume() periodically is the standard
    // workaround; harmless no-op when nothing's actually paused.
    resumeTimer.current = setInterval(() => {
      if (window.speechSynthesis.speaking) window.speechSynthesis.resume();
    }, 10_000);

    const speakNext = (i: number) => {
      if (i >= sentences.length) { stop(); return; }
      const utter = new SpeechSynthesisUtterance(sentences[i]);
      if (voice) utter.voice = voice;
      utter.rate = 0.95; // default (1.0) reads as rushed/slurred for longer captions
      utter.pitch = 1;
      utter.onend = () => speakNext(i + 1);
      utter.onerror = () => stop();
      window.speechSynthesis.speak(utter);
    };
    speakNext(0);
  };

  return { speaking, toggle, supported };
}
