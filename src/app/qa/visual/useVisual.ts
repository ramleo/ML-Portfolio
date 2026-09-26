import { useCallback, useRef, useState } from "react";
import { qaPost, qaGet } from "../lib/qaClient";
import { getBaseline, saveBaseline, deleteBaseline } from "./visualStore";
import { diffImages, type DiffResult } from "./visualDiff";

const TOOL_ID = "qa-visual";
const POLL_MS = 4000;
const MAX_POLLS = 90; // ~6 min ceiling (dispatch + queue + capture)

export type VisualPhase = "idle" | "capturing" | "diffing" | "done" | "error";
export type CaptureMode = "baseline" | "compare";

export type VisualState = {
  phase: VisualPhase;
  mode: CaptureMode | null;
  shot: string | null;        // latest capture, base64 PNG
  hasBaseline: boolean;
  diff: DiffResult | null;
  savedBaseline: boolean;     // just stored a baseline
  error: string | null;
};

const IDLE: VisualState = {
  phase: "idle", mode: null, shot: null, hasBaseline: false,
  diff: null, savedBaseline: false, error: null,
};

// A minimal capture spec: freeze CSS animation/transition, settle, screenshot the
// viewport into test-results/ (which the runner always uploads). WebGL canvases
// can't be frozen this way — that's the documented limitation.
function captureSpec(url: string): string {
  const safe = url.replace(/'/g, "");
  return `import { test } from '@playwright/test';
test('visual capture', async ({ page }) => {
  await page.goto('${safe}', { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}html{scroll-behavior:auto!important}' });
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'test-results/visual.png', fullPage: false });
});
`;
}

function imageSize(base64: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve({ width: 0, height: 0 });
    img.src = `data:image/png;base64,${base64}`;
  });
}

export function useVisual() {
  const [state, setState] = useState<VisualState>(IDLE);
  const cancelled = useRef(false);

  const reset = useCallback(() => { cancelled.current = true; setState(IDLE); }, []);

  const refreshBaseline = useCallback(async (url: string) => {
    const b = await getBaseline(url.trim());
    setState((prev) => ({ ...prev, hasBaseline: !!b }));
  }, []);

  const clearBaseline = useCallback(async (url: string) => {
    await deleteBaseline(url.trim());
    setState((prev) => ({ ...prev, hasBaseline: false, diff: null, savedBaseline: false }));
  }, []);

  const capture = useCallback(async (url: string, mode: CaptureMode, threshold: number) => {
    const target = url.trim();
    if (!target) return;
    cancelled.current = false;
    setState({ ...IDLE, phase: "capturing", mode });

    // 1. dispatch the capture run
    let correlationId: string;
    try {
      const acc = await qaPost<{ correlation_id: string }>(
        "/qa/run/execute",
        { code: captureSpec(target), base_url: target, test_name: "visual capture" },
        { tool: TOOL_ID, meta: { mode } },
      );
      correlationId = acc?.correlation_id;
      if (!correlationId) throw new Error("The capture could not be started.");
    } catch (err) {
      setState({ ...IDLE, phase: "error", error: (err as Error).message || "Could not start the capture." });
      return;
    }

    // 2. poll until the run completes and hands back a screenshot
    for (let i = 0; i < MAX_POLLS; i++) {
      if (cancelled.current) return;
      await new Promise((r) => setTimeout(r, POLL_MS));
      if (cancelled.current) return;

      let s: { status: string; screenshot_base64?: string | null; detail?: string | null };
      try {
        s = await qaGet(`/qa/run/status/${correlationId}`);
      } catch {
        continue; // transient — keep polling
      }
      if (s.status === "error") {
        setState({ ...IDLE, phase: "error", error: s.detail || "The capture failed to run." });
        return;
      }
      if (s.status !== "completed") continue;

      const shot = s.screenshot_base64 || null;
      if (!shot) {
        setState({ ...IDLE, phase: "error", error: "The run finished but returned no screenshot." });
        return;
      }

      // 3a. baseline: store it and stop
      if (mode === "baseline") {
        const { width, height } = await imageSize(shot);
        await saveBaseline({ url: target, png: shot, width, height, savedAt: Date.now() });
        setState({ ...IDLE, phase: "done", mode, shot, hasBaseline: true, savedBaseline: true });
        return;
      }

      // 3b. compare: diff against the stored baseline
      setState((prev) => ({ ...prev, phase: "diffing", shot }));
      const base = await getBaseline(target);
      if (!base) {
        setState({ ...IDLE, phase: "error", shot, error: "No baseline saved for this URL yet — capture one first." });
        return;
      }
      try {
        const diff = await diffImages(base.png, shot, threshold);
        setState({ ...IDLE, phase: "done", mode, shot, hasBaseline: true, diff });
      } catch (err) {
        setState({ ...IDLE, phase: "error", shot, error: (err as Error).message || "Could not compare the images." });
      }
      return;
    }
    setState((prev) => ({ ...prev, phase: "error", error: "Timed out waiting for the capture to finish." }));
  }, []);

  return { state, capture, reset, refreshBaseline, clearBaseline };
}
