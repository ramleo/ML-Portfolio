"use client";

import { useEffect, useRef, useState } from "react";
import { usableVoices } from "@/lib/speech";
import { getPresenter, hostedPresenter, setOwnKey } from "@/lib/presenter";
import DemoVoiceConfig, { loadConfig } from "./DemoVoiceConfig";

/** "" means the voice baked into the clip's own audio track. */
export const AS_RECORDED = "";

/** The one selection meaning "a provider I am paying for", whichever it is.
 *  Which provider, and how to call it, is configured separately — this is not
 *  a menu of vendors the project approves of. */
export const OWN_KEY = "byo";
export const isOwnKey = (v: string) => v === OWN_KEY;

/**
 * Choosing who narrates.
 *
 * A recorded clip carries one voice in its audio track and browsers cannot
 * switch between audio tracks of an HTML5 video, so "pick a voice" for a clip
 * can only mean: mute the track and say the lines again as it plays. That is
 * what selecting anything other than "As recorded" does — the clip ships with
 * a timings file saying when each line begins, and the browser speaks each one
 * on cue.
 *
 * The default stays "As recorded" deliberately. The baked track is a known
 * quantity; a viewer whose machine has only compact system voices would
 * otherwise be downgraded without asking for it.
 */
export function useVoices() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const load = () => setVoices(usableVoices());
    const t = window.setTimeout(load, 0);
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => {
      window.clearTimeout(t);
      window.speechSynthesis.removeEventListener("voiceschanged", load);
    };
  }, []);
  return voices;
}

export default function DemoVoice({
  value,
  onChange,
  ownKey,
  onOwnKey,
  label = "Voice",
}: {
  value: string;
  onChange: (voiceURI: string) => void;
  /** Lifted to the panel rather than held here: whether a clip should be
   *  muted depends on whether a usable narrator exists, and a key that lives
   *  only inside this control cannot answer that. */
  ownKey: string;
  onOwnKey: (key: string) => void;
  label?: string;
}) {
  const voices = useVoices();
  const key = ownKey;
  const setKey = onOwnKey;
  const [{ preset, config }, setProvider] = useState(() => loadConfig());
  // Only offered when this deployment has actually configured it — an option
  // that cannot work is worse than no option. See src/lib/presenter/avatar.ts.
  const avatarReady = getPresenter().id === "avatar";
  const wantsKey = isOwnKey(value);

  // The key lives here and nowhere else: not in storage, and never sent to
  // this site's backend. Same handling as the API-key fields in the tools.
  useEffect(() => {
    setOwnKey(wantsKey ? config : null, key);
  }, [wantsKey, config, key]);

  // The failure happens inside the presenter, during playback, with nothing
  // to re-render this control — so a wrong key would silently degrade to the
  // browser voice and never say why. Polled while a key is in play, and only
  // then; there is nothing to watch otherwise.
  const [problem, setProblem] = useState("");
  useEffect(() => {
    // Cleared on the same tick as the poll rather than synchronously here:
    // setting state in an effect body is a cascading render.
    const id = window.setInterval(
      () => setProblem(wantsKey && key ? hostedPresenter.problem : ""),
      1000
    );
    return () => window.clearInterval(id);
  }, [wantsKey, key]);

  return (
    <>
      <select
        className="hb-demo-select"
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value={AS_RECORDED}>As recorded</option>
        {voices.map((v) => (
          <option key={v.voiceURI} value={v.voiceURI}>
            {v.name}
          </option>
        ))}
        <option value={OWN_KEY}>Your own provider…</option>
        {avatarReady && <option value="__avatar">Presenter</option>}
      </select>

      {wantsKey && (
        <>
          <DemoVoiceConfig
            preset={preset}
            config={config}
            onChange={(p, c) => setProvider({ preset: p, config: c })}
          />
          <input
            type="password"
            className="hb-demo-key"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="API key"
            aria-label="Your API key — stays in this browser, never sent to this site"
            autoComplete="off"
            spellCheck={false}
          />
        </>
      )}
      {problem && <span className="hb-demo-warn">key rejected: {problem}</span>}
    </>
  );
}

/**
 * Speaks a clip's lines as it plays.
 *
 * Driven off the video's own currentTime rather than a timer, so scrubbing,
 * pausing and buffering all stay in step — a timer started at play() drifts
 * the moment the viewer touches the scrub bar.
 *
 * The narrator is told the clip's playbackRate for the same reason. Cues are
 * frames, so they arrive twice as fast at 2x, but speech runs on wall-clock
 * time and does not — measured on a 125s clip, 8 of 10 lines were cut off
 * mid-sentence at 2x against 1 of 6 at normal speed. A speed picked up
 * mid-line applies from the next line: an utterance already being spoken
 * cannot change rate, and restarting it would replay words just heard.
 */
export function useClipNarration(
  video: HTMLVideoElement | null,
  timings: { start: number; say: string }[] | null,
  voiceURI: string,
  /** Only so the effect re-runs when a key is typed. The key itself is read
   *  through the presenter, never from here. */
  ownKey = ""
) {
  const spoken = useRef(-1);
  /** Whoever last spoke, so cleanup can silence the right one — the presenter
   *  can change between cues if the viewer edits the key mid-clip. */
  const active = useRef<ReturnType<typeof getPresenter> | null>(null);

  useEffect(() => {
    void ownKey;
    const presenter = getPresenter();
    if (!video) return;
    // "As recorded": the audio track does the talking. Whether the element is
    // muted is set declaratively on the element itself — React owns that
    // attribute, and reaching in to flip it here fights the renderer.
    if (voiceURI === AS_RECORDED || !timings?.length) {
      presenter.stop();
      spoken.current = -1;
      return;
    }
    const onTime = () => {
      // The last line whose cue has passed — not "the next one", so a viewer
      // who scrubs into the middle hears the line that belongs there.
      let due = -1;
      for (let i = 0; i < timings.length; i++) {
        if (video.currentTime >= timings[i].start) due = i;
      }
      if (due >= 0 && due !== spoken.current) {
        spoken.current = due;
        // Resolved per cue, not once: a key typed after the dropdown changed
        // must take effect on the very next line, and it used to be ignored
        // for the rest of the clip.
        const now = getPresenter();
        if (!isOwnKey(voiceURI)) now.setVoice?.(voiceURI);
        // The clip's speed, read at the moment the line starts rather than
        // held in state: the viewer changes it through the video element's
        // own controls, which React never sees.
        now.setRate?.(video.playbackRate);
        active.current?.stop();
        active.current = now;
        now.speak(timings[due].say).catch(() => {
          // A rejected key must not leave the clip silent. getPresenter() will
          // stop offering the hosted one once it has failed, so the next line
          // comes back in the browser voice on its own.
          const fallback = getPresenter();
          active.current = fallback;
          fallback.speak(timings[due].say).catch(() => undefined);
        });
      }
    };
    const onSeek = () => {
      spoken.current = -1;
      active.current?.stop();
    };
    const quiet = () => active.current?.stop();

    video.addEventListener("timeupdate", onTime);
    video.addEventListener("seeking", onSeek);
    video.addEventListener("pause", quiet);
    video.addEventListener("ended", quiet);
    return () => {
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("seeking", onSeek);
      video.removeEventListener("pause", quiet);
      video.removeEventListener("ended", quiet);
      active.current?.stop();
      presenter.stop();
    };
  }, [video, timings, voiceURI, ownKey]);
}
