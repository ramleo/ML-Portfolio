"use client";

import { useState } from "react";
import { useToolTracking } from "@/hooks/useAnalytics";
import ConstellationBackground from "@/components/ConstellationBackground";
import ToolsAIChat from "@/components/ToolsAIChat";
import ThemeToggle from "@/components/ThemeToggle";
import DocIntelRunner from "./DocIntelRunner";
import DocUserGuideModal from "./DocUserGuideModal";
import { DOC_INTEL_GUIDE, DOC_INTEL_SUGGESTIONS } from "./userGuide";
import ToolBackNav from "@/components/ToolBackNav";

const ACCENT = "#387e8a";

const DOC_TYPES_STATIC = [
  { id: "invoice",        label: "Invoice",        description: "Vendor invoice or bill",                fields: [] },
  { id: "receipt",        label: "Receipt",        description: "Purchase receipt",                      fields: [] },
  { id: "contract",       label: "Contract",       description: "Legal contract or agreement",           fields: [] },
  { id: "resume",         label: "Resume / CV",    description: "Professional resume or CV",             fields: [] },
  { id: "medical_report", label: "Medical Report", description: "Medical examination or lab report",     fields: [] },
  { id: "bank_statement", label: "Bank Statement", description: "Bank account statement",               fields: [] },
  { id: "id_card",        label: "ID Card",        description: "Government-issued identity document",  fields: [] },
  { id: "purchase_order", label: "Purchase Order", description: "Purchase order or procurement doc",    fields: [] },
];

export default function DocumentIntelligencePage() {
  useToolTracking("document-intelligence");
  const [guideOpen, setGuideOpen] = useState(false);

  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ color: "var(--text)" }}>
      <ConstellationBackground />
      <ToolsAIChat context={{
        accent: ACCENT,
        tool: "Document Intelligence",
        summary: "AI-powered document data extraction. Upload PDF invoices, contracts, resumes, medical reports, and more to extract structured fields with confidence scores using OCR and LLM analysis.",
        guide: DOC_INTEL_GUIDE,
        suggestions: DOC_INTEL_SUGGESTIONS,
      }} />

      <div role="main" className="relative z-10 flex flex-col gap-6 pt-6 pb-12">
        <div className="max-w-7xl mx-auto px-4 w-full">
          {/* Back button */}
          <ToolBackNav toolId={"document-intelligence"} />

          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${ACCENT}18`, border: `1px solid ${ACCENT}30` }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"
                  stroke={ACCENT} strokeWidth="1.5" strokeLinejoin="round"/>
                <path d="M14 2v6h6M9 13h6M9 17h4"
                  stroke={ACCENT} strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>Document Intelligence</h1>
                <span className="text-[9px] px-2 py-[3px] rounded-full font-bold uppercase tracking-wider"
                  style={{ background: `${ACCENT}18`, color: ACCENT, border: `1px solid ${ACCENT}35` }}>
                  AI Extraction
                </span>
              </div>
              <p className="text-xs mt-0.5" style={{ color: "var(--text3)" }}>
                Extract structured data from invoices, contracts, resumes & more — powered by LLM analysis
              </p>
            </div>
            <button onClick={() => setGuideOpen(true)}
              className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg border transition-colors hover:bg-[rgba(var(--fg-rgb),0.05)] shrink-0"
              style={{ borderColor: `${ACCENT}35`, color: ACCENT }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5A2.5 2.5 0 006.5 22H20V2H6.5A2.5 2.5 0 004 4.5v15z"
                  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              User Guide
            </button>
            <ThemeToggle />
          </div>

          <DocUserGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />

          {/* Main runner */}
          <DocIntelRunner docTypes={DOC_TYPES_STATIC} />
        </div>
      </div>
    </div>
  );
}