import { LOOKAHEAD, sentences, speakable, usableVoices } from "@/lib/speech";
import type { Presenter } from "./types";

/**
 * The free presenter: the speech engine already in the visitor's browser.
 *
 * Note what this means and does not mean — the voice belongs to the visitor's
 * operating system, so two people hear two different narrators, and quality
 * ranges from Android's neural voices down to a compact macOS voice. That is
 * the trade for costing nothing and needing no backend.
 */
class VoicePresenter implements Presenter {
  readonly id = "voice" as const;
  readonly label = "Narrated";
  readonly hasVisual = false;

  private stopped = false;
  /** Empty means "whichever this browser ranks best" — see usableVoices(). */
  private chosen = "";

  setVoice(voiceURI: string) {
    this.chosen = voiceURI;
  }

  available() {
    return typeof window !== "undefined" && "speechSynthesis" in window;
  }

  stop() {
    this.stopped = true;
    if (this.available()) window.speechSynthesis.cancel();
  }

  /**
   * Speaks one line and resolves when it is finished. The line is cut into
   * sentences and queued LOOKAHEAD deep for the same reason as the handbook's
   * read-aloud: the synthesiser only runs seamlessly from one utterance into
   * the next if the next is already in its queue.
   */
  speak(text: string, signal?: AbortSignal) {
    if (!this.available()) return Promise.resolve();
    this.stopped = false;
    const parts = sentences(speakable(text));
    if (!parts.length) return Promise.resolve();

    return new Promise<void>((resolve) => {
      const all = usableVoices();
      const voice = all.find((v) => v.voiceURI === this.chosen) ?? all[0];
      let pushed = 0;
      let inFlight = 0;
      let finished = false;

      const done = () => {
        if (finished) return;
        finished = true;
        resolve();
      };
      const bail = () => {
        this.stopped = true;
        window.speechSynthesis.cancel();
        done();
      };
      signal?.addEventListener("abort", bail, { once: true });

      const fill = () => {
        while (pushed < parts.length && inFlight < LOOKAHEAD) {
          const u = new SpeechSynthesisUtterance(parts[pushed++]);
          u.rate = 0.95;
          u.pitch = 0.95;
          if (voice) {
            u.voice = voice;
            u.lang = voice.lang;
          }
          const next = () => {
            inFlight = Math.max(0, inFlight - 1);
            if (this.stopped || signal?.aborted) return done();
            if (pushed >= parts.length && inFlight === 0) return done();
            fill();
          };
          u.onend = next;
          u.onerror = next;
          inFlight++;
          window.speechSynthesis.speak(u);
        }
      };
      fill();
    });
  }
}

export const voicePresenter = new VoicePresenter();
