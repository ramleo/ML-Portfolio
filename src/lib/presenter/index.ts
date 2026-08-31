import type { Presenter } from "./types";
import { avatarPresenter } from "./avatar";
import { hostedPresenter } from "./hosted";
import type { HostedConfig } from "./providers";
import { voicePresenter } from "./voice";

export type { Presenter } from "./types";
export type { HostedConfig } from "./providers";
export { PRESETS, CUSTOM } from "./providers";
export { hostedPresenter } from "./hosted";

/**
 * Who narrates, in priority order:
 *
 *   1. a vendor the viewer is paying for with their own key, described in the
 *      UI — any vendor, not a list this project chose
 *   2. a hosted avatar this deployment has configured server-side
 *   3. the browser's own speech synthesiser — free, always there
 *
 * Everything else asks for "the presenter" and never names one.
 */
let configured = false;

/** Called by the UI when the viewer changes provider settings or the key.
 *  A plain function, not a hook — an earlier `use` prefix made the linter
 *  treat it as one. The key is held in memory only: never written to storage,
 *  and never sent anywhere except the endpoint the viewer named. */
export function setOwnKey(cfg: HostedConfig | null, key: string) {
  configured = Boolean(cfg?.endpoint && key);
  hostedPresenter.configure(cfg, key);
}

export function getPresenter(): Presenter {
  if (configured && hostedPresenter.available()) return hostedPresenter;
  const want = process.env.NEXT_PUBLIC_PRESENTER;
  if (want === "avatar" && avatarPresenter.available()) return avatarPresenter;
  return voicePresenter;
}
