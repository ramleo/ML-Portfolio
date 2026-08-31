#!/usr/bin/env node
/**
 * Records a guided demo as a video clip.
 *
 * The same JSON the browser plays live (src/data/demos/*.json) is replayed
 * here by Playwright against a real running copy of the site, screen-recorded,
 * and given a narration track. One script, two players — a clip can never
 * describe a tool differently from the live walkthrough.
 *
 * This is an authoring tool, run by hand when a tool's UI changes. It is
 * deliberately NOT a dependency of the site: Playwright's browsers are
 * hundreds of megabytes and Vercel would install them on every deploy.
 *
 *   npm i -D playwright && npx playwright install chromium   # one-off
 *   npm run build && npm start                               # in another shell
 *   node scripts/record-demo.mjs automl
 *   node scripts/record-demo.mjs --all
 *
 * Narration uses macOS `say`, and ffmpeg muxes it onto the video. Both are
 * checked for up front rather than failing halfway through a recording.
 */
import { execFileSync, execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEMOS = path.join(ROOT, "src/data/demos");
const OUT = path.join(ROOT, "public/demos");
const BASE = process.env.DEMO_BASE_URL ?? "http://localhost:3000";
const VOICE = process.env.DEMO_VOICE ?? "Samantha";
// Wide enough that a tool with a document viewer AND a chat column can show
// both. At 1280 the Multimodal RAG citation panel pushed the answer off-frame.
const SIZE = { width: 1600, height: 1000 };

function have(cmd) {
  try {
    execSync(`command -v ${cmd}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

async function loadPlaywright() {
  try {
    return (await import("playwright")).chromium;
  } catch {
    console.error(
      "playwright is not installed. It is intentionally not in package.json —\n" +
        "install it just for recording:  npm i -D playwright && npx playwright install chromium"
    );
    process.exit(1);
  }
}

/** One narration file per step, so the video can be cut to the real length of
 *  each line rather than a guess. Returns [{ file, seconds }]. */
function narrate(steps, dir) {
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

/** Draw the spotlight and caption into the page itself. The live player paints
 *  them over the iframe from outside; here there is no outside, so the same
 *  two elements are injected into the page being recorded. */
const OVERLAY = `(() => {
  const spot = document.createElement("div");
  spot.id = "__demo_spot";
  Object.assign(spot.style, {
    position: "fixed", zIndex: 2147483646, borderRadius: "10px", display: "none",
    border: "2px solid #7da5ff", pointerEvents: "none",
    boxShadow: "0 0 0 9999px rgba(6,8,14,.55), 0 0 22px rgba(120,160,255,.55)",
    transition: "all .35s ease",
  });
  const cap = document.createElement("div");
  cap.id = "__demo_cap";
  Object.assign(cap.style, {
    position: "fixed", zIndex: 2147483647, left: "50%", transform: "translateX(-50%)",
    bottom: "24px", maxWidth: "780px", padding: "14px 18px", borderRadius: "12px",
    background: "rgba(12,15,24,.93)", color: "#eef2ff", font: "500 15px/1.55 system-ui",
    border: "1px solid rgba(255,255,255,.14)", boxShadow: "0 12px 34px rgba(0,0,0,.5)",
  });
  document.body.append(spot, cap);
})()`;

async function record(demo, chromium) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), `demo-${demo.toolId}-`));
  console.log(`\n${demo.toolId}: narrating ${demo.steps.length} steps…`);
  const lines = narrate(demo.steps, tmp);

  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: SIZE,
    recordVideo: { dir: tmp, size: SIZE },
    reducedMotion: "no-preference",
  });
  // Before any of the page's own scripts run, so a first-visit tour never
  // gets the chance to decide it should appear.
  if (demo.suppress?.length) {
    await ctx.addInitScript((keys) => {
      for (const k of keys) {
        try { window.localStorage.setItem(k, "1"); } catch { /* ignore */ }
      }
    }, demo.suppress);
  }
  const page = await ctx.newPage();
  await page.goto(BASE + demo.route, { waitUntil: "networkidle" });
  await page.evaluate(OVERLAY);

  // How long each step really occupied the screen. A step that waits for the
  // tool can run far past its narration, and the audio track has to be padded
  // to what actually happened — pad it to narration+settle and every later
  // line drifts ahead of the picture it describes.
  const spent = [];

  for (const [i, s] of demo.steps.entries()) {
    const began = Date.now();
    console.log(`  ${i + 1}/${demo.steps.length} ${s.say.slice(0, 58)}…`);
    await page.evaluate(
      ([at, say, n, total]) => {
        const cap = document.getElementById("__demo_cap");
        const spot = document.getElementById("__demo_spot");
        cap.innerHTML =
          `<div style="font:700 11px/1 ui-monospace;letter-spacing:.14em;` +
          `text-transform:uppercase;color:#9fb2d8;margin-bottom:6px">Step ${n} of ${total}</div>` +
          say;
        const el = at ? document.querySelector(`[data-wt="${at}"]`) : null;
        if (!el) {
          spot.style.display = "none";
          return;
        }
        el.scrollIntoView({ block: "center", behavior: "smooth" });
        const r = el.getBoundingClientRect();
        Object.assign(spot.style, {
          display: "block",
          top: r.top - 6 + "px", left: r.left - 6 + "px",
          width: r.width + 12 + "px", height: r.height + 12 + "px",
        });
      },
      [s.at ?? null, s.say, i + 1, demo.steps.length]
    );

    // A failed action used to be swallowed, which is how narration describing
    // something that never happened reached a finished clip — twice. An action
    // that cannot be carried out is a broken demo, so it is loud and it stops
    // the recording rather than producing a confident lie.
    const must = async (what, fn) => {
      try {
        await fn();
      } catch (err) {
        throw new Error(`step ${i + 1} could not ${what}: ${err.message.split("\n")[0]}`);
      }
    };

    if (s.act === "click" && s.at)
      await must(`click [data-wt="${s.at}"]`, () => page.click(`[data-wt="${s.at}"]`, { timeout: 15000 }));

    if (s.act === "type" && s.at && s.value)
      // The anchor may be the field itself or a wrapper around it — Text-to-SQL
      // marks the wrapper, Multimodal RAG marks the textarea. Accept both.
      await must(`type into [data-wt="${s.at}"]`, () =>
        page
          .locator(
            `[data-wt="${s.at}"]:is(input,textarea), ` +
            `[data-wt="${s.at}"] input, [data-wt="${s.at}"] textarea`
          )
          .first()
          // keystroke by keystroke, not fill(): the viewer should see it typed
          .pressSequentially(s.value, { delay: 25, timeout: 20000 })
      );

    if (s.act === "file" && s.file)
      await must(`upload ${s.file}`, () =>
        page.locator("input[type=file]").first()
          .setInputFiles(path.join(ROOT, "public", s.file.replace(/^\//, "")), { timeout: 15000 })
      );

    if (s.waitFor) {
      await page.waitForSelector(`[data-wt="${s.waitFor}"]`, { timeout: s.waitMs ?? 120000 })
        .catch(() => console.log(`     (gave up waiting for ${s.waitFor})`));
      // The page has changed underneath the spotlight; put it back where the
      // step asked for, now that the element it named may finally exist.
      if (s.at) {
        await page.evaluate((at) => {
          const spot = document.getElementById("__demo_spot");
          const el = document.querySelector(`[data-wt="${at}"]`);
          if (!el || !spot) return;
          const r = el.getBoundingClientRect();
          Object.assign(spot.style, {
            display: "block", top: r.top - 6 + "px", left: r.left - 6 + "px",
            width: r.width + 12 + "px", height: r.height + 12 + "px",
          });
        }, s.at).catch(() => {});
      }
    }

    // The clip is paced by the narration, exactly as the live player is.
    await page.waitForTimeout(lines[i].seconds * 1000 + (s.settle ?? 800));
    // Assert the world is as the narration is about to claim. A tool that
    // failed its own network call leaves the page looking plausible and the
    // clip sounding confident; this is the only thing that catches it.
    if (s.expect) {
      // Everything except the overlay. The caption is a child of body, so a
      // plain body.innerText lets a step satisfy its own assertion with its
      // own narration — an assertion that can be met by the claim it is
      // supposed to be checking is worse than no assertion at all.
      const seen = await page.evaluate(() =>
        Array.from(document.body.children)
          .filter((el) => el.id !== "__demo_cap" && el.id !== "__demo_spot")
          .map((el) => el.innerText)
          .join("\n")
      );
      if (!seen.includes(s.expect)) {
        throw new Error(
          `step ${i + 1} expected "${s.expect}" on screen and it is not there — ` +
          `the recording would narrate something that did not happen`
        );
      }
    }
    spent.push(Date.now() - began);
  }

  await ctx.close();
  await browser.close();

  const raw = fs.readdirSync(tmp).find((f) => f.endsWith(".webm"));
  if (!raw) throw new Error("playwright produced no video");

  // One narration track: the lines back to back, each padded out to the time
  // the video actually spent on that step.
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
  const voiceTrack = path.join(tmp, "voice.wav");
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0",
    "-i", listFile, "-c", "copy", voiceTrack]);

  fs.mkdirSync(OUT, { recursive: true });
  const out = path.join(OUT, `${demo.toolId}.webm`);
  execFileSync("ffmpeg", ["-y", "-loglevel", "error",
    "-i", path.join(tmp, raw), "-i", voiceTrack,
    "-c:v", "copy", "-c:a", "libopus", "-b:a", "96k", "-shortest", out]);

  // What the player needs to narrate this clip in the viewer's own voice:
  // when each step begins. Measured here rather than inferred later.
  let at = 0;
  const timings = demo.steps.map((s, i) => {
    const start = Number((at / 1000).toFixed(2));
    at += spent[i] ?? 0;
    return { start, say: s.say };
  });
  fs.writeFileSync(path.join(OUT, `${demo.toolId}.timings.json`),
    JSON.stringify(timings, null, 2) + "\n");

  fs.rmSync(tmp, { recursive: true, force: true });
  const mb = (fs.statSync(out).size / 1e6).toFixed(1);
  console.log(`  → public/demos/${demo.toolId}.webm  (${mb} MB)`);
}

const args = process.argv.slice(2);
if (!args.length) {
  console.error("usage: node scripts/record-demo.mjs <toolId | --all>");
  process.exit(1);
}
for (const cmd of ["say", "ffmpeg", "ffprobe"]) {
  if (!have(cmd)) {
    console.error(`missing '${cmd}'. say is macOS-only; ffmpeg/ffprobe: brew install ffmpeg`);
    process.exit(1);
  }
}
const all = fs.readdirSync(DEMOS).filter((f) => f.endsWith(".json"))
  .map((f) => JSON.parse(fs.readFileSync(path.join(DEMOS, f), "utf8")));
const wanted = args.includes("--all") ? all : all.filter((d) => args.includes(d.toolId));
if (!wanted.length) {
  console.error(`no demo matched. have: ${all.map((d) => d.toolId).join(", ")}`);
  process.exit(1);
}
const chromium = await loadPlaywright();
for (const d of wanted) await record(d, chromium);
