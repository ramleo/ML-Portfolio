import type { SelectionOpts } from "@/lib/fsAlgorithms";

/**
 * Every selector off except the two cheap filters, with each method's own
 * defaults sitting ready beside it.
 *
 * Twenty methods' worth of constants is data, not page logic, and it was the
 * single largest block in a file that had grown past the length limit.
 */
export const DEFAULT_OPTS: Omit<SelectionOpts, "targetCol"> = {
  useVariance: true, varianceThreshold: 0.01,
  useCorrelation: true, corrThreshold: 0.9,
  useTopK: false, topK: 10,
  useSelectKBest: false, selectKBestK: 10, kBestMethod: "f_regression",
  useKendall: false, kendallTopK: 10,
  useChiSq: false, chiSqTopK: 10,
  useRFE: false, rfeTargetK: 10,
  useLasso: false, lassoAlpha: 0.01, lassoTopK: 10,
  useRidge: false, ridgeAlpha: 1.0, ridgeTopK: 10,
  useTree: false, treeTopK: 10, treeNTrees: 50,
  useForward: false, forwardK: 10,
  useExhaustive: false, exhaustiveK: 5,
  usePCA: false, pcaComponents: 3, pcaKaiser: false,
  useUMAP: false, umapComponents: 2, umapNeighbors: 15,
  useFA: false, faFactors: 3,
  useLDA: false, ldaComponents: 2,
};
