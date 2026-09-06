"use client";

import { useState, useRef, useCallback } from "react";
import { ML_UNIFIED_API } from "@/config/urls";
import { trackedFetch, trackRunStart, trackRunError, newRunId } from "@/lib/trackedFetch";
import { STAGE, ERR } from "@/lib/logEvents";
import DocSidebar from "./DocSidebar";
import DocViewerPanel from "./DocViewerPanel";
import DocFieldsPanel from "./DocFieldsPanel";
import DocChatPanel from "./DocChatPanel";
import DocHistory, { saveHistoryEntry } from "./DocHistory";
import ProcessingRail, { STEPS } from "./DocProcessingRail";
import type { ExtractedField, DocTypeInfo, HistoryEntry, ProcessingStep, StepState } from "./_types";

const ACCENT = "#387e8a";

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
  const [provider, setProvider]       = useState<string | null>(null);
  const [docText, setDocText]         = useState<string>("");
  const [customFields, setCustomFields] = useState<string>("");
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
    setProvider(null);
    setDocText("");
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
    if (customFields.trim()) fd.append("custom_fields", customFields.trim());

    const runId = newRunId();
    trackRunStart("document-intelligence", runId,
                  { doc_type: docType, size_bytes: file.size });

    try {
      const res = await trackedFetch(`${ML_UNIFIED_API}/document/analyze`,
        { method: "POST", body: fd },
        { tool: "document-intelligence", runId, streaming: true, meta: { doc_type: docType } });
      if (!res.ok || !res.body) throw new Error(`Request failed: ${res.statusText}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      const collected: ExtractedField[] = []; // fields state is async — collect for history

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

            if (evt.error) {
              setError(evt.error); setStep("error");
              // Same in-band case: a 200 stream carrying a failure. Returning
              // here also abandons the stream, which the wrapper would other-
              // wise record as a user cancellation.
              trackRunError("document-intelligence", runId, STAGE.RUN,
                /429|rate limit/i.test(String(evt.error)) ? ERR.RATE_LIMITED : ERR.UNKNOWN,
                { doc_type: docType, reason: "in_band_stream_error",
                  message: String(evt.error).slice(0, 120) });
              return;
            }
            if (evt.warning) setWarning(evt.warning);
            if (evt.provider) setProvider(evt.provider);

            if (evt.step) {
              setStep(evt.step as ProcessingStep);
              updateStep(evt.step, evt.status);
              if (evt.doc_type) {
                setDetectedType(evt.doc_type);
                setDetectedConf(evt.classification_confidence ?? 0.7);
                setDocTypeLabel(evt.doc_type_label ?? null);
              }
            }

            if (evt.field) {
              collected.push(evt.field as ExtractedField);
              setFields(prev => [...prev, evt.field as ExtractedField]);
            }

            if (evt.done) {
              setStep("done");
              if (evt.page_images?.length) setPageImages(evt.page_images);
              if (evt.doc_type) { setDetectedType(evt.doc_type); setDocTypeLabel(evt.doc_type_label ?? null); }
              if (evt.processing_mode) setProcessingMode(evt.processing_mode);
              if (evt.doc_text) setDocText(evt.doc_text);
              if (collected.length) {
                saveHistoryEntry({
                  id: `${file.name}-${file.size}-${evt.doc_type ?? ""}`,
                  fileName: file.name,
                  docTypeLabel: evt.doc_type_label ?? null,
                  provider: evt.provider ?? null,
                  at: new Date().toISOString(),
                  fields: collected,
                  docText: evt.doc_text ?? "",
                });
              }
            }
          } catch { /* skip malformed lines */ }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Analysis failed";
      const isNetwork = msg.toLowerCase().includes("network") || msg.toLowerCase().includes("fetch") || msg.toLowerCase().includes("failed to fetch");
      setError(isNetwork
        ? "Connection lost — the server may be restarting. Please wait a few seconds and try again."
        : msg);
      setStep("error");
    }
  }, [docType, customFields]);

  const handleFile = (file: File) => { runAnalysis(file); };

  const handleFieldEdit = (name: string, value: string) => {
    // HITL feedback loop: report the correction so future extractions of this
    // document type get it as few-shot guidance. Fire-and-forget.
    const edited = fields.find(f => f.name === name);
    const aiValue = edited?.originalValue ?? edited?.value ?? "";
    if (edited && value !== aiValue) {
      trackedFetch(`${ML_UNIFIED_API}/document/correction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doc_type: detectedType ?? docType,
          name,
          label: edited.label,
          original_value: aiValue,
          corrected_value: value,
        }),
      }, { tool: "document-intelligence-correction" }).catch(() => { /* feedback is best-effort */ });
    }
    setFields(prev => prev.map(f => {
      if (f.name !== name) return f;
      if (value === (f.originalValue ?? f.value)) {
        // Edited back to the AI's value — drop the edit marker entirely
        const { originalValue: _o, ...rest } = f;
        return { ...rest, value, confidence: f.confidence };
      }
      return { ...f, value, confidence: 1,
               originalValue: f.originalValue ?? f.value,
               validation: { status: "corrected", note: "Edited by you — human-verified" } };
    }));
  };

  const restoreFromHistory = (e: HistoryEntry) => {
    setError(null); setWarning(null);
    setFields(e.fields);
    setPageImages([]);           // page previews are not persisted
    setProcessingMode(null);
    setDocTypeLabel(e.docTypeLabel);
    setProvider(e.provider);
    setDocText(e.docText);
    setFileName(e.fileName);
    setStepStates(STEPS.map(s => ({ key: s.key, label: s.label, status: "done" } as StepState)));
    setStep("done");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const isProcessing = !["idle", "done", "error"].includes(step);

  const cardStyle: React.CSSProperties = {
    background: "var(--bg-glass)",
    backdropFilter: "blur(14px)",
    border: "1px solid var(--border)",
    borderRadius: 16,
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
              borderColor: isDragging ? ACCENT : "var(--border2)",
              background: isDragging ? "rgba(6,182,212,0.05)" : "var(--bg-glass)",
              ["--acc-glow" as string]: `${ACCENT}14`,
            }}
            data-wt="doc-upload"
            className="subtle-card flex flex-col items-center justify-center gap-4 py-16 cursor-pointer"
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
          >
            <input ref={inputRef} type="file" accept=".pdf,.docx,.png,.jpg,.jpeg,.webp" className="hidden"
              onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none"
              style={{ color: isDragging ? ACCENT : "var(--text3)" }}>
              <path d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M12 12V4M8 8l4-4 4 4"
                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <div className="text-center">
              <p className="text-sm font-medium" style={{ color: isDragging ? ACCENT : "var(--text2)" }}>
                {isDragging ? "Drop to analyze" : "Drag & drop or click to upload"}
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--text3)" }}>
                PDF, DOCX, PNG, JPG, WEBP · Max 10 MB
              </p>
            </div>
          </div>
        )}

        {/* Custom fields — extra field names to extract, applied on next upload */}
        {step === "idle" && (
          <div style={cardStyle} className="px-4 py-3 flex flex-col gap-1.5">
            <label className="text-[9px] font-bold uppercase tracking-[0.12em]"
              style={{ color: "var(--text3)" }}>
              Extra fields to extract <span className="normal-case font-normal">(optional, comma-separated)</span>
            </label>
            <input
              data-wt="doc-custom-fields"
              value={customFields}
              onChange={e => setCustomFields(e.target.value)}
              onClick={e => e.stopPropagation()}
              placeholder="e.g. GST Number, HSN Code, PO Reference"
              className="bg-transparent text-[11px] px-3 py-2 rounded-lg border outline-none"
              style={{ borderColor: "var(--border2)", color: "var(--text)" }}
            />
          </div>
        )}

        {/* Recent documents — restore a previous analysis from localStorage */}
        {step === "idle" && <DocHistory onRestore={restoreFromHistory} />}

        {/* Processing / results area */}
        {step !== "idle" && (
          <>
            {/* Processing steps rail */}
            <div data-wt="doc-rail" style={cardStyle} className="px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex flex-col gap-1">
                {fileName && (
                  <p className="text-[9px] truncate max-w-[200px]" style={{ color: "var(--text3)" }}>
                    {fileName}
                  </p>
                )}
                <ProcessingRail steps={stepStates} />
              </div>
              <button
                onClick={() => { setStep("idle"); setFields([]); setFileName(null); }}
                data-wt="doc-new"
                className="text-[9px] px-2.5 py-1 rounded-md border transition-colors hover:bg-[rgba(var(--fg-rgb),0.05)] shrink-0"
                style={{ borderColor: "var(--border2)", color: "var(--text3)" }}>
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
                provider={provider}
                onFieldEdit={handleFieldEdit}
              />
            </div>

            {/* Chat with the analyzed document */}
            {step === "done" && docText && (
              <DocChatPanel docText={docText} fields={fields} />
            )}
          </>
        )}
      </div>
    </div>
  );
}