/**
 * The presenter: whoever is narrating a guided demo.
 *
 * There is exactly one interface and the demo player only ever talks to this.
 * Today the only implementation is the browser's own speech synthesiser, which
 * costs nothing and works offline. A hosted avatar presenter (HeyGen,
 * Synthesia, D-ID) is a paid subscription, so it exists here as a stub that
 * refuses politely and falls back to the voice — implementing it later means
 * filling in one file and setting one environment variable, and no demo
 * script, no player and no tool page changes.
 */
export interface Presenter {
  /** A stable name for the UI to show. */
  readonly id: "voice" | "avatar";
  readonly label: string;
  /** True when this presenter can actually run in this browser right now. */
  available(): boolean;
  /** Say one line. Resolves when the line has finished, so the player can
   *  hold a step on screen for exactly as long as it is being narrated. */
  speak(text: string, signal?: AbortSignal): Promise<void>;
  /** Drop anything queued and go quiet immediately. */
  stop(): void;
  /** Use this specific voice. Optional because a hosted avatar has one voice
   *  and no say in the matter; the browser presenter has dozens. */
  setVoice?(voiceURI: string): void;
  /** Narrate this many times faster than normal. Optional in the same way
   *  setVoice is: a presenter that cannot vary its speed simply omits it.
   *
   *  It exists because a clip the viewer has put into 2x is a clip whose cues
   *  arrive twice as fast, and a narrator that does not know that speaks every
   *  line at its full wall-clock length and gets cut off by the next cue.
   *  Measured on a 125s clip at 2x: 8 of 10 lines silenced mid-sentence. */
  setRate?(rate: number): void;
  /** Optional on-screen presence — a talking head, a waveform. The voice
   *  presenter has none, which is why this is optional rather than a
   *  component every implementation has to supply. */
  readonly hasVisual: boolean;
  /** Where a visual presenter renders, if it has one. Given the element by
   *  the player on mount. */
  attach?(host: HTMLElement): void;
  detach?(): void;
}
