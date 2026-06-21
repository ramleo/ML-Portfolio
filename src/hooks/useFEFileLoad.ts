"use client";

import { useCallback } from "react";
import { ColInfo, parseCSV, analyzeColumns } from "@/lib/feAlgorithms";

interface UseFEFileLoadParams {
  setError: (e: string) => void;
  setFilename: (n: string) => void;
  setRawRows: (r: string[][]) => void;
  setCols: (c: ColInfo[]) => void;
  setColTransforms: (t: Record<string, string[]>) => void;
  setDateCols: (v: string[]) => void;
  setInteractions: (v: [string, string][]) => void;
  setPolyCols: (v: string[]) => void;
  setRatios: (v: [string, string][]) => void;
  setRatioA: (v: string) => void;
  setRatioB: (v: string) => void;
  setFreqCols: (v: string[]) => void;
  setSortCol: (v: string) => void;
  setLagCols: (v: string[]) => void;
  setLagN: (v: number) => void;
  setLagDiff: (v: boolean) => void;
  setRollCols: (v: string[]) => void;
  setRollN: (v: number) => void;
  setRollAgg: (v: string) => void;
  setCyclicCols: (v: Record<string, number>) => void;
  setRowAggCols: (v: string[]) => void;
  setRowAggFn: (v: string) => void;
  resetLDA: () => void;
  setStep: (s: "upload" | "configure" | "processing" | "results") => void;
}

export function useFEFileLoad({
  setError, setFilename, setRawRows, setCols, setColTransforms,
  setDateCols, setInteractions, setPolyCols, setRatios, setRatioA, setRatioB,
  setFreqCols, setSortCol, setLagCols, setLagN, setLagDiff,
  setRollCols, setRollN, setRollAgg, setCyclicCols,
  setRowAggCols, setRowAggFn, resetLDA, setStep,
}: UseFEFileLoadParams) {
  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith(".csv")) { setError("Please upload a CSV file."); return; }
    setError("");
    setFilename(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const rows = parseCSV(text);
      if (rows.length < 2) { setError("CSV must have at least 2 rows."); return; }
      const analyzed = analyzeColumns(rows);
      setRawRows(rows);
      setCols(analyzed);
      const initT: Record<string, string[]> = {};
      for (const col of analyzed) {
        if (col.isNumeric) initT[col.name] = Math.abs(col.skew) > 1.5 ? ["log1p"] : [];
      }
      setColTransforms(initT);
      setDateCols([]);
      setInteractions([]);
      setPolyCols([]);
      setRatios([]);
      setRatioA(""); setRatioB("");
      setFreqCols([]);
      setSortCol("");
      setLagCols([]); setLagN(1); setLagDiff(false);
      setRollCols([]); setRollN(3); setRollAgg("mean");
      setCyclicCols({});
      setRowAggCols([]); setRowAggFn("mean");
      resetLDA();
      setStep("configure");
    };
    reader.readAsText(file);
  }, [
    setError, setFilename, setRawRows, setCols, setColTransforms,
    setDateCols, setInteractions, setPolyCols, setRatios, setRatioA, setRatioB,
    setFreqCols, setSortCol, setLagCols, setLagN, setLagDiff,
    setRollCols, setRollN, setRollAgg, setCyclicCols,
    setRowAggCols, setRowAggFn, resetLDA, setStep,
  ]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  return { handleFile, handleDrop };
}