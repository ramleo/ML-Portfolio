/** EDA Explorer world — signature colours, the app launch target, and the
 *  analysis-section definitions. Mirrors the ML Unified / Text-to-SQL world
 *  themes. Every section here is live today. */

import { ML_UNIFIED_API } from "@/config/urls";

export const EDA_ACCENT = "#34d399";   // emerald — matches the EDA Explorer card
export const EDA_ACCENT2 = "#06b6d4";  // cyan — gradient partner

/** The live app is the EDA mode of the shared ML-Unified HF Space. */
export const APP_HREF = `${ML_UNIFIED_API}/?mode=eda`;

export type EdaSection = {
  key: string;
  label: string;
  blurb: string;
  note: string;
};

export const SECTIONS: EdaSection[] = [
  {
    key: "overview",
    label: "Overview & columns",
    blurb: "Shape, dtypes, memory, and a per-column breakdown — missing counts, unique counts and sample values — the moment you upload.",
    note: "Shape · dtypes · missing",
  },
  {
    key: "distributions",
    label: "Distributions",
    blurb: "Interactive histograms for numeric columns and bar charts for categoricals, with descriptive statistics and box plots that flag outliers.",
    note: "Histograms · box plots",
  },
  {
    key: "correlations",
    label: "Correlations & MI",
    blurb: "A full Pearson correlation heatmap plus a mutual-information heatmap, so you see both linear and non-linear relationships between features.",
    note: "Pearson · mutual information",
  },
  {
    key: "pca",
    label: "3D PCA & SPLOM",
    blurb: "An interactive 3D PCA scatter you can rotate and colour by any column, and a scatter-plot matrix across your numeric features.",
    note: "3D PCA · scatter matrix",
  },
  {
    key: "insights",
    label: "Auto insights",
    blurb: "Plain-language findings surfaced from the data — skew, high-missing columns, strong correlations and likely outliers — without writing any code.",
    note: "Findings, no code",
  },
  {
    key: "report",
    label: "Downloadable report",
    blurb: "Export the whole profile as a PDF or a self-contained HTML report to share or keep — the same charts and stats you see on screen.",
    note: "PDF · HTML export",
  },
];
