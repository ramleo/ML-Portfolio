import type { Presenter } from "./types";
import { avatarPresenter } from "./avatar";
import { voicePresenter } from "./voice";

export type { Presenter } from "./types";

/**
 * One place decides who narrates. Everything else asks for "the presenter"
 * and never names an implementation, which is the whole point: swapping in a
 * paid avatar later is this function returning a different object.
 */
export function getPresenter(): Presenter {
  const want = process.env.NEXT_PUBLIC_PRESENTER;
  if (want === "avatar" && avatarPresenter.available()) return avatarPresenter;
  return voicePresenter;
}
