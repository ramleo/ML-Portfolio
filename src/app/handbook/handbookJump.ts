import { headingRef } from "./handbookIndex";

/**
 * Where the reader was before they jumped.
 *
 * The rail, the contents and the find bar all move the reader hundreds of
 * thousands of pixels in one gesture, and none of them left a way back. The
 * rail solves getting *up* — it cannot know that the reader was forty pages
 * into chapter 34 and only wanted to check one table in chapter 6.
 *
 * One slot, not a stack. A stack sounds more complete and reads worse: after
 * six hops the reader has no model of where "back" goes, and the thing they
 * actually want is always the last place they were *reading*, not the last
 * place they were *looking*. That distinction is what `moved` below is for.
 */

export type Mark = {
  /** Absolute scroll position, in pixels from the top of the document. */
  y: number;
  /** "Chapter 34: Something" — what to call the place on the button. */
  label: string;
};

let mark: Mark | null = null;

/**
 * Has the reader scrolled under their own power since the mark was set?
 *
 * While false, a further jump does not overwrite the mark: walking search hits
 * with Enter is one navigation, not eight, and each step would otherwise
 * repoint "back" at the previous hit until the original reading position was
 * gone. It goes true again the moment the reader touches the page themselves,
 * because that is the point at which they have started reading where they
 * landed and *that* becomes the place worth coming back to.
 */
let moved = true;

/**
 * Where the jump actually put the reader, learned from their first movement
 * afterwards rather than measured at the time — a smooth scroll is still in
 * flight when markJump returns, so there is nothing true to record yet.
 *
 * It exists so the offer can expire. Without it "back to chapter 31" sits
 * there for the rest of the session: the reader jumps out of 31, reads 6, 7
 * and 8 on their own, and is still being offered a return to a chapter they
 * finished with long ago.
 */
let landing: number | null = null;

/** Which navigation the current mark belongs to — see markJump. */
let lastGroup: string | undefined;

const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

export function subscribe(fn: () => void) {
  subs.add(fn);
  return () => void subs.delete(fn);
}

export function getMark() {
  return mark;
}

export const getLanding = () => landing;

/** Server snapshot for useSyncExternalStore: nothing is marked before hydration. */
export const noMark = () => null;

/** The chapter a given scroll position sits inside, named the way the contents
 *  names it. headingRef is the find bar's, deliberately: a reader who searched
 *  for a chapter and a reader who jumped out of one should see it called the
 *  same thing in both places. */
function chapterAt(y: number): string {
  const heads = document.querySelectorAll<HTMLElement>(".hb-body h1.bk-chapter, .hb-body .bk-partpage h1");
  let found = "";
  for (const el of heads) {
    if (el.getBoundingClientRect().top + window.scrollY > y + 4) break;
    const ref = headingRef(el);
    found = ref.num && ref.title ? `${ref.num}: ${ref.title}` : ref.title || ref.num;
  }
  // Before the first chapter heading there is the title, the contents and the
  // introduction — "the top" is both true and shorter than any of their names.
  return found || "the top";
}

/** Called by anything that is about to move the reader a long way. */
/**
 * Where the reader considers themselves to be, which is not the top edge of
 * the window.
 *
 * A chapter heading sitting a third of the way down the screen means the top
 * edge is still inside the *previous* chapter — so marking at scrollY named
 * the place the reader had just finished, one chapter behind where they
 * actually were. The probe is offset to where the eye is instead. Only the
 * label uses it; the mark itself still stores the true scroll position,
 * because that is what has to be restored.
 */
const READING_LINE = 0.38;

/**
 * Called by anything about to move the reader a long way.
 *
 * `group` names the navigation, not the hop. Walking search hits with Enter is
 * one navigation and passes the same group each time, so the mark keeps
 * pointing at where reading stopped rather than at the previous hit. Anything
 * that omits it — the rail, a contents link — is a new navigation and always
 * takes a fresh mark. Without that distinction a mark set on the first jump of
 * a session survived every later one, and "back" kept naming a chapter the
 * reader had left three jumps ago.
 */
export function markJump(group?: string) {
  if (mark && !moved && group !== undefined && group === lastGroup) return;
  lastGroup = group;
  mark = { y: window.scrollY, label: chapterAt(window.scrollY + window.innerHeight * READING_LINE) };
  moved = false;
  landing = null;
  emit();
}

/** Told from outside when the reader moves themselves in a way no input event
 *  describes — dragging the rail to scrub is a long, deliberate scroll that
 *  fires no wheel and no key. */
export function movedByHand() {
  if (mark && landing === null) landing = window.scrollY;
  moved = true;
}

export function clearMark() {
  if (!mark) return;
  mark = null;
  landing = null;
  moved = true;
  lastGroup = undefined;
  emit();
}

/** Go back, and forget — the button has done its job and a second press
 *  should not bounce the reader out to where they just came from. */
export function returnToMark() {
  const to = mark?.y;
  clearMark();
  if (to !== undefined) window.scrollTo({ top: to, behavior: "smooth" });
}

/**
 * Watches the two things the store cannot see for itself: the reader scrolling
 * by hand, and the contents links.
 *
 * Contents rows are plain anchors rendered from the Markdown, so there is no
 * component to hang an onClick on — the click is caught on the way down
 * instead, before the browser acts on the fragment. The rail and the find bar
 * call markJump() directly; they are ours.
 */
export function watchJumps() {
  // Deliberately not "scroll": a smooth programmatic scroll fires that too,
  // and would mark the reader as having moved by hand halfway through the very
  // jump being recorded. These four are inputs, and only a person makes them.
  const byHand = movedByHand;
  const onKey = (e: KeyboardEvent) => {
    if (/^(Arrow|Page)|^( |Home|End)$/.test(e.key) && !(e.target instanceof HTMLInputElement)) movedByHand();
  };
  const onClick = (e: MouseEvent) => {
    const a = (e.target as HTMLElement | null)?.closest?.("a[href^='#']");
    if (a && a.closest(".hb-body")) markJump();
  };

  window.addEventListener("wheel", byHand, { passive: true });
  window.addEventListener("touchmove", byHand, { passive: true });
  window.addEventListener("keydown", onKey);
  document.addEventListener("click", onClick, true);
  return () => {
    window.removeEventListener("wheel", byHand);
    window.removeEventListener("touchmove", byHand);
    window.removeEventListener("keydown", onKey);
    document.removeEventListener("click", onClick, true);
  };
}
