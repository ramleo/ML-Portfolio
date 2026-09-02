"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { clearMark, getLanding, getMark, markJump, noMark, returnToMark, subscribe, watchJumps } from "./handbookJump";

/** How far away the reader has to have landed before coming back is worth
 *  offering. A page and a half: below that the origin is a scroll away and
 *  probably still on screen, and a button for it is clutter. */
const FAR = 1.5;

/** And how far they have to scroll by hand from where they landed before the
 *  offer is withdrawn. Four screens in either direction is not looking
 *  something up any more — it is reading, or it is navigating by hand, and
 *  either way the trip the button describes is over. */
const STALE = 4;

/** How deep into the book the reader has to be before the way out is worth
 *  showing. One screen: any less and the top is already a flick away. */
const DEEP = 1;

/**
 * The two ways out of the book, bottom-left, opposite the rail.
 *
 * "Back to chapter 34" is a transient offer about one particular trip. "Top"
 * is unconditional — anywhere past the first screen of a 387,000-pixel page,
 * there is a way out that needs no jump to have happened first.
 *
 * They sit opposite the rail rather than beside it. The rail is a map of the
 * whole book and is always there; mixing a conditional offer into it would
 * make the permanent thing look conditional.
 *
 * The return offer appears on distance rather than on the jump itself, which
 * is what makes it quiet: a jump that lands nearby never shows a button, and
 * one the reader then scrolls back from on their own puts it away again
 * without being dismissed. See handbookJump.ts for when a mark is set and when
 * it survives.
 */
export default function HandbookReturn() {
  const mark = useSyncExternalStore(subscribe, getMark, noMark);
  const [away, setAway] = useState(0);
  const [deep, setDeep] = useState(false);

  useEffect(() => watchJumps(), []);

  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        setDeep(window.scrollY > window.innerHeight * DEEP);
        const m = getMark();
        if (!m) return void setAway(0);
        const landing = getLanding();
        if (landing !== null && Math.abs(window.scrollY - landing) > STALE * window.innerHeight) {
          clearMark();
          return;
        }
        setAway(Math.abs(window.scrollY - m.y) / window.innerHeight);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [mark]);

  /** Going to the top is itself a jump, so it leaves a mark like any other —
   *  a reader who bails out to the contents can get back to where they were. */
  const toTop = () => {
    markJump();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const showReturn = mark !== null && away >= FAR;
  if (!showReturn && !deep) return null;

  return (
    <div className="hb-backs">
      {showReturn && (
        <button type="button" className="hb-return" onClick={returnToMark}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 14L4 9l5-5" />
            <path d="M4 9h10a6 6 0 0 1 0 12h-3" />
          </svg>
          Back to <strong>{mark.label}</strong>
        </button>
      )}
      {deep && (
        <button type="button" className="hb-top" onClick={toTop} aria-label="Back to the top of the handbook">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 19V5" />
            <path d="M5 12l7-7 7 7" />
          </svg>
          Top
        </button>
      )}
    </div>
  );
}
