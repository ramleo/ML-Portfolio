/** Everything a demo step can DO to the page.
 *
 *  Split out of record-demo.mjs when the two motion actions were added: the
 *  recorder was at 395 lines against a 400-line limit, and the act list is the
 *  part that grows every time a tool needs a new kind of input.
 *
 *  Every action goes through `must`, so a step that cannot be carried out
 *  stops the recording instead of narrating something that never happened. */

import path from "node:path";

/** Where inside an element to aim, as fractions of its box. Left-to-right
 *  through the middle is the default sweep: it reads as "looking around" and
 *  it crosses the most content. */
const DEFAULT_FROM = { x: 0.15, y: 0.5 };
const DEFAULT_TO = { x: 0.85, y: 0.5 };

/** One pointer sample every ~16ms is a 60fps glide. Fewer looks like a jump
 *  cut in the recorded video, which is the whole thing these actions exist to
 *  avoid. */
const FRAME_MS = 16;

const pointIn = (box, f) => ({
  x: box.x + box.width * f.x,
  y: box.y + box.height * f.y,
});

async function boxOf(page, at, what) {
  const box = await page.locator(`[data-wt="${at}"]`).first().boundingBox({ timeout: 15000 });
  if (!box) throw new Error(`${what}: [data-wt="${at}"] has no box on screen`);
  return box;
}

/** Glide the pointer from one point to another over real time.
 *
 *  Playwright's `mouse.move(x, y, { steps })` fires its intermediate moves as
 *  fast as it can, which a pointer-driven WebGL scene renders as a single jump.
 *  Waiting between samples is what makes the motion visible in the clip. */
async function glide(page, from, to, ms) {
  const n = Math.max(2, Math.round(ms / FRAME_MS));
  await page.mouse.move(from.x, from.y);
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    await page.mouse.move(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t);
    await page.waitForTimeout(FRAME_MS);
  }
}

/** Sweep the pointer across an element without pressing — for anything that
 *  reacts to hover alone, like the parallax diorama. */
async function hover(page, s) {
  const box = await boxOf(page, s.at, "hover");
  await glide(page, pointIn(box, s.from ?? DEFAULT_FROM), pointIn(box, s.to ?? DEFAULT_TO), s.overMs ?? 2500);
}

/** Press, move, release. Same sweep as hover with the button held. */
async function drag(page, s) {
  const box = await boxOf(page, s.at, "drag");
  const from = pointIn(box, s.from ?? DEFAULT_FROM);
  const to = pointIn(box, s.to ?? DEFAULT_TO);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await glide(page, from, to, s.overMs ?? 2500);
  await page.mouse.up();
}

/** Drag a range slider's thumb to a fraction of its track.
 *
 *  Not `fill()` or a synthetic input event: those set the value correctly but
 *  the viewer sees the handle teleport, and a step narrating "drag the slider"
 *  over a teleport is the same species of lie as narrating motion over a still
 *  frame. `s.value` is 0..1 along the track, not the input's own min/max. */
async function range(page, s) {
  const el = page.locator(`[data-wt="${s.at}"]:is(input[type=range]), [data-wt="${s.at}"] input[type=range]`).first();
  const box = await el.boundingBox({ timeout: 15000 });
  if (!box) throw new Error(`range: no slider under [data-wt="${s.at}"]`);
  const y = box.y + box.height / 2;
  const start = await el.evaluate((node) => {
    const min = Number(node.min || 0), max = Number(node.max || 100);
    return max === min ? 0 : (Number(node.value) - min) / (max - min);
  });
  await page.mouse.move(box.x + box.width * start, y);
  await page.mouse.down();
  await glide(page, { x: box.x + box.width * start, y },
                    { x: box.x + box.width * Number(s.value), y }, s.overMs ?? 2000);
  await page.mouse.up();
}

/** Dispatch one step's action. `must` wraps each in the step-numbered error
 *  message the recorder reports; `root` is the repo root, for upload paths. */
export async function runAction(page, s, { must, root }) {
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

  if (s.act === "select" && s.at && s.value)
    // A dropdown cannot be driven by clicking it: a click opens the native
    // menu and picks nothing, which is how a step once narrated a chosen
    // target over a select still reading "(none)".
    await must(`select "${s.value}" in [data-wt="${s.at}"]`, () =>
      page
        .locator(`[data-wt="${s.at}"]:is(select), [data-wt="${s.at}"] select`)
        .first()
        .selectOption(s.value, { timeout: 15000 })
    );

  if (s.act === "file" && s.file) {
    // s.file may be one path or several: a `multiple` input whose handler
    // replaces its list on each pick (Plant Growth) needs every frame in a
    // single setInputFiles call, not one per step, or only the last survives.
    const files = (Array.isArray(s.file) ? s.file : [s.file])
      .map((f) => path.join(root, "public", f.replace(/^\//, "")));
    await must(`upload ${files.length > 1 ? `${files.length} files` : s.file}`, () =>
      page.locator("input[type=file]").first().setInputFiles(files, { timeout: 15000 })
    );
  }

  if (s.act === "hover" && s.at)
    await must(`hover across [data-wt="${s.at}"]`, () => hover(page, s));

  if (s.act === "drag" && s.at)
    await must(`drag across [data-wt="${s.at}"]`, () => drag(page, s));

  if (s.act === "range" && s.at && s.value !== undefined)
    await must(`drag slider [data-wt="${s.at}"] to ${s.value}`, () => range(page, s));
}
