import type { Presenter } from "./types";
import { voicePresenter } from "./voice";

/**
 * The paid presenter — a hosted talking-head avatar.
 *
 * DELIBERATELY NOT IMPLEMENTED. Every vendor in this space (HeyGen, Synthesia,
 * D-ID, Tavus) is a paid subscription with a server-side API key, so there is
 * nothing here to run until someone buys one. What is here is the shape the
 * implementation has to fit, so that buying a subscription is an afternoon and
 * not a rewrite.
 *
 * To turn it on:
 *   1. Add a backend route that takes { text } and returns a video/audio URL,
 *      keeping the vendor key server-side — never NEXT_PUBLIC_.
 *   2. Point NEXT_PUBLIC_PRESENTER_ENDPOINT at it.
 *   3. Set NEXT_PUBLIC_PRESENTER=avatar.
 * Nothing else in the demo system changes: not the scripts, not the player,
 * not the tool pages.
 *
 * Until then this falls back to the free voice rather than failing, so a
 * misconfigured environment variable degrades instead of breaking the page.
 */
const ENDPOINT = process.env.NEXT_PUBLIC_PRESENTER_ENDPOINT ?? "";

class AvatarPresenter implements Presenter {
  readonly id = "avatar" as const;
  readonly label = "Presenter";
  readonly hasVisual = true;

  private host: HTMLElement | null = null;
  private video: HTMLVideoElement | null = null;

  available() {
    return Boolean(ENDPOINT);
  }

  attach(host: HTMLElement) {
    this.host = host;
    if (!this.available()) return;
    const v = document.createElement("video");
    v.playsInline = true;
    v.className = "hb-demo-avatar";
    host.appendChild(v);
    this.video = v;
  }

  detach() {
    this.video?.remove();
    this.video = null;
    this.host = null;
  }

  async speak(text: string, signal?: AbortSignal) {
    if (!this.available()) return voicePresenter.speak(text, signal);
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal,
    });
    if (!res.ok) return voicePresenter.speak(text, signal);
    const { url } = (await res.json()) as { url?: string };
    const v = this.video;
    if (!url || !v) return voicePresenter.speak(text, signal);
    v.src = url;
    await v.play().catch(() => undefined);
    await new Promise<void>((resolve) => {
      const end = () => resolve();
      v.addEventListener("ended", end, { once: true });
      signal?.addEventListener("abort", end, { once: true });
    });
  }

  stop() {
    this.video?.pause();
    voicePresenter.stop();
  }
}

export const avatarPresenter = new AvatarPresenter();
