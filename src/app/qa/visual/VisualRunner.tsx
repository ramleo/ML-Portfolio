"use client";

import { useEffect, useState } from "react";
import { useVisual } from "./useVisual";
import { isFirstParty } from "../lib/ownership";
import OwnershipGate from "../lib/OwnershipGate";

const DEFAULT_URL = "https://ml-portfolio-rho.vercel.app";
const PER_PIXEL_TOL = 0.1; // fixed anti-aliasing/compression tolerance per pixel
const MAX_URL = 300;

// Verdict thresholds (% of pixels allowed to change and still "pass").
const THRESHOLDS = [
  { v: 0.1, label: "0.1% (strict)" },
  { v: 0.5, label: "0.5%" },
  { v: 1, label: "1%" },
  { v: 2, label: "2% (lenient)" },
];

export default function VisualRunner({ accent }: { accent: string }) {
  const { state, capture, reset, refreshBaseline, clearBaseline } = useVisual();
  const [url, setUrl] = useState(DEFAULT_URL);
  const [passPct, setPassPct] = useState(0.5);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => { refreshBaseline(url); }, [url, refreshBaseline, state.savedBaseline]);

  const busy = state.phase === "capturing" || state.phase === "diffing";
  const thirdParty = !isFirstParty(url);
  const canCapture = url.trim().length > 0 && !busy && (!thirdParty || authorized);
  const passed = state.diff ? state.diff.percent <= passPct : null;

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl px-4 py-3 text-[12px] leading-relaxed"
        style={{ background: `${accent}12`, border: `1px solid ${accent}30`, color: "var(--text2)" }}>
        <span className="font-semibold" style={{ color: "var(--text)" }}>Visual regression.</span>{" "}
        Capture a page on isolated CI as a <span className="font-semibold" style={{ color: "var(--text)" }}>baseline</span> (saved in your
        browser), then compare later captures against it pixel-for-pixel. Best on static pages — animated
        or WebGL sections (moving backgrounds) will always read as changed.
      </div>

      <div className="rounded-2xl p-5 flex flex-col gap-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--text3)" }}>Page URL</span>
          <input value={url} onChange={e => setUrl(e.target.value.slice(0, MAX_URL))} spellCheck={false}
            placeholder="https://your-site.example/page"
            className="text-[13px] px-3 py-2 rounded-lg outline-none"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }} />
        </label>

        <OwnershipGate show={thirdParty} checked={authorized} onChange={setAuthorized} accent={accent} />

        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => capture(url, "baseline", PER_PIXEL_TOL, authorized)} disabled={!canCapture}
            className="text-[13px] font-semibold px-4 py-2 rounded-lg transition-opacity disabled:opacity-40"
            style={{ background: accent, color: "#fff" }}>
            {busy && state.mode === "baseline" ? "Capturing…" : "Capture baseline"}
          </button>
          <button onClick={() => capture(url, "compare", PER_PIXEL_TOL, authorized)} disabled={!canCapture || !state.hasBaseline}
            className="text-[13px] font-semibold px-4 py-2 rounded-lg border transition-opacity disabled:opacity-40"
            style={{ borderColor: `${accent}55`, color: accent }}>
            {busy && state.mode === "compare" ? "Comparing…" : "Compare to baseline"}
          </button>
          <label className="flex items-center gap-1.5 text-[12px]" style={{ color: "var(--text3)" }}>
            <span className="uppercase tracking-wide font-semibold text-[11px]">Tolerance</span>
            <select value={passPct} onChange={e => setPassPct(Number(e.target.value))} disabled={busy}
              className="text-[12px] px-2 py-1.5 rounded-lg outline-none disabled:opacity-40"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}>
              {THRESHOLDS.map(t => <option key={t.v} value={t.v}>{t.label}</option>)}
            </select>
          </label>
          <span className="text-[11px]" style={{ color: state.hasBaseline ? "#34d399" : "var(--text3)" }}>
            {state.hasBaseline ? "● baseline saved" : "○ no baseline yet"}
          </span>
          {state.hasBaseline && (
            <button onClick={() => clearBaseline(url)} disabled={busy}
              className="text-[11px] underline underline-offset-2 disabled:opacity-40" style={{ color: "var(--text3)" }}>
              Clear baseline
            </button>
          )}
        </div>
      </div>

      {state.phase === "error" && (
        <div className="rounded-xl px-4 py-3 text-[12px]"
          style={{ background: "rgba(220,38,38,0.10)", border: "1px solid rgba(220,38,38,0.35)", color: "#dc2626" }}>
          {state.error}
        </div>
      )}

      {state.phase === "done" && state.mode === "baseline" && state.shot && (
        <div className="rounded-2xl overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <div className="px-4 py-2.5 border-b flex items-center gap-2" style={{ borderColor: "var(--border)" }}>
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#34d399" }} />
            <span className="text-[12px] font-bold" style={{ color: "var(--text)" }}>Baseline saved</span>
            <span className="text-[11px]" style={{ color: "var(--text3)" }}>— compare against this later</span>
          </div>
          <img alt="Baseline screenshot" src={`data:image/png;base64,${state.shot}`}
            className="w-full" style={{ display: "block" }} />
        </div>
      )}

      {state.phase === "done" && state.mode === "compare" && state.diff && (
        <div className="rounded-2xl overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <div className="px-4 py-3 border-b flex items-center gap-3 flex-wrap" style={{ borderColor: "var(--border)" }}>
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: passed ? "#34d399" : "#f43f5e" }} />
            <span className="text-sm font-bold" style={{ color: passed ? "#34d399" : "#f43f5e" }}>
              {passed ? "No visual change" : "Visual change detected"}
            </span>
            <span className="text-[12px] tabular-nums" style={{ color: "var(--text2)" }}>
              {state.diff.percent.toFixed(2)}% of pixels changed · threshold {passPct}%
            </span>
            {state.diff.sizeMismatch && (
              <span className="text-[11px]" style={{ color: "#f59e0b" }}>⚠ page size changed since baseline</span>
            )}
          </div>
          <div className="grid gap-3 p-4 sm:grid-cols-2">
            <figure className="m-0">
              <figcaption className="text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: "var(--text3)" }}>Current</figcaption>
              {state.shot && <img alt="Current screenshot" src={`data:image/png;base64,${state.shot}`}
                className="w-full rounded-lg" style={{ border: "1px solid var(--border)" }} />}
            </figure>
            <figure className="m-0">
              <figcaption className="text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: "var(--text3)" }}>Diff (changes in red)</figcaption>
              <img alt="Diff overlay" src={state.diff.diffDataUrl}
                className="w-full rounded-lg" style={{ border: "1px solid var(--border)" }} />
            </figure>
          </div>
          <div className="px-4 pb-4">
            <button onClick={() => reset()} className="text-[12px] px-3 py-2 rounded-lg border"
              style={{ borderColor: "var(--border)", color: "var(--text3)" }}>Clear</button>
          </div>
        </div>
      )}
    </div>
  );
}
