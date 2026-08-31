"use client";

import { useEffect, useRef, useState } from "react";
import { usableVoices } from "@/lib/speech";
import { getPresenter } from "@/lib/presenter";

/** "" means the voice baked into the clip's own audio track. */
export const AS_RECORDED = "";

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
  label = "Voice",
}: {
  value: string;
  onChange: (voiceURI: string) => void;
  label?: string;
}) {
  const voices = useVoices();
  const presenter = getPresenter();
  // Only offered when it is actually configured — an option that cannot work
  // is worse than no option. See src/lib/presenter/avatar.ts.
  const avatarReady = presenter.id === "avatar";

  if (!voices.length) return null;

  return (
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
      {avatarReady && <option value="__avatar">Presenter</option>}
    </select>
  );
}

/**
 * Speaks a clip's lines as it plays.
 *
 * Driven off the video's own currentTime rather than a timer, so scrubbing,
 * pausing and buffering all stay in step — a timer started at play() drifts
 * the moment the viewer touches the scrub bar.
 */
export function useClipNarration(
  video: HTMLVideoElement | null,
  timings: { start: number; say: string }[] | null,
  voiceURI: string
) {
  const spoken = useRef(-1);

  useEffect(() => {
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
    presenter.setVoice?.(voiceURI);

    const onTime = () => {
      // The last line whose cue has passed — not "the next one", so a viewer
      // who scrubs into the middle hears the line that belongs there.
      let due = -1;
      for (let i = 0; i < timings.length; i++) {
        if (video.currentTime >= timings[i].start) due = i;
      }
      if (due >= 0 && due !== spoken.current) {
        spoken.current = due;
        presenter.stop();
        presenter.speak(timings[due].say);
      }
    };
    const onSeek = () => {
      spoken.current = -1;
      presenter.stop();
    };
    const quiet = () => presenter.stop();

    video.addEventListener("timeupdate", onTime);
    video.addEventListener("seeking", onSeek);
    video.addEventListener("pause", quiet);
    video.addEventListener("ended", quiet);
    return () => {
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("seeking", onSeek);
      video.removeEventListener("pause", quiet);
      video.removeEventListener("ended", quiet);
      presenter.stop();
    };
  }, [video, timings, voiceURI]);
}
