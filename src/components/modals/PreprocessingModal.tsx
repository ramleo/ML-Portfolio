"use client";

import { useState, useCallback } from "react";
import ModalShell from "@/components/modals/ModalShell";
import { ML_UNIFIED_API as API } from "@/config/urls";
import { ACCENT, type Step, type AnalyzeResult, type PrepResult } from "@/lib/preprocessingModalUtils";

import UploadStep     from "@/components/PreprocessingModalParts/UploadStep";
import ConfigureStep  from "@/components/PreprocessingModalParts/ConfigureStep";
import ProcessingStep from "@/components/PreprocessingModalParts/ProcessingStep";
import ResultsStep    from "@/components/PreprocessingModalParts/ResultsStep";
import { trackedFetch } from "@/lib/trackedFetch";

export default function PreprocessingModal({ onClose }: { onClose: () => void }) {
  // ── Wizard state ──────────────────────────────────────────────────────────
  const [step, setStep]           = useState<Step>("upload");
  const [file, setFile]           = useState<File | null>(null);
  const [analyzed, setAnalyzed]   = useState<AnalyzeResult | null>(null);
  const [result, setResult]       = useState<PrepResult | null>(null);
  const [error, setError]         = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  // ── Configure state ────────────────────────────────────────────────────────
  const [target, setTarget]                 = useState("");
  const [dropCols, setDropCols]             = useState<Set<string>>(new Set());
  const [mvNum, setMvNum]                   = useState("mean");
  const [mvCat, setMvCat]                   = useState("most_frequent");
  const [removeDups, setRemoveDups]         = useState(true);
  const [removeOutliers, setRemoveOutliers] = useState(false);
  const [fixSkewness, setFixSkewness]       = useState(false);
  const [encodeMethod, setEncodeMethod]     = useState("none");
  const [standardize, setStandardize]       = useState(false);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const analyze = useCallback(async (f: File) => {
    setAnalyzing(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const res = await trackedFetch(`${API}/analyze`, { method: "POST", body: fd }, { tool: "preprocessing" });
      if (!res.ok) throw new Error(await res.text());
      const data: AnalyzeResult = await res.json();
      setAnalyzed(data);
      setTarget(data.suggested_target);
      setStep("configure");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  }, []);

  const handleFile = useCallback((f: File) => {
    if (!f.name.endsWith(".csv")) { setError("Please upload a CSV file."); return; }
    setFile(f);
    analyze(f);
  }, [analyze]);

  const handlePreprocess = useCallback(async () => {
    if (!file || !analyzed) return;
    setStep("processing");
    setError(null);
    try {
      const csv_b64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await trackedFetch(`${API}/automl/preprocess`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name, csv_b64, target_column: target,
          options: {
            remove_duplicates: removeDups, mv_num: mvNum, mv_cat: mvCat,
            remove_outliers: removeOutliers, fix_skewness: fixSkewness,
            encode_method: encodeMethod, standardize, drop_columns: [...dropCols],
          },
        }),
      }, { tool: "preprocessing" });
      if (!res.ok) throw new Error(await res.text());
      const data: PrepResult = await res.json();
      setResult(data);
      setStep("results");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Preprocessing failed");
      setStep("configure");
    }
  }, [file, analyzed, target, dropCols, mvNum, mvCat, removeDups, removeOutliers, fixSkewness, encodeMethod, standardize]);

  const downloadCSV = useCallback(() => {
    if (!result) return;
    const bytes = atob(result.csv_b64);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    const blob = new Blob([arr], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = result.preprocessed_filename;
    a.click(); URL.revokeObjectURL(url);
  }, [result]);

  const reset = useCallback(() => {
    setStep("upload"); setFile(null); setAnalyzed(null);
    setResult(null); setError(null); setDropCols(new Set());
    setTarget(""); setMvNum("mean"); setMvCat("most_frequent");
    setRemoveDups(true); setRemoveOutliers(false); setFixSkewness(false);
    setEncodeMethod("none"); setStandardize(false);
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <ModalShell onClose={onClose} title="Data Preprocessing" eyebrow="ML Capabilities" accent={ACCENT}>

      {step === "upload" && (
        <UploadStep analyzing={analyzing} error={error} onFile={handleFile} />
      )}

      {step === "configure" && analyzed && (
        <ConfigureStep
          analyzed={analyzed}
          target={target}             setTarget={setTarget}
          dropCols={dropCols}         setDropCols={setDropCols}
          mvNum={mvNum}               setMvNum={setMvNum}
          mvCat={mvCat}               setMvCat={setMvCat}
          encodeMethod={encodeMethod} setEncodeMethod={setEncodeMethod}
          removeDups={removeDups}     setRemoveDups={setRemoveDups}
          removeOutliers={removeOutliers} setRemoveOutliers={setRemoveOutliers}
          fixSkewness={fixSkewness}   setFixSkewness={setFixSkewness}
          standardize={standardize}   setStandardize={setStandardize}
          error={error}
          onBack={reset}
          onSubmit={handlePreprocess}
        />
      )}

      {step === "processing" && <ProcessingStep />}

      {step === "results" && result && (
        <ResultsStep
          result={result}
          analyzed={analyzed}
          onDownload={downloadCSV}
          onReset={reset}
        />
      )}

    </ModalShell>
  );
}