"use client";

import AnalyticsCalendar from "./AnalyticsCalendar";
import { RANGE_LABELS, type Range } from "./analyticsTypes";
import { track } from "@/hooks/useAnalytics";
import { EV } from "@/lib/logEvents";

const PILL = "text-[10px] px-2.5 py-1 rounded-md border transition-colors";
const on   = { borderColor: "#10b981", color: "#10b981", background: "rgba(16,185,129,0.1)" };
const off  = { borderColor: "var(--border)", color: "var(--text3)" };

interface Props {
  range: Range;
  customRange: { start: string; end: string } | null;
  rangeLabel: string;
  showCal: boolean;
  onRange: (r: Range) => void;
  onCustom: (start: string, end: string) => void;
  onToggleCal: () => void;
  onGuide: () => void;
}

/** Range presets, the custom-date calendar, the guide and the export link.
 *  Everything on this row changes what the twenty panels below are showing —
 *  which is the reason it is one strip at the top rather than a control per
 *  panel. */
export default function AnalyticsToolbar({
  range, customRange, rangeLabel, showCal, onRange, onCustom, onToggleCal, onGuide,
}: Props) {
  const exportHref = range === "custom" && customRange
    ? `/api/events/export?start=${customRange.start}&end=${customRange.end}`
    : `/api/events/export?range=${range}`;

  return (
    <div data-wt="ra-toolbar" className="flex items-center gap-3 self-start">
      <div data-wt="ra-ranges" className="relative flex items-center gap-1">
        {(["today", "yesterday", "7d", "30d"] as const).map(r => (
          <button key={r} data-wt={`ra-range-${r}`} onClick={() => onRange(r)}
            className={PILL} style={range === r ? on : off}>
            {RANGE_LABELS[r]}
          </button>
        ))}
        <button data-wt="ra-custom" onClick={onToggleCal} className={PILL}
          style={range === "custom" ? on : off}>
          {range === "custom" && customRange ? rangeLabel : "Custom"}
        </button>
        {showCal && <AnalyticsCalendar onSelect={onCustom} />}
      </div>

      <button onClick={onGuide} className={`${PILL} hover:border-[var(--border2)]`} style={off}>
        User Guide
      </button>

      {/* The click also posts an `export` event of its own, so exporting is a
          tracked action like any other — and it is the one action on this page
          that puts a row into the very table the feed below is watching. */}
      <a
        data-wt="ra-export"
        href={exportHref}
        download
        onClick={() => {
          track(EV.EXPORT, { meta: { tool: "realtime-analytics", format: "csv", range } });
        }}
        className={`${PILL} hover:border-[var(--border2)]`}
        style={off}
      >
        Export CSV
      </a>
    </div>
  );
}
