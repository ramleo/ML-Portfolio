import type { Presenter } from "./types";
import { dig, fill, forJson, type HostedConfig } from "./providers";

/**
 * A narrator the viewer pays for, with their own key, entered in the UI.
 *
 * Vendor-agnostic on purpose: it knows how to send one POST and find audio in
 * the reply, and everything specific to a vendor is data the viewer can edit
 * (see providers.ts). Any service that turns a request into audio can be used
 * here, whether or not this project has heard of it.
 *
 * Why text-to-speech and not a talking head: an avatar API renders
 * asynchronously — post a script, poll a job, get a video back seconds or
 * minutes later — which cannot narrate a clip that is already playing. The
 * avatar path still exists in avatar.ts, configured server-side.
 *
 * The key is held in memory for as long as the panel is open and is sent to
 * exactly one place: the endpoint the viewer named. It never reaches this
 * site's own backend and is never written to storage.
 *
 * UNTESTED AGAINST A LIVE VENDOR — that costs money that is not mine to
 * spend. The preset request shapes are the vendors' documented ones. A failure
 * falls back to the browser voice and reports why rather than going silent.
 */

/** Raw PCM has no container, so no browser will play it. Gemini returns
 *  signed 16-bit little-endian mono; this is the 44-byte header that makes it
 *  a WAV. */
function wav(pcm: Uint8Array<ArrayBuffer>, rate: number): Blob {
  const head = new DataView(new ArrayBuffer(44));
  const put = (o: number, s: string) =>
    [...s].forEach((c, i) => head.setUint8(o + i, c.charCodeAt(0)));
  put(0, "RIFF");
  head.setUint32(4, 36 + pcm.length, true);
  put(8, "WAVEfmt ");
  head.setUint32(16, 16, true);
  head.setUint16(20, 1, true);        // PCM
  head.setUint16(22, 1, true);        // mono
  head.setUint32(24, rate, true);
  head.setUint32(28, rate * 2, true); // byte rate
  head.setUint16(32, 2, true);        // block align
  head.setUint16(34, 16, true);       // bits
  put(36, "data");
  head.setUint32(40, pcm.length, true);
  return new Blob([head.buffer, pcm], { type: "audio/wav" });
}

/** Typed as ArrayBuffer-backed so it is accepted as a BlobPart. */
const bytes = (b64: string): Uint8Array<ArrayBuffer> => {
  const out = new Uint8Array(new ArrayBuffer(b64.length ? atob(b64).length : 0));
  const raw = atob(b64);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
};

async function synthesise(
  cfg: HostedConfig,
  key: string,
  text: string,
  signal?: AbortSignal
): Promise<Blob> {
  const vars = { key, voice: cfg.voice, text: forJson(text) };
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (cfg.header) headers[cfg.header] = fill(cfg.value, vars);

  const res = await fetch(fill(cfg.endpoint, vars), {
    method: "POST",
    headers,
    body: fill(cfg.body, vars),
    signal,
  });
  if (!res.ok) {
    // The vendor's own message is far more useful than the status alone —
    // "voice not found" and "quota exceeded" are both 400 somewhere.
    const why = (await res.text().catch(() => "")).slice(0, 140);
    throw new Error(`${res.status}${why ? ` — ${why}` : ""}`);
  }
  if (!cfg.audioPath) return res.blob();

  const json = await res.json();
  const b64 = dig(json, cfg.audioPath);
  if (typeof b64 !== "string") {
    throw new Error(`no audio at "${cfg.audioPath}" in the reply`);
  }
  const raw = bytes(b64);
  return cfg.pcmRate ? wav(raw, cfg.pcmRate) : new Blob([raw], { type: cfg.mime });
}

class HostedPresenter implements Presenter {
  readonly id = "voice" as const;
  readonly label = "Hosted voice";
  readonly hasVisual = false;

  private cfg: HostedConfig | null = null;
  private key = "";
  private audio: HTMLAudioElement | null = null;
  /** Set once a call has failed, so a bad key or endpoint degrades to the
   *  browser voice immediately rather than failing again on every line. */
  private broken = "";

  configure(cfg: HostedConfig | null, key: string) {
    const same = JSON.stringify(cfg) === JSON.stringify(this.cfg) && key === this.key;
    if (!same) this.broken = "";
    this.cfg = cfg;
    this.key = key;
  }

  /** Why it is not working, for the UI to show. */
  get problem() {
    return this.broken;
  }

  available() {
    return Boolean(this.cfg?.endpoint && this.key) && !this.broken;
  }

  async speak(text: string, signal?: AbortSignal) {
    if (!this.cfg || !this.available()) throw new Error(this.broken || "not configured");
    let blob: Blob;
    try {
      blob = await synthesise(this.cfg, this.key, text, signal);
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
