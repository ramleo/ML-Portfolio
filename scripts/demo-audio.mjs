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
 *  spent on that step. `spent` is in milliseconds, measured by the recorder. */
export function voiceTrack(lines, spent, tmp) {
  const listFile = path.join(tmp, "audio.txt");
  const parts = [];
  for (const [i, l] of lines.entries()) {
    const pad = path.join(tmp, `pad-${i}.wav`);
    // whole_dur, not pad_dur: pad the line out to the measured length of the
    // step, so the narration stays under the picture it belongs to.
    const total = Math.max(l.seconds, (spent[i] ?? 0) / 1000);
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", l.file,
      "-af", `apad=whole_dur=${total.toFixed(2)}`, pad]);
    parts.push(`file '${pad}'`);
  }
  fs.writeFileSync(listFile, parts.join("\n"));
  const out = path.join(tmp, "voice.wav");
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0",
    "-i", listFile, "-c", "copy", out]);
  return out;
}

/** Video as-is plus the narration track. -shortest so a rounding difference
 *  between the two cannot leave a tail of silence on the end. */
export function mux(video, voice, out) {
  execFileSync("ffmpeg", ["-y", "-loglevel", "error",
    "-i", video, "-i", voice,
    "-c:v", "copy", "-c:a", "libopus", "-b:a", "96k", "-shortest", out]);
}
