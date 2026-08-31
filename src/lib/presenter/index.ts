import type { Presenter } from "./types";
import { avatarPresenter } from "./avatar";
import { hostedPresenter, type HostedProvider } from "./hosted";
import { voicePresenter } from "./voice";

export type { Presenter } from "./types";
export { HOSTED_LABELS, type HostedProvider } from "./hosted";
export { hostedPresenter } from "./hosted";

/**
 * Who narrates, in priority order:
 *
 *   1. a vendor the viewer is paying for with their own key, entered in the UI
 *   2. a hosted avatar this deployment has configured server-side
 *   3. the browser's own speech synthesiser — free, always there
 *
 * Everything else in the app asks for "the presenter" and never names one, so
 * adding a fourth is this function and one new file.
 */
let byo: { provider: HostedProvider; key: string } | null = null;

/** Called by the UI when the viewer supplies or clears a key. Plain function,
 *  not a hook — an earlier `use` prefix made the linter treat it as one. The key is held
 *  here in memory only: not written to storage, and never sent anywhere except
 *  the vendor the viewer picked. */
export function setOwnKey(provider: HostedProvider | null, key: string) {
  byo = provider && key ? { provider, key } : null;
  if (byo) hostedPresenter.configure(byo.provider, byo.key);
}

export function getPresenter(): Presenter {
  if (byo && hostedPresenter.available()) return hostedPresenter;
  const want = process.env.NEXT_PUBLIC_PRESENTER;
  if (want === "avatar" && avatarPresenter.available()) return avatarPresenter;
  return voicePresenter;
}
