"use client";

import { useState } from "react";
import type { Bbox } from "./_types";

const ACCENT = "#7e68c0";

type Tab = "text" | "image" | "ai";

type Props = {
  removedBboxes: Bbox[];
  filledIndices: number[];
  aiFilling: boolean;
  aiFillProgress: number;
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
export default function AddContentControls({ removedBboxes, filledIndices, aiFilling, aiFillProgress, onAddText, onAddImage, onAddAiFill }: Props) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [tab, setTab] = useState<Tab>("text");
  const [text, setText] = useState("");
  const [prompt, setPrompt] = useState("");

  const openRegions = removedBboxes
    .map((bbox, i) => ({ bbox, i }))
    .filter(({ i }) => !filledIndices.includes(i));

  const close = () => { setActiveIndex(null); setText(""); setPrompt(""); setTab("text"); };

  // Anchored to the clicked region's own bbox (same coordinate the "+"
  // button uses), NOT the bottom of the full image — a tall PDF page can be
  // 2-3x taller than the scrollable viewport (maxHeight:460 in
  // CitationThumbnailPanel.tsx), and a panel pinned to the image's true
  // bottom edge sits far below what's currently visible. Focusing its text
  // input then makes the browser auto-scroll the container down to reveal
  // it, landing on blank page whitespace past the real content — verified
  // live: the composited image data was always correct, only the visible
  // scroll position was wrong. The clicked region itself is guaranteed to
  // already be on screen, so anchoring there needs no scroll at all.
  const activeBbox = activeIndex !== null ? removedBboxes[activeIndex] : null;

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
              background: ACCENT, color: "#fff", fontSize: 14, fontWeight: 700,
              boxShadow: "0 0 0 2px rgba(0,0,0,0.4)",
            }}
            title="Add something here">
            +
          </button>
        );
      })}
      {activeIndex !== null && activeBbox && (
        <div className="absolute pointer-events-auto flex flex-col gap-1.5 p-2 rounded"
          style={{
            left: `${(activeBbox[0] + activeBbox[2] / 2) * 100}%`, top: `${activeBbox[1] * 100}%`,
            transform: "translate(-50%, calc(-100% - 8px))",
            width: 220, maxWidth: "calc(100% - 16px)",
            background: "var(--bg-card)", border: `1px solid ${ACCENT}40`,
            boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
          }}>
          <div className="flex items-center gap-1.5">
            {(["text", "image", "ai"] as Tab[]).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className="text-[9px] px-2 py-0.5 rounded border"
                style={tab === t
                  ? { borderColor: `${ACCENT}55`, background: `${ACCENT}22`, color: ACCENT }
                  : { borderColor: "var(--border2)", color: "var(--text2)" }}>
                {t === "text" ? "Text" : t === "image" ? "Image" : "AI fill"}
              </button>
            ))}
            <button onClick={close} className="text-[9px] ml-auto px-1.5" style={{ color: "var(--text2)" }}>✕</button>
          </div>
          {tab === "text" && (
            <div className="flex items-center gap-1.5">
              <input value={text} onChange={e => setText(e.target.value)} placeholder="Label or caption…"
                className="flex-1 text-[10px] rounded px-2 py-1" style={{ background: "var(--border)", border: "1px solid var(--border2)", color: "var(--text)" }} />
              <button onClick={() => { onAddText(activeIndex, text); close(); }} disabled={!text.trim()}
                className="text-[9px] px-2 py-1 rounded" style={{ background: ACCENT, color: "#fff", opacity: text.trim() ? 1 : 0.4 }}>
                Add
              </button>
            </div>
          )}
          {tab === "image" && (
            <input type="file" accept="image/*" className="text-[9px]" style={{ color: "var(--text2)" }}
              onChange={e => { const f = e.target.files?.[0]; if (f) { onAddImage(activeIndex, f); close(); } }} />
          )}
          {tab === "ai" && (
            <div className="flex items-center gap-1.5">
              <input value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Describe what goes here (optional)…"
                disabled={aiFilling}
                className="flex-1 text-[10px] rounded px-2 py-1" style={{ background: "var(--border)", border: "1px solid var(--border2)", color: "var(--text)" }} />
              <button onClick={async () => { await onAddAiFill(activeIndex, prompt); close(); }} disabled={aiFilling}
                className="text-[9px] px-2 py-1 rounded whitespace-nowrap" style={{ background: ACCENT, color: "#fff", opacity: aiFilling ? 0.5 : 1 }}>
                {aiFilling ? "Generating…" : "Generate"}
              </button>
            </div>
          )}
          {tab === "ai" && aiFilling && (
            <div className="rounded-full overflow-hidden" style={{ height: 4, background: "var(--border)" }}>
              <div style={{ width: `${aiFillProgress}%`, height: "100%", background: ACCENT, transition: "width 0.3s linear" }} />
            </div>
          )}
          {tab === "ai" && (
            <p className="text-[8px]" style={{ color: "var(--text3)" }}>Usually takes a few seconds.</p>
          )}
        </div>
      )}
    </>
  );
}