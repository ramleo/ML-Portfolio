import type { DemoStep } from "@/data/demos";

/** What one demo step does to the tool page inside the handbook's iframe.
 *
 *  Split out of HandbookDemo.tsx when the pointer-motion actions landed: this
 *  is the half that grows every time a tool needs a new kind of input.
 *
 *  Everything here has to be built from the *iframe's* own constructors, not
 *  this window's — an object made from the outer document fails the inner
 *  document's instanceof checks and React's synthetic events never fire.
 *
 *  It also has to fake motion rather than perform it. The recorder drives a
 *  real Playwright mouse; in the browser there is no such thing, so pointer
 *  events are constructed and dispatched by hand at coordinates walked across
 *  the element. The tool cannot tell the difference — it only ever reads
 *  clientX/clientY off the event. */

type Frame = Window & typeof globalThis;
type Pt = { x: number; y: number };

const DEFAULT_FROM: Pt = { x: 0.15, y: 0.5 };
const DEFAULT_TO: Pt = { x: 0.85, y: 0.5 };
const FRAME_MS = 16;

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const at = (box: DOMRect, f: Pt) => ({ x: box.left + box.width * f.x, y: box.top + box.height * f.y });

/** Dispatch one pointer sample as all three event families. Canvases listen on
 *  whichever they were written against — ParallaxCanvas uses mousemove,
 *  Relief3DCanvas uses pointermove — and sending both costs nothing. */
function movePointer(w: Frame, el: Element, kind: "move" | "down" | "up", p: Pt) {
  const init = { clientX: p.x, clientY: p.y, bubbles: true, cancelable: true, buttons: kind === "up" ? 0 : 1 };
  const pointer = { pointer: "pointerdown", up: "pointerup", move: "pointermove" }[kind === "down" ? "pointer" : kind];
  el.dispatchEvent(new w.PointerEvent(pointer, { ...init, pointerId: 1, isPrimary: true, pointerType: "mouse" }));
  el.dispatchEvent(new w.MouseEvent({ move: "mousemove", down: "mousedown", up: "mouseup" }[kind], init));
}

async function sweep(w: Frame, el: Element, s: DemoStep, held: boolean) {
  const box = el.getBoundingClientRect();
  const from = at(box, s.from ?? DEFAULT_FROM);
  const to = at(box, s.to ?? DEFAULT_TO);
  const n = Math.max(2, Math.round((s.overMs ?? 2500) / FRAME_MS));
  movePointer(w, el, "move", from);
  if (held) movePointer(w, el, "down", from);
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    movePointer(w, el, "move", { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t });
    await wait(FRAME_MS);
  }
  if (held) movePointer(w, el, "up", to);
}

/** Walk a range input to a fraction of its track, one step at a time.
 *
 *  Not a single assignment: the point of narrating a slider is watching the
 *  effect change as it moves, and a value set in one jump shows the end state
 *  only. React swallows a plain `.value =`, hence the native setter. */
async function slide(w: Frame, el: Element, s: DemoStep) {
  const input = (el.matches("input[type=range]") ? el : el.querySelector("input[type=range]")) as HTMLInputElement | null;
  if (!input) return;
  const min = Number(input.min || 0);
  const max = Number(input.max || 100);
  const target = min + (max - min) * Number(s.value ?? 1);
  const start = Number(input.value);
  const setter = Object.getOwnPropertyDescriptor(w.HTMLInputElement.prototype, "value")?.set;
  const n = Math.max(2, Math.round((s.overMs ?? 2000) / FRAME_MS));
  for (let i = 1; i <= n; i++) {
    setter?.call(input, String(start + (target - start) * (i / n)));
    input.dispatchEvent(new w.Event("input", { bubbles: true }));
    await wait(FRAME_MS);
  }
  input.dispatchEvent(new w.Event("change", { bubbles: true }));
}

/** A File's type becomes the data: URL's prefix, and an <img> will not decode
 *  `data:text/csv;base64,…`. This was hardcoded to text/csv, which was fine
 *  while every sample was a spreadsheet and broke the moment one was a photo. */
const mimeOf = (name: string) =>
  ({ csv: "text/csv", pdf: "application/pdf", json: "application/json", txt: "text/plain",
     png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp" } as Record<string, string>)[
    name.split(".").pop()?.toLowerCase() ?? ""
  ] ?? "application/octet-stream";

export async function performStep(s: DemoStep, d: Document, w: Frame): Promise<void> {
  if (!s.act || s.act === "none") return;
  const el = s.at ? (d.querySelector(`[data-wt="${s.at}"]`) as HTMLElement | null) : null;

  if (s.act === "scroll") return void el?.scrollIntoView({ block: "center", behavior: "smooth" });
  if (s.act === "click") return void el?.click();
  if (s.act === "hover" && el) return sweep(w, el, s, false);
  if (s.act === "drag" && el) return sweep(w, el, s, true);
  if (s.act === "range" && el) return slide(w, el, s);

  if (s.act === "select" && s.value) {
    const sel = (el?.matches("select") ? el : el?.querySelector("select")) as HTMLSelectElement | null;
    if (!sel) return;
    // Same React problem as typing: assigning .value is swallowed unless the
    // native setter is used and a change event is dispatched by hand.
    Object.getOwnPropertyDescriptor(w.HTMLSelectElement.prototype, "value")?.set?.call(sel, s.value);
    sel.dispatchEvent(new w.Event("change", { bubbles: true }));
    return;
  }

  if (s.act === "type" && s.value) {
    const input = (el?.matches("input, textarea") ? el : el?.querySelector("input, textarea")) as
      HTMLInputElement | HTMLTextAreaElement | null;
    if (!input) return;
    // React tracks the previous value on the node, so assigning .value
    // directly is swallowed. The native setter is the documented way past it.
    const proto = input instanceof w.HTMLTextAreaElement ? w.HTMLTextAreaElement : w.HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(proto.prototype, "value")?.set;
    input.focus();
    for (let i = 1; i <= s.value.length; i++) {
      setter?.call(input, s.value.slice(0, i));
      input.dispatchEvent(new w.Event("input", { bubbles: true }));
      await wait(18);
    }
    return;
  }

  if (s.act === "file" && s.file) {
    // One path or several — a `multiple` input whose handler replaces its list
    // on each change (Plant Growth) needs every file set in one change event.
    const paths = Array.isArray(s.file) ? s.file : [s.file];
    const dt = new w.DataTransfer();
    for (const p of paths) {
      const buf = await (await fetch(p)).arrayBuffer();
      const name = p.split("/").pop() ?? "sample";
      dt.items.add(new w.File([buf], name, { type: mimeOf(name) }));
    }
    const input = (el?.querySelector("input[type=file]") ??
      d.querySelector("input[type=file]")) as HTMLInputElement | null;
    if (!input) return;
    input.files = dt.files;
    input.dispatchEvent(new w.Event("change", { bubbles: true }));
  }
}
