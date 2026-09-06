"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Demo, DemoStep } from "@/data/demos";
import { performStep } from "./demoActions";
import { getPresenter } from "@/lib/presenter";
import DemoVoice, { AS_RECORDED, isOwnKey, useClipNarration } from "./DemoVoice";
import { track } from "@/hooks/useAnalytics";
import { EV } from "@/lib/logEvents";

/** How long to let the narration run before carrying out the step's action:
 *  a third of the way in, capped. The recorder computes this from the real
 *  length of the rendered speech; out here the browser will not say in
 *  advance how long it intends to take, so it is estimated from the word
 *  count at roughly 165 words a minute. Only the cue is estimated — the step
 *  still lasts exactly as long as the speech actually does. */
const cueMs = (say: string) =>
  Math.min((say.trim().split(/\s+/).length / 165) * 60 * 1000 * 0.35, 2500);


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
  const [ownKey, setOwnKeyValue] = useState("");
  // A paid narrator that has no key yet cannot narrate anything, so the clip
  // keeps its own audio until one is entered rather than going silent.
  const narrating = voiceURI !== AS_RECORDED && !(isOwnKey(voiceURI) && !ownKey);
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
  const locate = useCallback((anchor?: string, also?: string): Box | null => {
    if (!anchor) return null;
    const d = doc();
    const f = frame.current;
    const s = stage.current;
    if (!d || !f || !s) return null;
    const el = d.querySelector(`[data-wt="${anchor}"]`) as HTMLElement | null;
    if (!el) return null;
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    // `also` widens the box to enclose a second anchor. A step that drives a
    // slider is about what the slider does to the picture, and everything
    // outside the box is dimmed — so ringing the control alone darkened the
    // one thing the narration was telling you to watch.
    const other = also ? (d.querySelector(`[data-wt="${also}"]`) as HTMLElement | null) : null;
    const rs = [el, other].filter(Boolean).map((n) => n!.getBoundingClientRect());
    const top = Math.min(...rs.map((b) => b.top));
    const left = Math.min(...rs.map((b) => b.left));
    const fr = f.getBoundingClientRect();
    const sr = s.getBoundingClientRect();
    return {
      top: fr.top - sr.top + top - 6,
      left: fr.left - sr.left + left - 6,
      width: Math.max(...rs.map((b) => b.right)) - left + 12,
      height: Math.max(...rs.map((b) => b.bottom)) - top + 12,
    };
  }, []);

  /** Carry out whatever the step asks of the page. Everything here happens
   *  inside the iframe's own document, using its own File and DataTransfer
   *  constructors — an object built from this window's constructors fails the
   *  other document's instanceof checks and React's onChange never fires. */
  const perform = useCallback(async (s: DemoStep) => {
    const d = doc();
    // Typed as the iframe's own global, not merely a Window: the constructors
    // performStep uses have to come from that document or React's checks
    // reject them.
    const w = frame.current?.contentWindow as (Window & typeof globalThis) | null | undefined;
    if (!d || !w) return;
    await performStep(s, d, w);
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
      setBox(locate(s.at, s.with));
      // The narration sets the pace: a step lasts exactly as long as its line
      // takes to say, plus whatever the tool needs to catch up.
      //
      // Started before the action, not after it. This used to perform the
      // step and only then begin speaking, so every upload, click and drag
      // happened in silence before a word describing it was said. Now the
      // line runs underneath, and the action lands once the sentence has had
      // time to name it — see `cueMs`.
      if (voiceURI !== AS_RECORDED) presenter.current.setVoice?.(voiceURI);
      // Swallowed, not left to float: the loop can break out on an abort
      // between starting this and awaiting it, and a speak() that rejects on
      // that same abort would surface as an unhandled rejection. The signal
      // checks are what actually stop the run.
      const speaking = presenter.current.speak(s.say, ctrl.signal).catch(() => {});
      await new Promise((r) => setTimeout(r, s.actAfter ?? cueMs(s.say)));
      if (ctrl.signal.aborted) break;
      await perform(s);
      if (ctrl.signal.aborted) break;
      if (s.waitFor) {
        await waitForAnchor(s.waitFor, s.waitMs ?? 120000, ctrl.signal);
        setBox(locate(s.at, s.with));
      }
      if (ctrl.signal.aborted) break;
      await speaking;
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

  useClipNarration(video, timings, narrating ? voiceURI : AS_RECORDED, ownKey);

  // §3 stage 3. 19 clips were re-recorded and there is currently no way to
  // know whether one person watches them or where they give up.
  //
  // "Abandon" is decided on unmount, not on pause: pausing to read a caption
  // is normal, and counting it as abandonment would make the number useless.
  // What matters is how far they got, so the abandon row carries the percent.
  useEffect(() => {
    if (!video) return;
    let started = false;
    let completed = false;

    const onPlay = () => {
      if (started) return;            // resuming after a pause is not a new start
      started = true;
      track(EV.DEMO_START, { meta: { tool: demo.toolId, mode: "clip" } });
    };
    const onEnded = () => {
      completed = true;
      track(EV.DEMO_COMPLETE, { duration_ms: Math.round(video.duration * 1000),
        meta: { tool: demo.toolId, mode: "clip" } });
    };
    video.addEventListener("play", onPlay);
    video.addEventListener("ended", onEnded);
    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("ended", onEnded);
      if (started && !completed) {
        const pct = video.duration ? Math.round((video.currentTime / video.duration) * 100) : 0;
        track(EV.DEMO_ABANDON, { duration_ms: Math.round(video.currentTime * 1000),
          meta: { tool: demo.toolId, mode: "clip", percent: pct } });
      }
    };
  }, [video, demo.toolId]);

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
    const id = window.setInterval(() => setBox(locate(demo.steps[step]?.at, demo.steps[step]?.with)), 400);
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
          <DemoVoice value={voiceURI} onChange={setVoiceURI}
            ownKey={ownKey} onOwnKey={setOwnKeyValue} />

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
              muted={narrating}
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
          {mode === "clip" && narrating &&
            " The clip is muted and its lines are being read in the voice you picked."}
        </div>
      </div>
    </div>
  );
}
