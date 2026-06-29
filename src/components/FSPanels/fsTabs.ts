import type { SelectionOpts } from "@/lib/fsAlgorithms";

export type TabId =
  | "variance" | "correlation" | "topk" | "rfe" | "selectkbest"
  | "forward" | "exhaustive" | "chisq" | "kendall"
  | "lasso" | "ridge" | "tree"
  | "pca" | "umap" | "fa" | "lda";

export type TabEntry = { id: TabId; label: string; enabled: boolean; cat: string };

export const TAB_CATEGORIES = [
  { label: "Filter",    color: "#60a5fa" },
  { label: "Score",     color: "#a78bfa" },
  { label: "Wrapper",   color: "#34d399" },
  { label: "Reduction", color: "#f472b6" },
];

export function buildTabs(opts: SelectionOpts): TabEntry[] {
  return [
    { id: "variance",    label: "Variance",   enabled: opts.useVariance,    cat: "Filter" },
    { id: "correlation", label: "Corr",       enabled: opts.useCorrelation, cat: "Filter" },
    { id: "topk",        label: "Top-K",      enabled: opts.useTopK,        cat: "Filter" },
    { id: "selectkbest", label: "K Best",     enabled: opts.useSelectKBest, cat: "Score" },
    { id: "kendall",     label: "Kendall τ",  enabled: opts.useKendall,     cat: "Score" },
    { id: "chisq",       label: "Chi-sq",     enabled: opts.useChiSq,       cat: "Score" },
    { id: "rfe",         label: "RFE",        enabled: opts.useRFE,         cat: "Wrapper" },
    { id: "lasso",       label: "Lasso",      enabled: opts.useLasso,       cat: "Wrapper" },
    { id: "ridge",       label: "Ridge",      enabled: opts.useRidge,       cat: "Wrapper" },
    { id: "tree",        label: "Tree",       enabled: opts.useTree,        cat: "Wrapper" },
    { id: "forward",     label: "Forward",    enabled: opts.useForward,     cat: "Wrapper" },
    { id: "exhaustive",  label: "Exhaustive", enabled: opts.useExhaustive,  cat: "Wrapper" },
    { id: "pca",         label: "PCA",        enabled: opts.usePCA,         cat: "Reduction" },
    { id: "umap",        label: "UMAP",       enabled: opts.useUMAP,        cat: "Reduction" },
    { id: "fa",          label: "FA",         enabled: opts.useFA,          cat: "Reduction" },
    { id: "lda",         label: "LDA",        enabled: opts.useLDA,         cat: "Reduction" },
  ];
}