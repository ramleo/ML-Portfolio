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
  mi: unknown;
  pca: unknown;
  splom: unknown;
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
