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
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { have, mux, narrate, voiceTrack } from "./demo-audio.mjs";
import { runAction } from "./demo-actions.mjs";
import { CARD_MS, cardScript, closingCard, liftCard } from "./demo-cards.mjs";
import { OVERLAY, place, watchBackend } from "./demo-overlay.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEMOS = path.join(ROOT, "src/data/demos");
const OUT = path.join(ROOT, "public/demos");
const BASE = process.env.DEMO_BASE_URL ?? "http://localhost:3000";
// Where the closing card sends people — the live site, never the local
// server the clip happened to be recorded against.
const SITE = "ml-portfolio-rho.vercel.app";
// Wide enough that a tool with a document viewer AND a chat column can show
// both. At 1280 the Multimodal RAG citation panel pushed the answer off-frame.
const SIZE = { width: 1600, height: 1000 };

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

const FIX =
  `start ML-Unified on :8000, or rebuild against the Space:\n` +
  `  NEXT_PUBLIC_ML_UNIFIED_URL=https://wram1708-ml-unified.hf.space npm run build && npm start`;

/** Real, visible Chrome, not the bundled headless Chromium: headless renders
 *  WebGL as a blank canvas on this machine, so every 3D tool filmed as an
 *  empty white box. `channel: "chrome"` uses the installed browser and
 *  `headless: false` gives it a real GPU context. The window is visible while
 *  recording — that is the cost. DEMO_HEADLESS=1 restores the old behaviour. */
const LAUNCH = process.env.DEMO_HEADLESS
  ? {}
  : { channel: "chrome", headless: false };

/** Load the page once before committing to anything expensive. Narration is
 *  a `say` call and an ffmpeg convert per step, all of it spent before the
 *  browser ever opens — finding out afterwards that the backend was down the
 *  whole time is minutes wasted on a clip that was never going to work.
 *
 *  This only sees calls the page makes on load. Everything later is covered
 *  by the same listeners running during the recording itself. */
async function preflight(demo, chromium) {
  const browser = await chromium.launch(LAUNCH);
  const ctx = await browser.newContext({ viewport: SIZE });
  const page = await ctx.newPage();
  const failed = watchBackend(page, BASE);
  try {
    await page.goto(BASE + demo.route, { waitUntil: "networkidle", timeout: 60000 });
  } catch (err) {
    await browser.close();
    throw new Error(`${demo.route} would not load from ${BASE}: ${err.message.split("\n")[0]}`);
  }
  await browser.close();
  if (failed.length)
    throw new Error(`backend unreachable, before recording started:\n  ${failed.join("\n  ")}\n${FIX}`);
}

async function record(demo, chromium) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), `demo-${demo.toolId}-`));
  console.log(`\n${demo.toolId}: narrating ${demo.steps.length} steps…`);
  const lines = narrate(demo.steps, tmp);

  const browser = await chromium.launch(LAUNCH);
  const ctx = await browser.newContext({
    viewport: SIZE,
    recordVideo: { dir: tmp, size: SIZE },
    reducedMotion: "no-preference",
  });
  // Capture starts the moment the context exists, so this is the clock the
  // narration has to be lined up against — not the moment the page loaded.
  const capturedFrom = Date.now();
  // The title card, painted before the page's own scripts run so it is
  // already there in the first captured frame.
  await ctx.addInitScript(cardScript(demo));
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
  const failed = watchBackend(page, BASE);
  await page.goto(BASE + demo.route, { waitUntil: "networkidle" });
  await page.evaluate(OVERLAY);

  // Hold the card for its full time counted from the first frame, not from
  // now: a slow page load has already spent some of it behind the card.
  await page.waitForTimeout(Math.max(0, CARD_MS - (Date.now() - capturedFrom)));
  await liftCard(page);
  // Everything before this point is the card. The narration is laid down
  // after it, which is what keeps the words under the picture they describe.
  const leadMs = Date.now() - capturedFrom;

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
        cap.style.display = "block";
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

    // The scroll above is smooth, so the rect it measured was taken while the
    // page was still moving. Let it land, then measure again.
    if (s.at) {
      await page.waitForTimeout(600);
      await place(page, s.at, s.with);
    }

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

    // Let the narration get to the point before doing the thing it describes.
    // The action used to fire the instant the step began, so the upload had
    // already happened before "uploading a single still photograph" had left
    // the speaker's mouth. A third of the way in is enough to have named it,
    // and the cap keeps a long sentence from stalling the tool for ten
    // seconds; `actAfter` overrides both when a step needs its own timing.
    const cue = s.actAfter ?? Math.min(lines[i].seconds * 350, 2500);
    await page.waitForTimeout(Math.max(0, cue - (Date.now() - began)));

    await runAction(page, s, { must, root: ROOT });

    if (s.waitFor) {
      await page.waitForSelector(`[data-wt="${s.waitFor}"]`, { timeout: s.waitMs ?? 120000 })
        .catch(async () => {
          // waitForSelector wants the element *visible*. An anchor on a wrapper
          // whose child unmounts is present in the DOM at zero size, which
          // looks identical to "never appeared" unless you say so.
          const attached = await page.locator(`[data-wt="${s.waitFor}"]`).count();
          console.log(attached
            ? `     (gave up on ${s.waitFor}: in the DOM but never visible — the anchor is probably an empty wrapper)`
            : `     (gave up waiting for ${s.waitFor}: never appeared)`);
        });
      // The page has changed underneath the spotlight; put it back where the
      // step asked for, now that the element it named may finally exist.
      if (s.at) await place(page, s.at, s.with);
    }

    // An action can also move things: a click that reveals a panel pushes
    // everything below it down, out from under the spotlight.
    //
    // Twice, though, 700ms apart. One measurement taken the instant the action
    // returns is taken too early on both counts: the step's own scrollIntoView
    // is smooth and may still be in flight, and a click that flips state
    // re-renders on the *next* frame — Pipeline Cinema's Run button becomes
    // "Running…" and narrows, and gains a Pause and a Stop beside it. Measured
    // once, the ring settled 90px below a button that had also moved sideways,
    // and sat there ringing empty space for the rest of the step.
    if (s.at && s.act && s.act !== "none") {
      await place(page, s.at, s.with);
      await page.waitForTimeout(700);
      await place(page, s.at, s.with);
    }

    // The clip is paced by the narration, exactly as the live player is —
    // but the narration has been playing since the step began, over whatever
    // the step was doing. Waiting its full length *after* the action counts
    // that time twice, and a long action left the step sitting silent on a
    // static frame for the difference. The last step of Depth Parallax has a
    // three-second drag in it and ended on eight seconds of dead air.
    const narrationLeft = lines[i].seconds * 1000 - (Date.now() - began);
    await page.waitForTimeout(Math.max(0, narrationLeft) + (s.settle ?? 800));
    // Assert the world is as the narration is about to claim. A tool that
    // failed its own network call leaves the page looking plausible and the
    // clip sounding confident; this is the only thing that catches it.
    // Before the assertion, not after: a backend that could not answer is the
    // cause and the missing text is the symptom. Reporting the symptom sends
    // you reading the demo script, which is not where the problem is.
    if (failed.length)
      throw new Error(`step ${i + 1}: a backend call failed —\n  ${failed.join("\n  ")}\n${FIX}`);

    if (s.expect) {
      // Everything except the overlay. The caption is a child of body, so a
      // plain body.innerText lets a step satisfy its own assertion with its
      // own narration — an assertion that can be met by the claim it is
      // supposed to be checking is worse than no assertion at all.
      //
      // The trade-off: a step that TYPES a value and then asserts that same
      // value now satisfies itself, the same way a step could once satisfy
      // itself with its own caption. No demo does that today (checked), and
      // the point of an assertion on a typed step is the tool's response to
      // the text, not the text.
      //
      // innerText alone cannot see the contents of a textarea or an input:
      // those live in .value, not in the DOM's text. A step that loads a
      // sample into a textarea and then narrates what the sample says was
      // unassertable until this line existed — the guard failed a claim that
      // was in fact true and on screen.
      const seen = await page.evaluate(() => {
        const roots = Array.from(document.body.children)
          .filter((el) => el.id !== "__demo_cap" && el.id !== "__demo_spot");
        const text = roots.map((el) => el.innerText);
        for (const root of roots)
          for (const f of root.querySelectorAll("input, textarea"))
            if (f.value) text.push(f.value);
        return text.join("\n");
      });
      // Case-insensitively: innerText is the *rendered* text, so a label
      // styled `text-transform: uppercase` comes back shouting even though
      // the source spells it normally. Nothing in the JSX tells you that.
      if (!seen.toLowerCase().includes(s.expect.toLowerCase())) {
        throw new Error(
          `step ${i + 1} expected "${s.expect}" on screen and it is not there — ` +
          `the recording would narrate something that did not happen`
        );
      }
    }
    spent.push(Date.now() - began);
  }

  // A clip used to stop rather than end. The card gives it a last beat and
  // somewhere to send the viewer; the audio track is padded to match so the
  // mux's -shortest does not cut it straight back off.
  const closedAt = Date.now();
  await closingCard(page, { title: demo.title, route: SITE + demo.route });
  const tailMs = Date.now() - closedAt;

  await ctx.close();
  await browser.close();

  const raw = fs.readdirSync(tmp).find((f) => f.endsWith(".webm"));
  if (!raw) throw new Error("playwright produced no video");

  fs.mkdirSync(OUT, { recursive: true });
  const out = path.join(OUT, `${demo.toolId}.webm`);
  mux(path.join(tmp, raw), voiceTrack(lines, spent, tmp, leadMs, tailMs), out);

  // What the player needs to narrate this clip in the viewer's own voice:
  // when each step begins. Measured here rather than inferred later.
  //
  // Counted from the start of the *video*, which means starting at the lead —
  // the title card and page load happen before step 1. DemoVoice compares
  // these against video.currentTime, so leaving the lead out made every line
  // speak several seconds early.
  let at = leadMs;
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
for (const d of wanted) {
  await preflight(d, chromium);
  await record(d, chromium);
}
