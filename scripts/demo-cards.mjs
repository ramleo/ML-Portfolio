/** The opening and closing cards that bookend a recorded demo.
 *
 *  Without them a clip starts mid-sentence over a page that is still
 *  painting, and stops dead on a frozen frame. The card also solves an
 *  alignment problem it did not set out to solve: video capture begins when
 *  the browser context is created, roughly a second before the page has
 *  rendered, and the narration track was being laid down from zero — so every
 *  caption sat about 1.3s behind the words describing it. Painting the card
 *  from the first frame covers that load, and reporting when it lifts gives
 *  the audio an exact lead to start after.
 */

export const CARD_MS = 4200;
const FADE_MS = 700;

/** Painted from an init script rather than after the load, so it is on screen
 *  in the very first captured frame — there is no moment of bare page. It
 *  attaches to documentElement because <body> may not exist yet at this
 *  point, and re-runs harmlessly on any navigation thanks to the id guard. */
export function cardScript({ title, blurb }) {
  return `(() => {
    if (document.getElementById("__demo_card")) return;
    const el = document.createElement("div");
    el.id = "__demo_card";
    el.innerHTML =
      '<div style="max-width:820px;padding:0 48px;text-align:center">' +
      '<div id="__demo_card_kicker" style="font:600 13px/1 system-ui;letter-spacing:.18em;' +
      'text-transform:uppercase;color:#7da5ff;margin-bottom:22px">Guided walkthrough</div>' +
      '<h1 style="font:700 54px/1.15 system-ui;color:#eef2ff;margin:0 0 20px">' + ${JSON.stringify(title)} + '</h1>' +
      '<p style="font:400 21px/1.55 system-ui;color:#9fb0d0;margin:0">' + ${JSON.stringify(blurb)} + '</p>' +
      '</div>';
    Object.assign(el.style, {
      position: "fixed", inset: "0", zIndex: "2147483647",
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "#0b0e17", opacity: "1",
      transition: "opacity ${FADE_MS}ms ease",
    });
    // An init script runs before the parser has produced anything at all —
    // document.documentElement is null here, not merely body. So wait for a
    // root to exist rather than assuming one does; this cost a whole
    // recording to a silent "Cannot read properties of null".
    const mount = () => {
      const root = document.body || document.documentElement;
      if (!root) return requestAnimationFrame(mount);
      root.append(el);
    };
    mount();
  })()`;
}

/** Fade the card away and take it out of the DOM. Resolves once the fade has
 *  finished, so the caller's clock — which the narration lead is measured
 *  against — starts at a clean page and not mid-dissolve. */
export async function liftCard(page) {
  await page.evaluate(() => {
    const el = document.getElementById("__demo_card");
    if (el) el.style.opacity = "0";
  });
  await page.waitForTimeout(FADE_MS);
  await page.evaluate(() => document.getElementById("__demo_card")?.remove());
}
