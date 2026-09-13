"use client";
import { useMemo, useState } from "react";
import PlotlyFigure from "./PlotlyFigure";
import EdaSection, { Scroller } from "./EdaSection";
import EdaColorPicker, { encode, usableColorCols } from "./EdaColorPicker";
import { useIsLight } from "./usePlotly";
import { SERIES, theme } from "./plotlyTheme";
import type { EdaResult } from "./edaTypes";

/**
 * Every numeric pair, plotted against every other.
 *
 * The correlation matrix above reduces each of these panels to one number,
 * and that number is blind in a specific way: a perfect U-shape and pure
 * noise both score near zero. This is where that difference is visible.
 *
 * Only the lower half is drawn. The upper half is the same panels
 * transposed, so showing both doubles the marks and halves the size of each.
 */
export default function EdaSplom({ result }: { result: EdaResult }) {
  const light = useIsLight();
  const t = useMemo(() => theme(light), [light]);
  const splom = result.splom;
  const options = useMemo(
    () => usableColorCols(Object.keys(splom?.color_map ?? {}), result.columns),
    [splom, result.columns]);
  // The server's own pick is used only if it survives the cardinality filter;
  // otherwise the first one that does, and no colour at all if none do.
  const [colorCol, setColorCol] = useState<string | null>(
    () => (splom?.color_col && options.includes(splom.color_col)) ? splom.color_col : (options[0] ?? null));

  const traces = useMemo(() => {
    if (!splom) return [];
    const { codes, hover, colorbar } = encode(
      colorCol ? splom.color_map[colorCol] : undefined, colorCol, t.text);
    return [{
      type: "splom",
      dimensions: splom.cols.map((c) => ({ label: c, values: splom.data[c] })),
      showupperhalf: false,
      // The diagonal is redundant with the histograms above — except at
      // exactly two columns, where hiding it as well leaves Plotly 2.27 with
      // no subplot to build: it reaches for an axis that was never created
      // and throws "Cannot read properties of undefined (reading
      // 'makeCalcdata')". Verified against 2.27 directly; three columns with
      // both hidden is fine.
      diagonal: { visible: splom.cols.length < 3 },
      text: hover,
      marker: {
        size: 3.4, opacity: 0.62,
        color: codes ?? SERIES.scatter,
        colorscale: codes ? "Turbo" : undefined,
        showscale: Boolean(codes),
        colorbar,
        line: { width: 0 },
      },
    }];
  }, [splom, colorCol, t.text]);

  const axis = useMemo(() => ({
    gridcolor: t.grid, zerolinecolor: t.zero, tickfont: { size: 8 }, showline: false,
  }), [t]);

  const layout = useMemo(() => {
    if (!splom) return {};
    const axes: Record<string, unknown> = {};
    splom.cols.forEach((_, i) => {
      axes[`xaxis${i === 0 ? "" : i + 1}`] = axis;
      axes[`yaxis${i === 0 ? "" : i + 1}`] = axis;
    });
    return {
      paper_bgcolor: "transparent",
      plot_bgcolor: "transparent",
      font: { color: t.text, size: 9 },
      showlegend: false,
      margin: { l: 58, r: 20, t: 12, b: 58 },
      ...axes,
    };
  }, [splom, axis, t]);

  const side = splom ? Math.max(520, Math.min(920, splom.cols.length * 130)) : 520;

  return (
    <EdaSection
      id="splom"
      testId="eda-splom"
      title="Scatter matrix"
      icon="grid"
      meta={splom ? `${splom.cols.length} features · ${splom.n.toLocaleString()} samples` : undefined}
      note={splom
        ? `${splom.cols.length} numeric columns against each other, over ${splom.n.toLocaleString()} sampled rows — a sample, not the whole dataset, so a rare cluster may not appear here.`
        : undefined}
      empty={!splom
        ? "A scatter matrix needs at least two numeric columns with values in most rows."
        : undefined}
      right={splom ? (
        <EdaColorPicker options={options} value={colorCol} onChange={setColorCol} />
      ) : undefined}
    >
      <Scroller min={side}>
        <PlotlyFigure
          traces={traces}
          layout={layout}
          height={side}
          label="Scatter plot matrix of the numeric columns"
        />
      </Scroller>
    </EdaSection>
  );
}
