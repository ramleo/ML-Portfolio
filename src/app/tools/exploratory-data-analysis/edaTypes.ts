/** Response shapes for POST /eda, /eda/clean and /eda/suggest.
 *
 * Every numeric statistic is `number | null`. That is not defensive typing:
 * the backend deliberately returns null for a statistic that does not exist
 * for the data given — kurtosis needs four points, skew needs three, standard
 * deviation needs two. Returning NaN instead is what made the standalone
 * service answer 500 for any small column, so the page has to render the
 * absence rather than assume a number. See routers/eda/_utils.json_safe.
 */

export type Overview = {
  rows: number;
  cols: number;
  duplicates: number;
  missing_total: number;
  missing_pct: number;
};

export type ColumnProfile = {
  name: string;
  dtype: string;
  is_numeric: boolean;
  missing: number;
  missing_pct: number;
  nunique: number;
};

export type ColumnStats = {
  mean: number | null;
  median: number | null;
  std: number | null;
  min: number | null;
  max: number | null;
  q25: number | null;
  q75: number | null;
  outliers: number;
  skew: number | null;
  kurtosis: number | null;
  raw_vals: number[];
};

export type Distribution =
  | { type: "histogram"; bins: number[]; counts: number[] }
  | { type: "bar"; labels: string[]; counts: number[] };

export type Correlations = { labels: string[]; matrix: (number | null)[][] };

export type Verdict = "pass" | "warn" | "fail";

export type Readiness = { name: string; verdict: Verdict; reason: string };

export type Sample = { columns: string[]; rows: (string | number | null)[][] };

/** An insight is an object, not a string. Rendering the array directly is a
 *  React "objects are not valid as a child" crash, which is how this was
 *  found — the page threw on its first real response. The severity is worth
 *  keeping: "40% missing" and "slightly skewed" should not read alike. */
export type InsightLevel = "danger" | "warning" | "info";

export type Insight = { type: InsightLevel; text: string };

/** Mutual information between every pair of the first 15 columns, normalised
 *  to 0–1 by the larger of the two self-informations. Unlike correlation this
 *  catches non-linear dependence, and unlike correlation it is never
 *  negative — there is no "opposite" direction to report. */
export type Mi = { labels: string[]; matrix: number[][] };

/** Three principal components of the scaled numeric columns.
 *
 *  `cat_color_map` carries a colour-by series per candidate column, already
 *  aligned to `coords` row for row, so switching the colour-by picker is a
 *  relabel and not another request. `explained_variance` is percentages,
 *  padded to three entries when the data supports fewer components. */
export type Pca = {
  coords: number[][];
  explained_variance: number[];
  labels: string[];
  color_col: string | null;
  cat_cols: string[];
  cat_color_map: Record<string, string[]>;
};

/** Scatter-plot matrix over up to eight numeric columns, sampled server-side
 *  to at most 400 rows. `n` is that sample size, not the dataset's row count —
 *  the page says so, because a matrix drawn from 400 of 90,000 rows and one
 *  drawn from all of them are different pictures. */
export type Splom = {
  cols: string[];
  data: Record<string, number[]>;
  n: number;
  color_col: string | null;
  color_vals: string[] | null;
  color_map: Record<string, string[]>;
};

export type EdaResult = {
  overview: Overview;
  columns: ColumnProfile[];
  stats: Record<string, ColumnStats>;
  distributions: Record<string, Distribution>;
  correlations: Correlations | null;
  sample: Sample;
  duplicate_rows: Sample | null;
  insights: Insight[];
  quality_score: number;
  readiness: Readiness[];
  narrative: string;
  mi: Mi | null;
  pca: Pca | null;
  splom: Splom | null;
  low_variance_cols: string[];
};

export type CleanSummary = {
  rows_before: number;
  rows_after: number;
  rows_removed: number;
  cols_before: number;
  cols_after: number;
  cols_dropped: string[];
  missing_before: number;
  missing_after: number;
  outliers_removed: number;
};

export type CleanResult = { summary: CleanSummary; csv: string; filename: string };

/** The shape /eda/clean actually expects.
 *
 *  Imputation and outliers are nested objects, not flat strings. Sending
 *  "outliers": "iqr" reached `.get("enabled")` on a string in the backend
 *  and raised, which surfaced in the browser as a CORS error — an unhandled
 *  500 is produced outside the CORS middleware, so the real cause never
 *  reaches the client. The backend now answers 400 for a wrong shape; this
 *  type is what stops the wrong shape being sent in the first place.
 */
export type NumericMethod =
  | "none" | "mean" | "median" | "mode" | "ffill" | "bfill" | "interpolate" | "knn" | "drop";
export type CategoricalMethod = "none" | "mode" | "constant" | "drop";
export type OutlierMethod = "iqr" | "zscore" | "winsorize";

export type CleanConfig = {
  dedup: boolean;
  drop_cols: string[];
  imputation: {
    numeric_method: NumericMethod;
    cat_method: CategoricalMethod;
  };
  outliers: {
    enabled: boolean;
    method: OutlierMethod;
    threshold: number;
  };
};

export const DEFAULT_CLEAN: CleanConfig = {
  dedup: true,
  drop_cols: [],
  imputation: { numeric_method: "median", cat_method: "mode" },
  outliers: { enabled: false, method: "iqr", threshold: 1.5 },
};
