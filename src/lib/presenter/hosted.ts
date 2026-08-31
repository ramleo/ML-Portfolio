import type { Presenter } from "./types";

/**
 * A narrator the viewer pays for, with their own key, entered in the UI.
 *
 * Why text-to-speech and not a talking head: an avatar API (HeyGen, D-ID,
 * Synthesia) renders asynchronously — you post a script, poll a job, and get a
 * video back seconds or minutes later. That cannot narrate a clip that is
 * already playing. A neural TTS endpoint answers a single POST with audio,
 * which is fast enough to speak a line on its cue and is the thing people
 * actually want when they say the browser voice sounds poor. The avatar path
 * still exists in avatar.ts, configured server-side.
 *
 * The key is held in memory for as long as the panel is open and is sent to
 * exactly one place: the vendor the viewer chose. It never reaches this site's
 * own backend, and it is never written to disk — the same handling as the
 * API-key fields elsewhere in this project.
 *
 * UNTESTED AGAINST A LIVE VENDOR. Neither endpoint below has been exercised
 * with a real key, because doing so costs money that is not mine to spend. The
 * request shapes are the vendors' documented ones; if one is wrong this falls
 * back to the browser voice rather than going silent, and reports why.
 */
export type HostedProvider = "elevenlabs" | "openai";

export const HOSTED_LABELS: Record<HostedProvider, string> = {
  elevenlabs: "ElevenLabs (your key)",
  openai: "OpenAI (your key)",
};

/** A pleasant, widely available default per vendor. */
const DEFAULT_VOICE: Record<HostedProvider, string> = {
  elevenlabs: "21m00Tcm4TlvDq8ikWAM", // "Rachel", ElevenLabs' own sample voice
  openai: "alloy",
};

async function synthesise(
  provider: HostedProvider,
  key: string,
  text: string,
  signal?: AbortSignal
): Promise<Blob> {
  if (provider === "elevenlabs") {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${DEFAULT_VOICE.elevenlabs}`,
      {
        method: "POST",
        headers: { "xi-api-key": key, "Content-Type": "application/json" },
        body: JSON.stringify({ text, model_id: "eleven_turbo_v2_5" }),
        signal,
      }
    );
    if (!res.ok) throw new Error(`ElevenLabs ${res.status}`);
    return res.blob();
  }
  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "gpt-4o-mini-tts", voice: DEFAULT_VOICE.openai, input: text }),
    signal,
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}`);
  return res.blob();
}

class HostedPresenter implements Presenter {
  readonly id = "voice" as const;
  readonly label = "Hosted voice";
  readonly hasVisual = false;

  private provider: HostedProvider = "elevenlabs";
  private key = "";
  private audio: HTMLAudioElement | null = null;
  /** The next line, fetched while the current one is still speaking — a
   *  round-trip per line would otherwise show up as a gap before every cue. */
  private ahead = new Map<string, Promise<Blob>>();
  /** Set once a call has failed, so a bad key degrades to the browser voice
   *  immediately instead of failing again on every single line. */
  private broken = "";

  configure(provider: HostedProvider, key: string) {
    if (provider !== this.provider || key !== this.key) {
      this.ahead.clear();
      this.broken = "";
    }
    this.provider = provider;
    this.key = key;
  }

  /** Why it is not working, for the UI to show. */
  get problem() {
    return this.broken;
  }

  available() {
    return Boolean(this.key) && !this.broken;
  }

  /** Warm the cache for a line that is about to be needed. */
  prefetch(text: string) {
    if (!this.available() || this.ahead.has(text)) return;
    this.ahead.set(text, synthesise(this.provider, this.key, text).catch((e) => {
      this.ahead.delete(text);
      throw e;
    }));
  }

  async speak(text: string, signal?: AbortSignal) {
    if (!this.available()) throw new Error(this.broken || "no key");
    let blob: Blob;
    try {
      blob = await (this.ahead.get(text) ?? synthesise(this.provider, this.key, text, signal));
      this.ahead.delete(text);
    } catch (e) {
      this.broken = e instanceof Error ? e.message : "request failed";
      throw e;
    }
    const url = URL.createObjectURL(blob);
    const el = new Audio(url);
    this.audio = el;
    await el.play().catch(() => undefined);
    await new Promise<void>((resolve) => {
      const done = () => resolve();
      el.addEventListener("ended", done, { once: true });
      el.addEventListener("error", done, { once: true });
      signal?.addEventListener("abort", done, { once: true });
    });
    URL.revokeObjectURL(url);
  }

  stop() {
    this.audio?.pause();
    this.audio = null;
  }
}

export const hostedPresenter = new HostedPresenter();
