"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface CodeExportModalProps {
  code: string;
  onClose: () => void;
}

export default function CodeExportModal({ code, onClose }: CodeExportModalProps) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleDownload() {
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pipeline.py";
    a.click();
    URL.revokeObjectURL(url);
  }

  const iconProps = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        background: "rgba(0,0,0,0.72)",
        backdropFilter: "blur(4px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 80 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 80 }}
          transition={{ type: "spring", stiffness: 280, damping: 28 }}
          style={{
            width: "100%",
            maxWidth: 860,
            margin: "auto",
            padding: "1.5rem",
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            position: "relative",
          }}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              position: "absolute",
              top: "1rem",
              right: "1rem",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0.25rem",
              borderRadius: 6,
              transition: "color 0.15s",
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.color = "var(--text)")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.color = "var(--text3)")
            }
            aria-label="Close modal"
          >
            <svg {...iconProps}>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          {/* Title */}
          <div style={{ marginBottom: "1.25rem", paddingRight: "2rem" }}>
            <h2
              style={{
                margin: 0,
                fontSize: "1.05rem",
                fontWeight: 700,
                color: "var(--text)",
              }}
            >
              Export Pipeline Code
            </h2>
            <p
              style={{
                margin: "0.3rem 0 0",
                fontSize: "0.8rem",
                color: "var(--text3)",
              }}
            >
              Copy or download the auto-generated Python script
            </p>
          </div>

          {/* Code block wrapper */}
          <div style={{ position: "relative" }}>
            {/* Action buttons */}
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                gap: "0.5rem",
                position: "absolute",
                top: "0.75rem",
                right: "0.75rem",
                zIndex: 10,
              }}
            >
              {/* Copy */}
              <button
                onClick={handleCopy}
                title={copied ? "Copied!" : "Copy to clipboard"}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  padding: "0.35rem 0.7rem",
                  background: "var(--border)",
                  border: "1px solid var(--border2)",
                  borderRadius: 7,
                  cursor: "pointer",
                  color: copied ? "#4ade80" : "var(--text2)",
                  fontSize: "0.75rem",
                  fontWeight: 500,
                  transition: "all 0.15s",
                }}
              >
                <svg {...iconProps} width={16} height={16}>
                  <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                  <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                </svg>
                {copied ? "Copied!" : "Copy"}
              </button>

              {/* Download */}
              <button
                onClick={handleDownload}
                title="Download as pipeline.py"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  padding: "0.35rem 0.7rem",
                  background: "var(--border)",
                  border: "1px solid var(--border2)",
                  borderRadius: 7,
                  cursor: "pointer",
                  color: "var(--text2)",
                  fontSize: "0.75rem",
                  fontWeight: 500,
                  transition: "all 0.15s",
                }}
              >
                <svg {...iconProps} width={16} height={16}>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download
              </button>
            </div>

            {/* Code block */}
            <pre
              style={{
                margin: 0,
                padding: "1rem",
                paddingTop: "3.25rem",
                background: "var(--border)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
                fontSize: "0.8rem",
                lineHeight: 1.65,
                color: "var(--text)",
                overflowY: "auto",
                maxHeight: "60vh",
                overflowX: "auto",
                whiteSpace: "pre",
              }}
            >
              {code}
            </pre>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
