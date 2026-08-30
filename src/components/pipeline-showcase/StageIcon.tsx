/**
 * The per-stage glyphs.
 *
 * StageIcon draws the path and stays private to this file — IconTile is the
 * only thing anything else needs, and both callers want the tinted frame. Note
 * there are two other components named StageIcon in this codebase (pipeline/
 * for the builder tool, pipeline-cinema/ for the animation); they are unrelated
 * drawings, which is why these live in their own folder.
 */
function StageIcon({ step, accent, size = 22 }: { step: number; accent: string; size?: number }) {
  const props = {
    viewBox: "0 0 24 24",
    width: size,
    height: size,
    fill: "none" as const,
    stroke: accent,
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (step) {
    case 1: // Database cylinder — data being ingested
      return (
        <svg {...props}>
          <ellipse cx="12" cy="5" rx="9" ry="3" fill={accent} fillOpacity={0.15} />
          <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
          <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3" />
        </svg>
      );
    case 2: // Magnifier — exploratory search
      return (
        <svg {...props}>
          <circle cx="11" cy="11" r="8" fill={accent} fillOpacity={0.08} />
          <path d="M21 21l-4.35-4.35" />
          <circle cx="9"  cy="10" r="1.2" fill={accent} fillOpacity={0.7} stroke="none" />
          <circle cx="13" cy="9"  r="1.2" fill={accent} fillOpacity={0.7} stroke="none" />
          <circle cx="12" cy="13" r="1.2" fill={accent} fillOpacity={0.7} stroke="none" />
        </svg>
      );
    case 3: // Sliders — feature tuning
      return (
        <svg {...props}>
          <line x1="4" y1="6"  x2="20" y2="6"  />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="18" x2="20" y2="18" />
          <circle cx="8"  cy="6"  r="2.5" fill={accent} fillOpacity={0.18} />
          <circle cx="16" cy="12" r="2.5" fill={accent} fillOpacity={0.18} />
          <circle cx="11" cy="18" r="2.5" fill={accent} fillOpacity={0.18} />
        </svg>
      );
    case 4: // Stacked layers — model architecture
      return (
        <svg {...props}>
          <path d="M12 2L2 7l10 5 10-5-10-5z" fill={accent} fillOpacity={0.15} />
          <path d="M2 12l10 5 10-5" />
          <path d="M2 17l10 5 10-5" />
        </svg>
      );
    case 5: // Bar chart — evaluation metrics
      return (
        <svg {...props}>
          <rect x="4"  y="13" width="4" height="8" rx="1" fill={accent} fillOpacity={0.15} />
          <rect x="10" y="7"  width="4" height="14" rx="1" fill={accent} fillOpacity={0.15} />
          <rect x="16" y="10" width="4" height="11" rx="1" fill={accent} fillOpacity={0.15} />
          <line x1="2" y1="21" x2="22" y2="21" />
        </svg>
      );
    case 6: // Cloud upload — deployment
      return (
        <svg {...props}>
          <polyline points="16,16 12,12 8,16" />
          <line x1="12" y1="12" x2="12" y2="21" />
          <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
        </svg>
      );
    case 7: // Activity heartbeat — monitoring
      return (
        <svg {...props}>
          <polyline points="22,12 18,12 15,21 9,3 6,12 2,12" />
        </svg>
      );
    default:
      return null;
  }
}

function IconTile({ step, accent, size = 52 }: { step: number; accent: string; size?: number }) {
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: "var(--radius-sm)",
      background: `${accent}18`,
      border: `1px solid ${accent}2e`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      margin: "0 auto 0.65rem",
      flexShrink: 0,
    }}>
      <StageIcon step={step} accent={accent} size={size === 52 ? 22 : 20} />
    </div>
  );
}

export { IconTile };
