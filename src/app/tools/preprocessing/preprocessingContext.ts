import type { AnalyzeResult, PrepResult, ColumnInfo } from "@/lib/preprocessingAlgorithms";

/**
 * The dataset, described for the AI chat panel.
 *
 * Lives apart from the page because it is the one part of this tool that is
 * pure: no state, no React, no DOM — a shape in, a string out. Keeping it here
 * also keeps the page itself under the length limit.
 */
export function buildPreprocessingContext(analyzed: AnalyzeResult | null, result: PrepResult | null): string {
  if (!analyzed) return "Data Preprocessing tool. No dataset loaded yet — ask the user to upload a CSV file first.";

  const numeric = analyzed.columns.filter(c => c.is_numeric);
  const categorical = analyzed.columns.filter(c => !c.is_numeric);
  const withMissing = analyzed.columns.filter(c => c.missing > 0);
  const highSkew = numeric.filter(c => c.skew != null && Math.abs(c.skew) > 1);

  const colDetail = (c: ColumnInfo) => {
    const parts = [c.name, c.dtype];
    if (c.missing > 0) parts.push(`missing=${c.missing}`);
    if (c.mean != null) parts.push(`mean=${c.mean.toFixed(2)}`);
    if (c.std != null) parts.push(`std=${c.std.toFixed(2)}`);
    if (c.min != null && c.max != null) parts.push(`range=[${c.min.toFixed(2)}, ${c.max.toFixed(2)}]`);
    if (c.skew != null) parts.push(`skew=${c.skew.toFixed(2)}`);
    if (!c.is_numeric) parts.push(`unique=${c.nunique}`);
    return `  - ${parts.join(", ")}`;
  };

  const lines = [
    `Tool: Data Preprocessing`,
    `Dataset: ${analyzed.rows} rows, ${analyzed.columns.length} columns | Missing cells: ${analyzed.total_missing} | Suggested target: ${analyzed.suggested_target || "none"}`,
    `Numeric columns (${numeric.length}):`,
    ...numeric.map(colDetail),
    `Categorical columns (${categorical.length}):`,
    ...(categorical.length ? categorical.map(colDetail) : ["  - none"]),
    withMissing.length ? `Columns with missing values: ${withMissing.map(c => `${c.name}(${c.missing})`).join(", ")}` : "No missing values.",
    highSkew.length ? `High-skewness columns (|skew|>1, candidates for log/sqrt transform): ${highSkew.map(c => `${c.name}(skew=${c.skew?.toFixed(2)})`).join(", ")}` : "No high-skewness columns detected.",
    result ? `After preprocessing: ${result.rows_after} rows, ${result.cols_after} cols (removed ${result.rows_before - result.rows_after} rows, ${result.ohe_cols_added} OHE cols added).` : "",
  ].filter(Boolean);

  return lines.join("\n");
}
