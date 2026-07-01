"use client";

type JinaStatus = "idle" | "loading" | "ready";

type Props = {
  jinaStatus: JinaStatus;
  useJina: boolean;
  lowConfidence: boolean;
  accent: string;
  onEnableJina: () => void;
};

export default function RagJinaBanner({ jinaStatus, useJina, lowConfidence, accent, onEnableJina }: Props) {
  if (useJina && jinaStatus === "loading") {
    return (
      <div style={{
        fontSize: "0.62rem", color: "#fbbf24",
        background: "#fbbf2412", border: "1px solid #fbbf2430",
        borderRadius: 6, padding: "0.3rem 0.6rem",
      }}>
        Loading Jina v3 (~570 MB) — using standard embedding for now…
      </div>
    );
  }

  if (useJina && jinaStatus === "ready") {
    return (
      <div style={{
        fontSize: "0.62rem", color: accent,
        background: `${accent}12`, border: `1px solid ${accent}30`,
        borderRadius: 6, padding: "0.3rem 0.6rem",
      }}>
        Enhanced embedding (Jina v3) active
      </div>
    );
  }

  if (lowConfidence && !useJina) {
    return (
      <button onClick={onEnableJina} style={{
        fontSize: "0.62rem", color: accent,
        background: `${accent}12`, border: `1px solid ${accent}33`,
        borderRadius: 6, padding: "0.3rem 0.6rem",
        cursor: "pointer", width: "100%", textAlign: "left",
      }}>
        Results seem limited — try Enhanced Embedding (Jina v3)?
      </button>
    );
  }

  return null;
}