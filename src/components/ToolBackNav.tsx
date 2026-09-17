"use client";

import Link from "next/link";
import { toolBackHref, toolBackLabel } from "@/lib/toolNav";

/**
 * The back navigation shown at the top of every tool page: two links — one to
 * the home page, one to the tool's area (Computer Vision, ML Pipeline, …).
 *
 * Tool pages used to carry a single "← <Area>" button, which meant there was no
 * one-click way back to the home page. This gives both, consistently, from one
 * place, so the two never drift apart across the ~50 tools.
 */
function Chevron() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function ToolBackNav({ toolId, flush }: { toolId: string; flush?: boolean }) {
  const areaHref = toolBackHref(toolId);
  const areaLabel = toolBackLabel(toolId);
  // Unknown tools fall back to the home page for their area link — don't render
  // two links that both say "Home".
  const showArea = areaLabel !== "Home";

  return (
    // `flush` drops the bottom margin when the nav sits inside a centred header
    // row (pipeline-builder / pipeline-cinema), where the margin would offset it.
    <nav aria-label="Breadcrumb" className="tool-back-nav" style={flush ? { marginBottom: 0 } : undefined}>
      <Link href="/" className="tool-back-link">
        <Chevron /> Home
      </Link>
      {showArea && (
        <Link href={areaHref} className="tool-back-link">
          <Chevron /> {areaLabel}
        </Link>
      )}
    </nav>
  );
}
