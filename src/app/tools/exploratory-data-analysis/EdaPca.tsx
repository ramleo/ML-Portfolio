"use client";
import { useMemo, useState } from "react";
import PlotlyFigure from "./PlotlyFigure";
import EdaSection from "./EdaSection";
import EdaColorPicker, { encode, usableColorCols } from "./EdaColorPicker";
import { useIsLight } from "./usePlotly";
import { SERIES, theme } from "./plotlyTheme";
import type { EdaResult } from "./edaTypes";

/**
 * The numeric columns squeezed into three axes, drawn as a rotatable cloud.
 *
 * This is the one chart that answers "is there structure in here at all".
 * Clusters that separate under a colour-by mean that column is predictable
 * from the numbers; a single undifferentiated blob means the linear
 * combinations do not carry it, whatever the correlation matrix suggests.
 */
export default function EdaPca({ result }: { result: EdaResult }) {
  const light = useIsLight();
  const t = useMemo(() => theme(light), [light]);
  const pca = result.pca;
  const options = useMemo(
    () => usableColorCols(pca?.cat_cols ?? [], result.columns), [pca, result.columns]);
  // See EdaSplom: an ID column has a distinct value per row and colouring by
  // it is noise, so the server's pick only stands if it clears the filter.
  const [colorCol, setColorCol] = useState<string | null>(
    () => (pca?.color_col && options.includes(pca.color_col)) ? pca.color_col : (options[0] ?? null));

  const traces = useMemo(() => {
    if (!pca) return [];
    const xs = pca.coords.map((c) => c[0]);
    const ys = pca.coords.map((c) => c[1]);
    const zs = pca.coords.map((c) => c[2]);
    const { codes, hover, colorbar } = encode(
      colorCol ? pca.cat_color_map[colorCol] : undefined, colorCol, t.text);

    return [{
      type: "scatter3d", mode: "markers",
      x: xs, y: ys, z: zs,
      text: hover,
      marker: {
        size: 4, opacity: 0.82,
        color: codes ?? SERIES.scatter,
        colorscale: codes ? "Turbo" : undefined,
        showscale: Boolean(codes),
        colorbar,
      },
      hovertemplate: colorCol && codes
        ? `PC1: %{x:.2f}<br>PC2: %{y:.2f}<br>PC3: %{z:.2f}<br>${colorCol}: %{text}<extra></extra>`
        : "PC1: %{x:.2f}<br>PC2: %{y:.2f}<br>PC3: %{z:.2f}<extra></extra>",
    }];
  }, [pca, colorCol, t.text]);

  const layout = useMemo(() => {
    const ev = pca?.explained_variance ?? [0, 0, 0];
    const axis = (n: number, label: string) => ({
      title: { text: `${label} (${ev[n] ?? 0}%)`, font: { size: 10 } },
      tickfont: { size: 8 },
      gridcolor: t.grid,
      zerolinecolor: t.zero,
      backgroundcolor: "rgba(0,0,0,0)",
    });
    return {
      paper_bgcolor: "transparent",
      font: { color: t.text, size: 10 },
      showlegend: false,
      margin: { l: 0, r: 0, t: 8, b: 0 },
      scene: {
        xaxis: axis(0, "PC1"), yaxis: axis(1, "PC2"), zaxis: axis(2, "PC3"),
        bgcolor: "rgba(0,0,0,0)",
      },
    };
  }, [pca, t]);

  const captured = pca
    ? Math.round(pca.explained_variance.slice(0, 3).reduce((a, b) => a + b, 0))
    : 0;

  return (
    <EdaSection
      id="pca"
      testId="eda-pca"
      title="3D projection"
      icon="cube"
      note={pca
        ? `Principal components of ${pca.labels.length} scaled numeric columns. These three axes carry ${captured}% of the variation in the data — the rest is flattened away. Drag to rotate, scroll to zoom.`
        : undefined}
      empty={!pca
        ? "A three-axis projection needs at least three numeric columns that are not mostly empty. This dataset does not have them."
        : undefined}
      right={pca ? (
        <EdaColorPicker options={options} value={colorCol} onChange={setColorCol} />
      ) : undefined}
    >
      <PlotlyFigure
        traces={traces}
        layout={layout}
        height={480}
        label="Three-dimensional principal component projection of the numeric columns"
      />
    </EdaSection>
  );
}
