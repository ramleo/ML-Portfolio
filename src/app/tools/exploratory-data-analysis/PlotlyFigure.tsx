"use client";
import { useEffect, useRef, useState } from "react";
import { usePlotly } from "./usePlotly";
import { CONFIG } from "./plotlyTheme";

/**
 * One chart. Draws when Plotly has arrived, redraws when the data or layout
 * changes, and cleans up after itself.
 *
 * The states below the chart are the point of this wrapper. A panel that
 * silently stays blank when the CDN is unreachable is indistinguishable from
 * a panel with nothing to draw, and this page has one of those for every
 * chart — so the loading, failed and empty cases each say which they are.
 */
export default function PlotlyFigure({
  traces, layout, height = 320, label, testId,
}: {
  traces: unknown[];
  layout: Record<string, unknown>;
  height?: number;
  label: string;
  testId?: string;
}) {
  const { status, plotly } = usePlotly();
  const [drawFailed, setDrawFailed] = useState(false);
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!plotly || !el) return;
    // Plotly throws synchronously on some data shapes, and an exception out
    // of an effect reaches React's error boundary, which unmounts the whole
    // report. That is not hypothetical: a two-column scatter matrix replaced
    // an entire analysis with "This page couldn't load". One chart that
    // cannot be drawn costs its own panel and nothing else.
    let live = true;
    // Awaited inside the effect rather than called bare: it turns Plotly's
    // synchronous throw into a rejection this can catch, and it keeps the
    // state update off the synchronous effect path.
    void (async () => {
      try {
        await plotly.react(el, traces, { ...layout, height }, CONFIG);
        if (live) setDrawFailed(false);
      } catch {
        if (live) setDrawFailed(true);
      }
    })();
    return () => { live = false; };
  }, [plotly, traces, layout, height]);

  // Purge on unmount only. Plotly attaches resize listeners and a WebGL
  // context per plot; leaving them behind is how a page that switches
  // datasets a few times ends up with dead contexts and no charts.
  useEffect(() => {
    const el = host.current;
    return () => { if (el && window.Plotly) window.Plotly.purge(el); };
  }, []);

  if (status === "failed" || drawFailed) {
    return (
      <p style={{ fontSize: "0.83rem", color: "var(--text3)", margin: 0, padding: "1.2rem 0" }}>
        {status === "failed"
          ? "The charting library could not be loaded, so this chart is missing. Every number it draws is in the tables above."
          : "This chart could not be drawn for this dataset. Everything else on the page is unaffected."}
      </p>
    );
  }

  return (
    <div style={{ position: "relative", minWidth: 0 }}>
      <div
        ref={host}
        data-wt={testId}
        role="img"
        aria-label={label}
        style={{ width: "100%", height, minWidth: 0 }}
      />
      {status === "loading" && (
        <div style={{
          position: "absolute", inset: 0, display: "grid", placeItems: "center",
          fontSize: "0.8rem", color: "var(--text3)",
          background: "var(--bg-card)", borderRadius: 8,
        }}>
          Loading chart…
        </div>
      )}
    </div>
  );
}
