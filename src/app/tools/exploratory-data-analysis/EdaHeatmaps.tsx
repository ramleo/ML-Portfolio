"use client";
import { useMemo } from "react";
import PlotlyFigure from "./PlotlyFigure";
import EdaSection, { Scroller } from "./EdaSection";
import { useIsLight } from "./usePlotly";
import { baseLayout, nullCells, theme } from "./plotlyTheme";
import type { EdaResult } from "./edaTypes";

function size(n: number): number {
  return Math.max(420, Math.min(900, 130 + n * 44));
}

function heatLayout(t: ReturnType<typeof theme>, annotations: unknown[] = []) {
  return baseLayout(t, {
    margin: { l: 104, r: 60, t: 14, b: 118 },
    xaxis: { tickangle: -45, tickfont: { size: 9 }, gridcolor: "transparent", automargin: true },
    yaxis: { tickfont: { size: 9 }, gridcolor: "transparent", automargin: true, autorange: "reversed" },
    annotations,
  });
}

/** Pearson correlation. Diverging scale centred on zero, because the sign is
 *  the information: −0.8 and +0.8 are equally strong and opposite, and a
 *  sequential scale would put one of them next to "nothing". */
export function CorrelationHeatmap({ result }: { result: EdaResult }) {
  const light = useIsLight();
  const t = useMemo(() => theme(light), [light]);
  const corr = result.correlations;
  const numeric = result.columns.filter((c) => c.is_numeric).length;

  const traces = useMemo(() => {
    if (!corr) return [];
    return [{
      type: "heatmap", z: corr.matrix, x: corr.labels, y: corr.labels,
      colorscale: "RdBu", zmid: 0, zmin: -1, zmax: 1, showscale: true,
      hoverongaps: false,
      colorbar: { thickness: 10, len: 0.7, tickfont: { size: 9 } },
      text: corr.matrix.map((r) => r.map((v) => (v === null ? "" : v.toFixed(2)))),
      texttemplate: "%{text}",
      textfont: { size: 8 },
      hovertemplate: "%{y} × %{x}: %{z:.3f}<extra></extra>",
    }];
  }, [corr]);

  const layout = useMemo(
    () => (corr ? heatLayout(t, nullCells(corr.labels, corr.matrix, t)) : {}),
    [corr, t],
  );

  return (
    <EdaSection
      id="correlations"
      testId="eda-correlations"
      title="Correlations"
      icon="grid"
      note="Blue is positive, red is negative, stronger is more saturated. A cell marked n/a could not be computed — that is not the same as zero, which means no linear relationship at all."
      empty={!corr || corr.labels.length < 2
        ? `A correlation needs two numeric columns and this dataset has ${numeric}. Nothing is wrong with the file — there is simply no pair to relate.`
        : undefined}
    >
      <Scroller min={corr ? size(corr.labels.length) : undefined}>
        <PlotlyFigure
          traces={traces}
          layout={layout}
          height={corr ? size(corr.labels.length) : 420}
          label="Correlation matrix between numeric columns"
        />
      </Scroller>
    </EdaSection>
  );
}

/** Mutual information. Sequential scale from zero, because there is no
 *  negative mutual information — and unlike correlation it registers a
 *  relationship that is real but not a straight line. */
export function MiHeatmap({ result }: { result: EdaResult }) {
  const light = useIsLight();
  const t = useMemo(() => theme(light), [light]);
  const mi = result.mi;

  const traces = useMemo(() => {
    if (!mi) return [];
    return [{
      type: "heatmap", z: mi.matrix, x: mi.labels, y: mi.labels,
      colorscale: "Viridis", zmin: 0, zmax: 1, showscale: true,
      colorbar: { thickness: 10, len: 0.7, tickfont: { size: 9 } },
      text: mi.matrix.map((r) => r.map((v) => v.toFixed(2))),
      texttemplate: "%{text}",
      textfont: { size: 8 },
      hovertemplate: "%{y} × %{x}: %{z:.3f}<extra></extra>",
    }];
  }, [mi]);

  const layout = useMemo(() => (mi ? heatLayout(t) : {}), [mi, t]);

  return (
    <EdaSection
      id="mutual-information"
      testId="eda-mi"
      title="Mutual information"
      icon="grid"
      note="How much knowing one column tells you about another, normalised to 0–1 and computed over the first fifteen columns. Unlike correlation it catches curved and categorical relationships, and it is never negative."
      empty={!mi ? "Mutual information needs at least two columns to compare." : undefined}
    >
      <Scroller min={mi ? size(mi.labels.length) : undefined}>
        <PlotlyFigure
          traces={traces}
          layout={layout}
          height={mi ? size(mi.labels.length) : 420}
          label="Mutual information matrix between columns"
        />
      </Scroller>
    </EdaSection>
  );
}
