"use client";

import { useState } from "react";
import type { Bbox } from "./_types";

const ACCENT = "#a78bfa";

type Tab = "text" | "image" | "ai";

type Props = {
  removedBboxes: Bbox[];
  filledIndices: number[];
  aiFilling: boolean;
  onAddText: (index: number, text: string) => void;
  onAddImage: (index: number, file: File) => void;
  onAddAiFill: (index: number, prompt: string) => Promise<void>;
};

/** "+" affordance over each removed-but-not-yet-filled region, plus an
 * inline (not floating — avoids clipping against the image wrapper's
 * overflow-y:auto) editor for whichever region is currently selected: type
 * text, paste an image, or describe an AI fill. Purely presentational —
 * every action bubbles up to useInpaint.ts, which owns the actual
 * compositing/persistence. Rendered by CitationThumbnailPanel only when
 * draw mode is off (freehand drawing and this both want the image's
 * pointer events for their own purpose). */
export default function AddContentControls({ removedBboxes, filledIndices, aiFilling, onAddText, onAddImage, onAddAiFill }: Props) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [tab, setTab] = useState<Tab>("text");
  const [text, setText] = useState("");
  const [prompt, setPrompt] = useState("");

  const openRegions = removedBboxes
    .map((bbox, i) => ({ bbox, i }))
    .filter(({ i }) => !filledIndices.includes(i));

  const close = () => { setActiveIndex(null); setText(""); setPrompt(""); setTab("text"); };

  return (
    <>
      {openRegions.map(({ bbox, i }) => {
        const [bx, by, bw, bh] = bbox;
        return (
          <button key={i} onClick={() => { setActiveIndex(i); setTab("text"); }}
            className="absolute pointer-events-auto rounded-full flex items-center justify-center hover:brightness-110"
            style={{
              left: `${(bx + bw / 2) * 100}%`, top: `${(by + bh / 2) * 100}%`,
              transform: "translate(-50%, -50%)", width: 22, height: 22,
              background: ACCENT, color: "#0b0b12", fontSize: 14, fontWeight: 700,
              boxShadow: "0 0 0 2px rgba(0,0,0,0.4)",
            }}
            title="Add something here">
            +
          </button>
        );
      })}
      {activeIndex !== null && (
        <div className="absolute left-0 right-0 bottom-0 pointer-events-auto flex flex-col gap-1.5 p-2"
          style={{ background: "rgba(10,10,16,0.92)", borderTop: `1px solid ${ACCENT}40` }}>
          <div className="flex items-center gap-1.5">
            {(["text", "image", "ai"] as Tab[]).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className="text-[9px] px-2 py-0.5 rounded border"
                style={tab === t
                  ? { borderColor: `${ACCENT}55`, background: `${ACCENT}22`, color: ACCENT }
                  : { borderColor: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.5)" }}>
                {t === "text" ? "Text" : t === "image" ? "Image" : "AI fill"}
              </button>
            ))}
            <button onClick={close} className="text-[9px] ml-auto px-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>✕</button>
          </div>
          {tab === "text" && (
            <div className="flex items-center gap-1.5">
              <input value={text} onChange={e => setText(e.target.value)} placeholder="Label or caption…"
                className="flex-1 text-[10px] rounded px-2 py-1" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#eee" }} />
              <button onClick={() => { onAddText(activeIndex, text); close(); }} disabled={!text.trim()}
                className="text-[9px] px-2 py-1 rounded" style={{ background: ACCENT, color: "#0b0b12", opacity: text.trim() ? 1 : 0.4 }}>
                Add
              </button>
            </div>
          )}
          {tab === "image" && (
            <input type="file" accept="image/*" className="text-[9px]" style={{ color: "rgba(255,255,255,0.6)" }}
              onChange={e => { const f = e.target.files?.[0]; if (f) { onAddImage(activeIndex, f); close(); } }} />
          )}
          {tab === "ai" && (
            <div className="flex items-center gap-1.5">
              <input value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Describe what goes here (optional)…"
                disabled={aiFilling}
                className="flex-1 text-[10px] rounded px-2 py-1" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#eee" }} />
              <button onClick={async () => { await onAddAiFill(activeIndex, prompt); close(); }} disabled={aiFilling}
                className="text-[9px] px-2 py-1 rounded whitespace-nowrap" style={{ background: ACCENT, color: "#0b0b12", opacity: aiFilling ? 0.5 : 1 }}>
                {aiFilling ? "Generating…" : "Generate"}
              </button>
            </div>
          )}
          {tab === "ai" && (
            <p className="text-[8px]" style={{ color: "rgba(255,255,255,0.35)" }}>Can take up to a minute — free community model, no guaranteed uptime.</p>
          )}
        </div>
      )}
    </>
  );
}