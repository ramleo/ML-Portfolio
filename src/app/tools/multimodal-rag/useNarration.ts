"use client";

import { useEffect, useRef, useState } from "react";

/** Browser-native text-to-speech (window.speechSynthesis) for reading a
 * citation's caption aloud — zero backend cost, zero API key, entirely
 * client-side off text already generated at ingest. No server-side TTS
 * exists anywhere in this codebase, and none of the free-tier LLM
 * providers already used elsewhere (Groq/Mistral/Gemini/Cohere/Cerebras)
 * offer a comparable free TTS endpoint to cascade onto — the Web Speech
 * API is the only zero-setup option, so this stays 100% client-side. */
export function useNarration() {
  const [speaking, setSpeaking] = useState(false);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);
  const supported = typeof window !== "undefined" && !!window.speechSynthesis;

  useEffect(() => {
    return () => { if (supported) window.speechSynthesis.cancel(); };
  }, [supported]);

  const toggle = (text: string) => {
    if (!supported) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    window.speechSynthesis.cancel(); // stop any other citation already reading
    const utter = new SpeechSynthesisUtterance(text);
    utter.onend = () => setSpeaking(false);
    utter.onerror = () => setSpeaking(false);
    utterRef.current = utter;
    window.speechSynthesis.speak(utter);
    setSpeaking(true);
  };

  return { speaking, toggle, supported };
}
