"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { clearMark, getLanding, getMark, noMark, returnToMark, subscribe, watchJumps } from "./handbookJump";

/** How far away the reader has to have landed before coming back is worth
 *  offering. A page and a half: below that the origin is a scroll away and
 *  probably still on screen, and a button for it is clutter. */
const FAR = 1.5;

/** And how far they have to scroll by hand from where they landed before the
 *  offer is withdrawn. Four screens in either direction is not looking
 *  something up any more — it is reading, or it is navigating by hand, and
 *  either way the trip the button describes is over. */
const STALE = 4;

/**
 * "Back to chapter 34" — the way home from a jump.
 *
 * Sits opposite the rail rather than beside it. The rail is a map of the whole
 * book and is always there; this is a single transient offer about one
 * particular trip, and mixing the two would make the permanent thing look
 * conditional.
 *
 * It appears on distance rather than on the jump itself, which is what makes
 * it quiet: a jump that lands nearby never shows a button, and one that the
 * reader then scrolls back from on their own puts it away again without being
 * dismissed. See handbookJump.ts for when a mark is set and when it survives.
 */
export default function HandbookReturn() {
  const mark = useSyncExternalStore(subscribe, getMark, noMark);
  const [away, setAway] = useState(0);

  useEffect(() => watchJumps(), []);

  // Only while there is somewhere to go back to: this is the longest page on
  // the site and a scroll listener that runs for nothing is not free.
  useEffect(() => {
    if (!mark) return;
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const landing = getLanding();
        if (landing !== null && Math.abs(window.scrollY - landing) > STALE * window.innerHeight) {
          clearMark();
          return;
        }
        setAway(Math.abs(window.scrollY - mark.y) / window.innerHeight);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [mark]);

  if (!mark || away < FAR) return null;

  return (
    <button type="button" className="hb-return" onClick={returnToMark}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M9 14L4 9l5-5" />
        <path d="M4 9h10a6 6 0 0 1 0 12h-3" />
      </svg>
      Back to <strong>{mark.label}</strong>
    </button>
  );
}
