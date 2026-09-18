/**
 * The sound half of scripts/record-demo.mjs: turning a demo's narration into
 * a track that lines up with the picture.
 *
 * Split out of the recorder purely for length. Nothing here knows what a
 * browser is — it takes text and step durations and returns audio files.
 *
 * Narration is macOS `say`; ffmpeg does the rest.
 */
import { execFileSync, execSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";

const VOICE = process.env.DEMO_VOICE ?? "Samantha";

export function have(cmd) {
  try {
    execSync(`command -v ${cmd}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/** One narration file per step, so the video can be cut to the real length of
 *  each line rather than a guess. Returns [{ file, seconds }]. */
export function narrate(steps, dir) {
  return steps.map((s, i) => {
    const aiff = path.join(dir, `line-${i}.aiff`);
    const wav = path.join(dir, `line-${i}.wav`);
    const text = s.say
      .replace(/[—–]/g, ", ")
      .replace(/[·•]/g, ", ")
      .replace(/\s+/g, " ")
      .trim();
    execFileSync("say", ["-v", VOICE, "-o", aiff, text]);
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", aiff, "-ar", "44100", "-ac", "2", wav]);
    const probe = execFileSync("ffprobe", [
      "-v", "error", "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1", wav,
    ]).toString().trim();
    return { file: wav, seconds: Number(probe) || 3 };
  });
}

/** The lines back to back, each padded out to the time the video actually
 *  spent on that step. `spent` is in milliseconds, measured by the recorder.
 *
 *  `leadMs` is everything the video shows before the first step begins — the
 *  page load and the title card. Narration used to start at zero regardless,
 *  which put every caption about 1.3s behind the words describing it.
 *
 *  `tailMs` is the closing card. Without it the mux's -shortest, seeing the
 *  audio end first, would cut the card straight back off. */
export function voiceTrack(lines, spent, tmp, leadMs = 0, tailMs = 0) {
  const listFile = path.join(tmp, "audio.txt");
  const parts = [];
  if (leadMs > 0) {
    const lead = path.join(tmp, "lead.wav");
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "lavfi",
      "-i", `anullsrc=r=44100:cl=stereo:d=${(leadMs / 1000).toFixed(2)}`, lead]);
    parts.push(`file '${lead}'`);
  }
  for (const [i, l] of lines.entries()) {
    const pad = path.join(tmp, `pad-${i}.wav`);
    // whole_dur, not pad_dur: pad the line out to the measured length of the
    // step, so the narration stays under the picture it belongs to.
    const total = Math.max(l.seconds, (spent[i] ?? 0) / 1000);
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", l.file,
      "-af", `apad=whole_dur=${total.toFixed(2)}`, pad]);
    parts.push(`file '${pad}'`);
  }
  if (tailMs > 0) {
    const tail = path.join(tmp, "tail.wav");
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "lavfi",
      "-i", `anullsrc=r=44100:cl=stereo:d=${(tailMs / 1000).toFixed(2)}`, tail]);
    parts.push(`file '${tail}'`);
  }
  fs.writeFileSync(listFile, parts.join("\n"));
  const out = path.join(tmp, "voice.wav");
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0",
    "-i", listFile, "-c", "copy", out]);
  return out;
}

const secondsOf = (file) =>
  Number(execFileSync("ffprobe", [
    "-v", "error", "-show_entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1", file,
  ]).toString().trim()) || 0;

/** How long the picture eases up from and down to black at the two ends. The
 *  cards already dissolve between themselves and the page, but the *video* used
 *  to pop on at full brightness on frame one and stop dead on the last — an
 *  abrupt start and an abrupt end. The card background is #0b0e17, so fading
 *  the whole frame from and to black reads as one continuous open and close. */
const FADE_IN = 0.6;
const FADE_OUT = 0.9;

/** Video plus the narration track, opened and closed with a fade from/to black.
 *
 *  Copying the video was faster but left it unable to fade — a fade has to
 *  touch every frame, so the stream is re-encoded (VP9, visibly smaller than
 *  Playwright's VP8 for the same clip). The length is pinned to the shorter of
 *  picture and sound with `-t`, the same guard `-shortest` used to give, so a
 *  rounding gap can neither leave a tail of silence nor clip the closing card. */
export function mux(video, voice, out) {
  const dur = Math.min(secondsOf(video), secondsOf(voice));
  const outStart = Math.max(0, dur - FADE_OUT).toFixed(2);
  const vf = `fade=t=in:st=0:d=${FADE_IN},fade=t=out:st=${outStart}:d=${FADE_OUT}`;
  const af = `afade=t=in:st=0:d=${FADE_IN},afade=t=out:st=${outStart}:d=${FADE_OUT}`;
  execFileSync("ffmpeg", ["-y", "-loglevel", "error",
    "-i", video, "-i", voice,
    "-vf", vf, "-af", af, "-t", dur.toFixed(2),
    "-c:v", "libvpx-vp9", "-crf", "33", "-b:v", "0",
    "-cpu-used", "5", "-row-mt", "1", "-deadline", "good",
    "-c:a", "libopus", "-b:a", "96k", out]);
}
