"use client";

import { useState, useRef, useCallback } from "react";
import { ML_UNIFIED_API } from "@/config/urls";
import DocSidebar from "./DocSidebar";
import DocViewerPanel from "./DocViewerPanel";
import DocFieldsPanel from "./DocFieldsPanel";
import type { ExtractedField, DocTypeInfo, ProcessingStep, StepState } from "./_types";

const ACCENT = "#06b6d4";

const STEPS: { key: ProcessingStep; label: string }[] = [
  { key: "extract",  label: "Extract" },
  { key: "classify", label: "Classify" },
  { key: "analyze",  label: "Analyze" },
  { key: "validate", label: "Validate" },
];

function ProcessingRail({ steps }: { steps: StepState[] }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {steps.map((s, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
              style={s.status === "done"
                ? { background: "#10b98130", color: "#10b981", border: "1px solid #10b98150" }
                : s.status === "running"
                ? { background: `${ACCENT}25`, color: ACCENT, border: `1px solid ${ACCENT}50`, animation: "pulse 1.5s infinite" }
                : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.08)" }}>
              {s.status === "done"
                ? <svg width="9" height="9" viewBox="0 0 10 10"><path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/></svg>
                : s.status === "running"
                ? <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>◌</span>
                : i + 1}
            </div>
            <span className="text-[9px]"
              style={{ color: s.status === "done" ? "#10b981" : s.status === "running" ? ACCENT : "rgba(255,255,255,0.25)" }}>
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className="w-6 h-px" style={{ background: "rgba(255,255,255,0.12)" }} />
          )}
        </div>
      ))}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function DocIntelRunner({ docTypes }: { docTypes: DocTypeInfo[] }) {
  const [step, setStep]               = useState<ProcessingStep>("idle");
  const [stepStates, setStepStates]   = useState<StepState[]>(
    STEPS.map(s => ({ key: s.key, label: s.label, status: "pending" } as StepState))
  );
  const [fields, setFields]           = useState<ExtractedField[]>([]);
  const [pageImages, setPageImages]   = useState<string[]>([]);
  const [docType, setDocType]         = useState<string>("auto");
  const [detectedType, setDetectedType] = useState<string | null>(null);
  const [detectedConf, setDetectedConf] = useState(0);
  const [docTypeLabel, setDocTypeLabel] = useState<string | null>(null);
  const [processingMode, setProcessingMode] = useState<string | null>(null);
  const [activeField, setActiveField] = useState<string | null>(null);
  const [error, setError]             = useState<string | null>(null);
  const [warning, setWarning]         = useState<string | null>(null);
  const [isDragging, setIsDragging]   = useState(false);
  const [fileName, setFileName]       = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const resetSteps = () => setStepStates(STEPS.map(s => ({ key: s.key, label: s.label, status: "pending" } as StepState)));

  const updateStep = (key: string, status: "running" | "done") => {
    setStepStates(prev => prev.map(s =>
      (s as unknown as { key: string }).key === key ? { ...s, status } : s
    ));
  };

  const runAnalysis = useCallback(async (file: File) => {
    setError(null);
    setWarning(null);
    setFields([]);
    setPageImages([]);
    setDetectedType(null);
    setDocTypeLabel(null);
    setProcessingMode(null);
    resetSteps();
    setFileName(file.name);
    setStep("extract");

    const fd = new FormData();
    fd.append("file", file);
    fd.append("doc_type", docType);

    try {
      const res = await fetch(`${ML_UNIFIED_API}/document/analyze`, { method: "POST", body: fd });
      if (!res.ok || !res.body) throw new Error(`Request failed: ${res.statusText}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? ""; // keep incomplete last line in buffer
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          try {
            const evt = JSON.parse(line.slice(5).trim());

            if (evt.error) { setError(evt.error); setStep("error"); return; }
            if (evt.warning) setWarning(evt.warning);

            if (evt.step) {
              setStep(evt.step as ProcessingStep);
              updateStep(evt.step, evt.status);
              if (evt.doc_type) {
                setDetectedType(evt.doc_type);
                setDetectedConf(evt.classification_confidence ?? 0.7);
                setDocTypeLabel(evt.doc_type_label ?? null);
              }
            }

            if (evt.field) setFields(prev => [...prev, evt.field as ExtractedField]);

            if (evt.done) {
              setStep("done");
              if (evt.page_images?.length) setPageImages(evt.page_images);
              if (evt.doc_type) { setDetectedType(evt.doc_type); setDocTypeLabel(evt.doc_type_label ?? null); }
              if (evt.processing_mode) setProcessingMode(evt.processing_mode);
            }
          } catch { /* skip malformed lines */ }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
      setStep("error");
    }
  }, [docType]);

  const handleFile = (file: File) => { runAnalysis(file); };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const isProcessing = !["idle", "done", "error"].includes(step);

  const cardStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 14,
  };

  return (
    <div className="flex gap-4">
      <DocSidebar
        docTypes={docTypes}
        selectedType={docType}
        onSelect={setDocType}
        detectedType={detectedType}
        detectedConfidence={detectedConf}
        disabled={isProcessing}
      />

      <div className="flex-1 flex flex-col gap-4 min-w-0">
        {/* Upload zone */}
        {step === "idle" && (
          <div
            style={{
              ...cardStyle,
              borderStyle: isDragging ? "solid" : "dashed",
              borderColor: isDragging ? ACCENT : "rgba(255,255,255,0.12)",
              background: isDragging ? "rgba(6,182,212,0.05)" : "rgba(255,255,255,0.02)",
              transition: "all 0.2s",
            }}
            className="flex flex-col items-center justify-center gap-4 py-16 cursor-pointer"
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
          >
            <input ref={inputRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" className="hidden"
              onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none"
              style={{ color: isDragging ? ACCENT : "rgba(255,255,255,0.2)" }}>
              <path d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M12 12V4M8 8l4-4 4 4"
                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <div className="text-center">
              <p className="text-sm font-medium" style={{ color: isDragging ? ACCENT : "rgba(255,255,255,0.6)" }}>
                {isDragging ? "Drop to analyze" : "Drag & drop or click to upload"}
              </p>
              <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.25)" }}>
                PDF, PNG, JPG, WEBP · Max 10 MB
              </p>
            </div>
          </div>
        )}

        {/* Processing / results area */}
        {step !== "idle" && (
          <>
            {/* Processing steps rail */}
            <div style={cardStyle} className="px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex flex-col gap-1">
                {fileName && (
                  <p className="text-[9px] truncate max-w-[200px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                    {fileName}
                  </p>
                )}
                <ProcessingRail steps={stepStates} />
              </div>
              <button
                onClick={() => { setStep("idle"); setFields([]); setFileName(null); }}
                className="text-[9px] px-2.5 py-1 rounded-md border transition-colors hover:bg-white/5 shrink-0"
                style={{ borderColor: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.4)" }}>
                New document
              </button>
            </div>

            {error && (
              <div className="px-4 py-3 rounded-xl text-[11px]"
                style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
                {error}
              </div>
            )}
            {warning && !error && (
              <div className="px-4 py-3 rounded-xl text-[11px]"
                style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", color: "#fbbf24" }}>
                {warning}
              </div>
            )}

            {/* Viewer + Fields side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1">
              <DocViewerPanel
                pageImages={pageImages}
                fields={fields}
                activeField={activeField}
                onFieldClick={setActiveField}
                isScanning={isProcessing}
                processingMode={processingMode}
              />
              <DocFieldsPanel
                fields={fields}
                activeField={activeField}
                onFieldHover={setActiveField}
                docTypeLabel={docTypeLabel}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}