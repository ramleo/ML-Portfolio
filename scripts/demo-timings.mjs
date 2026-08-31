#!/usr/bin/env node
/**
 * Recovers per-step start times from an already-recorded clip.
 *
 * The player needs to know when each step begins so it can narrate the clip
 * in the viewer's own voice instead of the one baked into the audio track.
 * New recordings write this file directly (record-demo.mjs). This script
 * exists for the clips recorded before that, so they did not have to be made
 * again — re-recording Multimodal RAG costs a real document ingest.
 *
 * How: the narration track is the lines concatenated with silence padding
 * between them, so the end of each silence is the start of the next step.
 * Verified against the step count before anything is written — if the two
 * disagree the audio has an internal pause long enough to look like a gap,
 * and guessing would be worse than refusing.
 *
 *   node scripts/demo-timings.mjs            # all clips
 *   node scripts/demo-timings.mjs automl
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEMOS = path.join(ROOT, "src/data/demos");
const OUT = path.join(ROOT, "public/demos");
/** Long enough not to trip on a comma, short enough to catch every real gap. */
const MIN_GAP = 0.6;

function starts(clip) {
  // silencedetect reports on stderr, not stdout.
  const r = spawnSync("ffmpeg", [
    "-hide_banner", "-nostats", "-i", clip,
    "-af", `silencedetect=noise=-40dB:d=${MIN_GAP}`, "-f", "null", "-",
  ], { encoding: "utf8" });
  const log = (r.stderr ?? "") + (r.stdout ?? "");
  const ends = [...log.matchAll(/silence_end: ([\d.]+)/g)].map((m) => Number(m[1]));
  // The clip ends in silence, and ffmpeg closes that region at end-of-file —
  // which looks exactly like the start of one more line. Anything within a
  // second of the end is that artefact, not a step.
  const dur = Number(spawnSync("ffprobe", [
    "-v", "error", "-show_entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1", clip,
  ], { encoding: "utf8" }).stdout.trim());
  return [0, ...ends.filter((t) => t < dur - 1)];
}

const only = process.argv.slice(2);
let wrote = 0;

for (const f of fs.readdirSync(DEMOS).filter((n) => n.endsWith(".json"))) {
  const demo = JSON.parse(fs.readFileSync(path.join(DEMOS, f), "utf8"));
  if (only.length && !only.includes(demo.toolId)) continue;
  const clip = path.join(OUT, `${demo.toolId}.webm`);
  if (!fs.existsSync(clip)) {
    console.log(`${demo.toolId}: no clip, skipped`);
    continue;
  }
  const found = starts(clip);
  if (found.length !== demo.steps.length) {
    console.error(
      `${demo.toolId}: found ${found.length} speech starts for ${demo.steps.length} steps — ` +
      `refusing to guess. Re-record it so the timings are written directly.`
    );
    process.exitCode = 1;
    continue;
  }
  const out = path.join(OUT, `${demo.toolId}.timings.json`);
  fs.writeFileSync(out, JSON.stringify(
    demo.steps.map((s, i) => ({ start: Number(found[i].toFixed(2)), say: s.say })),
    null, 2
  ) + "\n");
  console.log(`${demo.toolId}: ${found.length} steps -> ${path.basename(out)}`);
  wrote++;
}
if (!wrote) process.exitCode = 1;
