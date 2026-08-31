"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Demo, DemoStep } from "@/data/demos";
import { getPresenter } from "@/lib/presenter";
import DemoVoice, { AS_RECORDED, useClipNarration } from "./DemoVoice";

/**
 * A guided demo: the real tool, running, with someone talking you through it.
 *
 * The tool is loaded in an iframe from this same origin, which is what makes
 * the whole thing possible — same origin means `contentDocument` is reachable,
 * so a step can measure a control, spotlight it, and genuinely click or fill
 * it. A cross-origin embed could only ever be a video of a demo.
 *
 * Nothing is faked and nothing is mocked. If a step types a question into the
 * text-to-SQL box, that box now contains that question and the reader can
 * press the button themselves. Every demo hands control over at the end rather
 * than running to a canned finish.
 *
 * Two things it deliberately will NOT do:
 *  - press anything that spends money. Steps stop short of the button that
 *    calls a paid model; the narration says so and the reader decides.
 *  - restyle the tool. The spotlight is drawn in this document, over the
 *    iframe, never injected into the page inside it.
 */

type Mode = "live" | "clip";
type Box = { top: number; left: number; width: number; height: number };

export default function HandbookDemo({ demo, onClose }: { demo: Demo; onClose: () => void }) {
  const [mode, setMode] = useState<Mode>("live");
  const [ready, setReady] = useState(false);
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState(-1);
  const [box, setBox] = useState<Box | null>(null);
  const [clipMissing, setClipMissing] = useState(false);
  const [voiceURI, setVoiceURI] = useState(AS_RECORDED);
  const [timings, setTimings] = useState<{ start: number; say: string }[] | null>(null);
  const [video, setVideo] = useState<HTMLVideoElement | null>(null);

  const frame = useRef<HTMLIFrameElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const avatarHost = useRef<HTMLDivElement>(null);
  const abort = useRef<AbortController | null>(null);
  const presenter = useRef(getPresenter());

  const doc = () => frame.current?.contentDocument ?? null;

  /** Where an anchor sits, in the coordinates of this document rather than the
   *  iframe's — the spotlight is drawn out here, so the iframe's own offset
   *  has to be added back in. */
  const locate = useCallback((anchor?: string): Box | null => {
    if (!anchor) return null;
    const d = doc();
    const f = frame.current;
    const s = stage.current;
    if (!d || !f || !s) return null;
    const el = d.querySelector(`[data-wt="${anchor}"]`) as HTMLElement | null;
    if (!el) return null;
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    const r = el.getBoundingClientRect();
    const fr = f.getBoundingClientRect();
    const sr = s.getBoundingClientRect();
    return {
      top: fr.top - sr.top + r.top - 6,
      left: fr.left - sr.left + r.left - 6,
      width: r.width + 12,
      height: r.height + 12,
    };
  }, []);

  /** Carry out whatever the step asks of the page. Everything here happens
   *  inside the iframe's own document, using its own File and DataTransfer
   *  constructors — an object built from this window's constructors fails the
   *  other document's instanceof checks and React's onChange never fires. */
  const perform = useCallback(async (s: DemoStep) => {
    const d = doc();
    // Typed as the iframe's own global, not merely a Window: the constructors
    // below have to come from that document or React's checks reject them.
    const w = frame.current?.contentWindow as (Window & typeof globalThis) | null | undefined;
    if (!d || !w || !s.act || s.act === "none") return;
    const el = s.at ? (d.querySelector(`[data-wt="${s.at}"]`) as HTMLElement | null) : null;

    if (s.act === "scroll") {
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }
    if (s.act === "click") {
      el?.click();
      return;
    }
    if (s.act === "type" && s.value) {
      const input = (el?.matches("input, textarea") ? el : el?.querySelector("input, textarea")) as
        | HTMLInputElement
        | HTMLTextAreaElement
        | null;
      if (!input) return;
      // React tracks the previous value on the node, so assigning .value
      // directly is swallowed. The native setter is the documented way past it.
      const proto = input instanceof w.HTMLTextAreaElement ? w.HTMLTextAreaElement : w.HTMLInputElement;
      const setter = Object.getOwnPropertyDescriptor(proto.prototype, "value")?.set;
      input.focus();
      for (let i = 1; i <= s.value.length; i++) {
        setter?.call(input, s.value.slice(0, i));
        input.dispatchEvent(new w.Event("input", { bubbles: true }));
        await new Promise((r) => setTimeout(r, 18));
      }
      return;
    }
    if (s.act === "file" && s.file) {
      const res = await fetch(s.file);
      const buf = await res.arrayBuffer();
      const name = s.file.split("/").pop() ?? "sample";
      const file = new w.File([buf], name, { type: "text/csv" });
      const dt = new w.DataTransfer();
      dt.items.add(file);
      const input = (el?.querySelector("input[type=file]") ??
        d.querySelector("input[type=file]")) as HTMLInputElement | null;
      if (!input) return;
      input.files = dt.files;
      input.dispatchEvent(new w.Event("change", { bubbles: true }));
    }
  }, []);

  /** Poll the tool's own document until the anchor turns up. Polling rather
   *  than a MutationObserver because the interesting change is often several
   *  React renders deep and a single observer callback would fire long before
   *  the element the step wants actually exists. */
  const waitForAnchor = useCallback(async (anchor: string, ms: number, signal: AbortSignal) => {
    const deadline = Date.now() + ms;
    while (Date.now() < deadline && !signal.aborted) {
      if (doc()?.querySelector(`[data-wt="${anchor}"]`)) return true;
      await new Promise((r) => setTimeout(r, 400));
    }
    return false;
  }, []);

  const stop = useCallback(() => {
    abort.current?.abort();
    presenter.current.stop();
    setRunning(false);
    setStep(-1);
    setBox(null);
  }, []);

  const run = useCallback(async () => {
    const ctrl = new AbortController();
    abort.current?.abort();
    abort.current = ctrl;
    setRunning(true);
    for (let i = 0; i < demo.steps.length; i++) {
      if (ctrl.signal.aborted) break;
      const s = demo.steps[i];
      setStep(i);
      setBox(locate(s.at));
      await perform(s);
      if (ctrl.signal.aborted) break;
      if (s.waitFor) {
        await waitForAnchor(s.waitFor, s.waitMs ?? 120000, ctrl.signal);
        setBox(locate(s.at));
      }
      if (ctrl.signal.aborted) break;
      // The narration sets the pace: a step lasts exactly as long as its line
      // takes to say, plus whatever the tool needs to catch up.
      if (voiceURI !== AS_RECORDED) presenter.current.setVoice?.(voiceURI);
      await presenter.current.speak(s.say, ctrl.signal);
      if (ctrl.signal.aborted) break;
      await new Promise((r) => setTimeout(r, s.settle ?? 800));
    }
    if (!ctrl.signal.aborted) {
      setRunning(false);
      setBox(null);
    }
  }, [demo, locate, perform, waitForAnchor, voiceURI]);

  // Nothing outlives the panel: a demo left talking after the reader closed it
  // is the worst bug this component could have.
  useEffect(() => stop, [stop]);

  // Set before the iframe is rendered, not after it loads: the tool reads
  // these on mount, and an iframe that has already mounted has already
  // decided to show its tour. Same origin, so this is the same store.
  useEffect(() => {
    for (const key of demo.suppress ?? []) {
      try {
        window.localStorage.setItem(key, "1");
      } catch {
        // private browsing; the tool's own tour will show, which is survivable
      }
    }
  }, [demo]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Only fetched when the reader actually opens the recorded tab: most never
  // will, and it is a request they should not pay for.
  useEffect(() => {
    if (mode !== "clip" || timings) return;
    let live = true;
    fetch(`/demos/${demo.toolId}.timings.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((t) => {
        if (live) setTimings(t);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [mode, demo.toolId, timings]);

  useClipNarration(video, timings, voiceURI);

  useEffect(() => {
    const host = avatarHost.current;
    const p = presenter.current;
    if (!host || !p.hasVisual) return;
    p.attach?.(host);
    return () => p.detach?.();
  }, []);

  // The spotlight is anchored to a live element, so it has to follow the page.
  useEffect(() => {
    if (step < 0) return;
    const id = window.setInterval(() => setBox(locate(demo.steps[step]?.at)), 400);
    return () => window.clearInterval(id);
  }, [step, demo, locate]);

  const current = step >= 0 ? demo.steps[step] : null;
  const clip = `/demos/${demo.toolId}.webm`;

  return (
    <div className="hb-demo-back" role="dialog" aria-modal="true" aria-label={`${demo.title} demo`}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="hb-demo-panel">
        <div className="hb-demo-bar">
          <span className="hb-demo-title">{demo.title}</span>
          <span className="hb-demo-sub">{demo.blurb}</span>

          <div className="hb-demo-spacer" />

          <button className="hb-demo-btn" aria-pressed={mode === "live"}
            onClick={() => { stop(); setMode("live"); }}>Live</button>
          <button className="hb-demo-btn" aria-pressed={mode === "clip"}
            onClick={() => { stop(); setMode("clip"); }}>Recorded</button>

          {mode === "live" && (
            <button className="hb-demo-btn" onClick={running ? stop : run} disabled={!ready}>
              {running ? "Stop" : step >= 0 ? "Replay" : "Start the walkthrough"}
            </button>
          )}
          <DemoVoice value={voiceURI} onChange={setVoiceURI} />

          <button className="hb-demo-btn" onClick={onClose} aria-label="Close the demo">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="hb-demo-stage" ref={stage}>
          {mode === "live" ? (
            <iframe ref={frame} className="hb-demo-frame" src={demo.route} title={`${demo.title} — live`}
              onLoad={() => setReady(true)} />
          ) : clipMissing ? (
            <div className="hb-demo-caption" style={{ position: "static", margin: "2rem auto", transform: "none" }}>
              No recording has been made for this chapter yet. Run
              {" "}<code>node scripts/record-demo.mjs {demo.toolId}</code>{" "}
              to make one — it drives the real tool and records what happens.
              The live walkthrough works either way.
            </div>
          ) : (
            <video ref={setVideo} className="hb-demo-video" src={clip} controls autoPlay
              // Muted exactly when something else is doing the narrating.
              muted={voiceURI !== AS_RECORDED}
              onError={() => setClipMissing(true)} />
          )}

          {mode === "live" && box && <div className="hb-demo-spot" style={box} />}
          <div ref={avatarHost} />

          {mode === "live" && current && (
            <div className="hb-demo-caption">
              <span className="hb-demo-step">Step {step + 1} of {demo.steps.length}</span>
              {current.say}
            </div>
          )}
        </div>

        <div className="hb-demo-note">
          This is the real tool, not a mock-up — anything the walkthrough fills in is really there,
          and you can take over at any point. Steps stop short of buttons that call a paid model.
          {mode === "clip" && voiceURI !== AS_RECORDED &&
            " The clip is muted and its lines are being read in the voice you picked."}
        </div>
      </div>
    </div>
  );
}
