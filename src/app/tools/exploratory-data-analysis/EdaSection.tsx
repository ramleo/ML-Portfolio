"use client";
import type { ReactNode } from "react";

/** Section icons as inline SVG. The page these replace used 🔥 💡 📊 📦 👁 🗂,
 *  which render as a different picture on every platform, carry no accessible
 *  name, and sit on the text baseline rather than the icon's. */
const PATHS: Record<string, ReactNode> = {
  overview: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
  narrative: <><path d="M4 5h16M4 10h16M4 15h10" strokeLinecap="round" /></>,
  readiness: <><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" /></>,
  insight: <><path d="M12 3a6 6 0 0 0-3 11v3h6v-3a6 6 0 0 0-3-11z" /><path d="M10 21h4" strokeLinecap="round" /></>,
  ai: <><path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5z" strokeLinejoin="round" /></>,
  table: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M9 9v11" /></>,
  chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" strokeLinecap="round" /></>,
  box: <><rect x="5" y="8" width="14" height="8" rx="1.5" /><path d="M12 4v4M12 16v4M5 12h14" strokeLinecap="round" /></>,
  grid: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M3 15h18M9 3v18M15 3v18" /></>,
  cube: <><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" strokeLinejoin="round" /><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5" /></>,
  download: <><path d="M12 3v12M7 11l5 5 5-5M4 20h16" strokeLinecap="round" strokeLinejoin="round" /></>,
  broom: <><path d="M19 4l-8 8M9 10l5 5-4 4-5-5 4-4z" strokeLinejoin="round" /><path d="M5 19l2 2" strokeLinecap="round" /></>,
};

export type SectionIcon = keyof typeof PATHS;

export function Icon({ name, size = 14 }: { name: SectionIcon; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="1.7" aria-hidden focusable="false" style={{ flexShrink: 0 }}>
      {PATHS[name]}
    </svg>
  );
}

export const cardStyle: React.CSSProperties = {
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: "1rem 1.15rem",
  minWidth: 0,
};

/**
 * A titled panel with an anchor the section nav can jump to.
 *
 * `empty` is not decoration. The legacy page draws an empty correlation panel
 * for a one-numeric-column dataset and says nothing, which reads as a broken
 * chart rather than a dataset that cannot have one. Every caller that can
 * have nothing to show passes a sentence explaining why.
 */
export default function EdaSection({
  id, title, icon, meta, note, empty, right, children, testId,
}: {
  id: string;
  title: string;
  icon: SectionIcon;
  /** The short context line beside the title — a filename, a count, an
   *  explained-variance figure. Legacy carried one on every panel and it is
   *  how a reader knows what they are looking at without reading a paragraph.
   *  `note` is the sentence below; this is the label on the same line. */
  meta?: ReactNode;
  note?: ReactNode;
  empty?: string;
  right?: ReactNode;
  children?: ReactNode;
  testId?: string;
}) {
  return (
    <section id={id} data-wt={testId} style={{ ...cardStyle, scrollMarginTop: 132 }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
        <span style={{ color: "var(--text3)", display: "flex" }}><Icon name={icon} /></span>
        <h2 style={{
          fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.08em",
          textTransform: "uppercase", color: "var(--text3)", margin: 0,
        }}>
          {title}
        </h2>
        {meta && (
          <span style={{ fontSize: "0.7rem", fontWeight: 400, color: "var(--text3)" }}>
            {meta}
          </span>
        )}
        {right && <div style={{ marginLeft: "auto" }}>{right}</div>}
      </div>

      {note && (
        <p style={{ fontSize: "0.8rem", color: "var(--text3)", margin: "0.45rem 0 0", lineHeight: 1.55, maxWidth: "76ch" }}>
          {note}
        </p>
      )}

      {empty ? (
        <p style={{ fontSize: "0.85rem", color: "var(--text3)", margin: "0.9rem 0 0.2rem", lineHeight: 1.6, maxWidth: "70ch" }}>
          {empty}
        </p>
      ) : (
        <div style={{ marginTop: "0.85rem", minWidth: 0 }}>{children}</div>
      )}
    </section>
  );
}

/** Wide content — a matrix, a scatter grid, a table — scrolls inside its own
 *  box. Without `minWidth: 0` the grid item it sits in refuses to shrink below
 *  its content and drags the whole page sideways instead. */
export function Scroller({ children, min }: { children: ReactNode; min?: number }) {
  return (
    <div style={{ overflowX: "auto", minWidth: 0 }}>
      <div style={{ minWidth: min }}>{children}</div>
    </div>
  );
}
