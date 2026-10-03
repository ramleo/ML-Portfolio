// Phase 0 of "learn from edits" (docs/QA_LEARN_FROM_EDITS_PLAN.md §12): MEASUREMENT
// only. When a user saves a generated test they changed, we classify WHAT KIND of
// line they changed (locator / assertion / other) so the Realtime Analytics
// dashboard can answer whether corrections are still frequent — and of what kind —
// now that locators are grounded, BEFORE we build the full feedback feature.
//
// Content-free by construction: this never emits test code, a host, or any text —
// only a changed-line COUNT and three booleans.

import { track } from "@/hooks/useAnalytics";
import { EV } from "@/lib/logEvents";

const LOCATOR = /getBy(Role|Text|Label|Placeholder|TestId|Title|AltText)\b|\.locator\(|frameLocator\(/;
const ASSERTION = /\bexpect\(|\.toBe|\.toHave|\.toContain|toBeVisible|toBeHidden/;

export type EditMeta = {
  lines_changed: number;
  locator_change: boolean;
  assertion_change: boolean;
  other_change: boolean;
};

/** Trimmed, non-empty lines present in one version but not the other (added or
 * removed) — a cheap symmetric diff, enough to classify an edit for counts. */
function changedLines(baseline: string, saved: string): string[] {
  const norm = (s: string) => new Set(s.split("\n").map((l) => l.trim()).filter(Boolean));
  const a = norm(baseline);
  const b = norm(saved);
  const out: string[] = [];
  for (const l of a) if (!b.has(l)) out.push(l); // removed
  for (const l of b) if (!a.has(l)) out.push(l); // added
  return out;
}

/** Content-free classification of a baseline->saved edit, or null when nothing
 * meaningful changed. Each changed line gets ONE primary category with assertion
 * precedence: an `expect(...)` line is an assertion edit even when it wraps a
 * locator (the user is tuning the check, not the selector). This keeps the
 * locator vs non-locator split clean — the exact question §12 asks: are
 * corrections STILL happening for non-locator reasons now that locators are
 * grounded? Over-attributing to "locator" would falsely inflate the case to build. */
export function editMeta(baseline: string, saved: string): EditMeta | null {
  if (!baseline || baseline.trim() === saved.trim()) return null;
  const lines = changedLines(baseline, saved);
  if (!lines.length) return null;
  let locator = false;
  let assertion = false;
  let other = false;
  for (const l of lines) {
    if (ASSERTION.test(l)) assertion = true;
    else if (LOCATOR.test(l)) locator = true;
    // "other" = a substantive line that is neither (e.g. a changed step, a URL, a
    // comment edit), ignoring pure structural punctuation like a lone brace.
    else if (!/^[{}()/;]+$/.test(l)) other = true;
  }
  return { lines_changed: lines.length, locator_change: locator, assertion_change: assertion, other_change: other };
}

/** Emit the content-free TEST_EDITED analytics event if the saved code is a real
 * correction of the generated baseline. Returns true when an event was sent (so the
 * caller can advance the baseline and avoid re-logging the same edit). Never throws. */
export function trackEdit(baseline: string, saved: string, ctx: { via: string; healed: boolean }): boolean {
  try {
    const m = editMeta(baseline, saved);
    if (!m) return false;
    track(EV.TEST_EDITED, { meta: { tool: "qa-run", ...m, via: ctx.via, healed: ctx.healed } });
    return true;
  } catch {
    return false; // analytics must never break Save
  }
}
