import { useCallback } from "react";
import type { SelectionResult } from "@/lib/fsAlgorithms";

function triggerDownload(csv: string, name: string) {
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function useFSDownloads(result: SelectionResult | null, fileName: string) {
  const base = fileName.replace(/\.csv$/i, "");

  const handleDownload = useCallback(() => {
    if (!result?.csvText) return;
    triggerDownload(result.csvText, `${base}_selected.csv`);
  }, [result, base]);

  const handleDownloadPCA = useCallback(() => {
    if (!result?.pcaResult?.csvText) return;
    triggerDownload(result.pcaResult.csvText, `${base}_pca.csv`);
  }, [result, base]);

  const handleDownloadUMAP = useCallback(() => {
    if (!result?.umapResult?.csvText) return;
    triggerDownload(result.umapResult.csvText, `${base}_umap.csv`);
  }, [result, base]);

  const handleDownloadFA = useCallback(() => {
    if (!result?.faResult) return;
    const { featureNames, loadings, communalities, variance } = result.faResult;
    const header = ["Feature", ...variance.map((_, c) => `Factor${c + 1}`), "Communality"].join(",");
    const rows = featureNames.map((name, j) =>
      [name, ...loadings[j].map(l => l.toFixed(6)), communalities[j].toFixed(6)].join(",")
    );
    triggerDownload([header, ...rows].join("\n"), `${base}_fa_loadings.csv`);
  }, [result, base]);

  const handleDownloadLDA = useCallback(() => {
    if (!result?.ldaResult) return;
    const { points, targetValues, variance } = result.ldaResult;
    const nComp = variance.length;
    const header = [...Array.from({ length: nComp }, (_, c) => `LD${c + 1}`), "target"].join(",");
    const rows = points.map((pt, i) =>
      [...pt.map(v => v.toFixed(6)), targetValues[i] ?? ""].join(",")
    );
    triggerDownload([header, ...rows].join("\n"), `${base}_lda.csv`);
  }, [result, base]);

  return { handleDownload, handleDownloadPCA, handleDownloadUMAP, handleDownloadFA, handleDownloadLDA };
}