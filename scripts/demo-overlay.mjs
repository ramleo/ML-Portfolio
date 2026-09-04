/** The spotlight, the caption, and the backend watchdog.
 *
 *  Split out of record-demo.mjs when the closing card pushed it over the
 *  line limit. These three belong together: all of them are things the
 *  recorder paints onto, or watches on, the page it is filming.
 */

/** Draw the spotlight and caption into the page itself. The live player paints
 *  them over the iframe from outside; here there is no outside, so the same
 *  two elements are injected into the page being recorded. */
export const OVERLAY = `(() => {
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
    pointerEvents: "none",
    border: "1px solid rgba(255,255,255,.14)", boxShadow: "0 12px 34px rgba(0,0,0,.5)",
    display: "none",
  });
  document.body.append(spot, cap);
})()`;

/** Anything the page asks for that is not served by the site itself — in
 *  practice, the ML-Unified backend. Requests to `base` are the app's own
 *  (/api/track answers 400 locally and is none of our business). */
const isBackend = (url, base) => !url.startsWith(base);

/** Watch for a backend that cannot answer, and say so in those words.
 *  Without this the symptom surfaces as a missing string on screen, which
 *  reads like a broken demo script and sends you looking in the wrong file. */
export function watchBackend(page, base) {
  const failed = [];
  page.on("requestfailed", (r) => {
    if (isBackend(r.url(), base)) failed.push(`${r.url()} — ${r.failure()?.errorText ?? "failed"}`);
  });
  // A Space in the middle of a rebuild serves proxy 500s for several minutes.
  // The page looks fine and every assertion fails for reasons of its own.
  page.on("response", (r) => {
    if (isBackend(r.url(), base) && r.status() >= 500) failed.push(`${r.url()} — HTTP ${r.status()}`);
  });
  return failed;
}

/** Put the spotlight over an anchor, measuring where it is *now*.
 *  Called again after anything that moves the page under it — a smooth scroll
 *  that has not finished, or a result panel that has just appeared. A rect
 *  read while the page is still scrolling points at whatever used to be
 *  there, which is how a spotlight ends up framing the wrong paragraph.
 *
 *  An anchor that has gone away is hidden, not left alone. Re-measuring
 *  covers "the element moved"; it did nothing for "the element unmounted",
 *  and the two look identical from here. The multimodal RAG clip spent
 *  fourteen seconds ringing the search-filter chips because mmrag-add lives
 *  on the dropzone, the dropzone is replaced the moment ingest finishes, and
 *  every re-measure after that returned early and left the box frozen over
 *  whatever had moved into that space. No anchor means no spotlight. */
export const place = (page, at, also) =>
  page.evaluate(([sel, sel2]) => {
    const spot = document.getElementById("__demo_spot");
    if (!spot) return;
    const el = document.querySelector(`[data-wt="${sel}"]`);
    if (!el) { spot.style.display = "none"; return; }
    // A step that drives a slider is about what the slider does to the
    // picture, but the spotlight dims everything outside itself — so ringing
    // the control alone darkened the very thing the narration was pointing
    // at. `with` widens the ring to enclose both.
    const other = sel2 ? document.querySelector(`[data-wt="${sel2}"]`) : null;
    const rects = [el, other].filter(Boolean).map((n) => n.getBoundingClientRect());
    const r = {
      top: Math.min(...rects.map((b) => b.top)),
      left: Math.min(...rects.map((b) => b.left)),
      bottom: Math.max(...rects.map((b) => b.bottom)),
      right: Math.max(...rects.map((b) => b.right)),
    };
    r.width = r.right - r.left;
    r.height = r.bottom - r.top;
    Object.assign(spot.style, {
      display: "block", top: r.top - 6 + "px", left: r.left - 6 + "px",
      width: r.width + 12 + "px", height: r.height + 12 + "px",
    });
  }, [at, also]).catch(() => {});

