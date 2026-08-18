"use client";

import { createPortal } from "react-dom";

const PREVIEW_WIDTH = 300;

/** Full-description hover preview for a clamped capability-card
 * description (MLCapabilities.tsx) — portaled to document.body (not
 * rendered inside the card) because the capability grid can sit inside a
 * horizontally-scrolling container (overflow-x: auto), which would
 * otherwise clip any absolutely-positioned popover that extends past the
 * card's own bounds. Position is computed from the trigger's on-screen
 * rect at hover time and clamped to the viewport so it never runs
 * off-screen for cards near an edge.
 *
 * Split out of MLCapabilities.tsx to keep that file under the project's
 * 400-line limit.
 */
export function CapabilityDescriptionPreview({ text, accent, anchorRect }: { text: string; accent: string; anchorRect: DOMRect }) {
  const left = Math.min(Math.max(8, anchorRect.left), window.innerWidth - PREVIEW_WIDTH - 8);
  const spaceBelow = window.innerHeight - anchorRect.bottom;
  const openUpward = spaceBelow < 160;
  const top = openUpward ? anchorRect.top - 8 : anchorRect.bottom + 8;

  return createPortal(
    <div
      style={{
        position: "fixed",
        left,
        top,
        transform: openUpward ? "translateY(-100%)" : "none",
        width: PREVIEW_WIDTH,
        zIndex: 9999,
        pointerEvents: "none",
        borderRadius: 12,
        overflow: "hidden",
        background: "var(--bg-card)",
        border: `1px solid ${accent}44`,
        boxShadow: "0 12px 32px rgba(0,0,0,0.45)",
      }}
    >
      <div style={{ height: 3, background: accent }} />
      <p style={{ margin: 0, padding: "0.85rem 1rem", fontSize: "0.8rem", lineHeight: 1.6, color: "var(--text2)" }}>
        {text}
      </p>
    </div>,
    document.body
  );
}
