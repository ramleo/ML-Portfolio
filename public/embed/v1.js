/* AIRaML embeddable chatbot — loader (Q3 M3).
 *
 * Usage (paste once on any page):
 *   <script src="https://<your-site>/embed/v1.js" data-bot="pk_live_..." async></script>
 *
 * What it does: injects a floating bubble + a sandboxed cross-origin iframe (the chat
 * panel). On first open it mints a short session token from THIS site (the request
 * carries the embedding site's Origin, which the server checks against the bot's
 * allowlist), then hands the token to the iframe by postMessage. The iframe is a
 * different origin from the host page, so the host can't read the conversation; the
 * host page can't be read by the widget either. No secret ships in this file — the
 * publishable key only starts a session.
 */
(function () {
  "use strict";
  var script = document.currentScript;
  if (!script) return;
  var BOT = (script.getAttribute("data-bot") || "").trim();
  if (!BOT) return;
  var BASE = new URL(script.src).origin;
  if (window.__airamlEmbed) return;      // guard against a double include
  window.__airamlEmbed = true;

  var session = null;          // {token,...} once minted, or "denied"
  var iframe = null;
  var open = false;

  // ── floating bubble ────────────────────────────────────────────────────────
  var bubble = document.createElement("button");
  bubble.setAttribute("aria-label", "Open chat");
  bubble.style.cssText = [
    "position:fixed", "right:20px", "bottom:20px", "width:56px", "height:56px",
    "border-radius:50%", "border:none", "cursor:pointer", "z-index:2147483000",
    "background:#2563eb", "color:#fff", "box-shadow:0 6px 24px rgba(0,0,0,.24)",
    "display:flex", "align-items:center", "justify-content:center", "padding:0",
  ].join(";");
  var ICON_CHAT = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>';
  var ICON_CLOSE = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>';
  bubble.innerHTML = ICON_CHAT;
  bubble.addEventListener("click", toggle);
  document.body.appendChild(bubble);

  function panelCss(show) {
    return [
      "position:fixed", "right:20px", "bottom:88px", "z-index:2147482999",
      "width:min(380px, calc(100vw - 32px))", "height:min(560px, calc(100vh - 120px))",
      "border:none", "border-radius:16px", "overflow:hidden",
      "box-shadow:0 12px 48px rgba(0,0,0,.28)", "background:#fff",
      "display:" + (show ? "block" : "none"),
    ].join(";");
  }

  function mint() {
    // A "simple" CORS request (text/plain, no custom headers) so there is NO preflight —
    // a preflight can't carry the key anyway. The key travels in the body; the server
    // still sees the real Origin and checks it against the bot's allowlist.
    return fetch(BASE + "/api/embed/session", {
      method: "POST", mode: "cors", credentials: "omit",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ key: BOT }),
    }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
  }

  function createIframe() {
    iframe = document.createElement("iframe");
    iframe.src = BASE + "/embed/widget?bot=" + encodeURIComponent(BOT);
    iframe.setAttribute("sandbox", "allow-scripts allow-same-origin allow-forms allow-popups");
    iframe.setAttribute("allow", "clipboard-write");
    iframe.setAttribute("title", "Chat");
    iframe.style.cssText = panelCss(true);
    document.body.appendChild(iframe);
  }

  // The iframe announces readiness; reply with the session (or an unavailable notice).
  window.addEventListener("message", function (e) {
    if (!iframe || e.source !== iframe.contentWindow || e.origin !== BASE) return;
    var type = e.data && e.data.type;
    if (type === "embed:ready") {
      if (session && session !== "denied") {
        iframe.contentWindow.postMessage({
          type: "embed:init", token: session.token, name: session.name,
          greeting: session.greeting, autosuggest: session.autosuggest,
        }, BASE);
      } else {
        iframe.contentWindow.postMessage({ type: "embed:unavailable" }, BASE);
      }
    } else if (type === "embed:close") {
      setOpen(false);
    }
  });

  function toggle() { setOpen(!open); }

  function setOpen(next) {
    open = next;
    bubble.innerHTML = open ? ICON_CLOSE : ICON_CHAT;
    bubble.setAttribute("aria-label", open ? "Close chat" : "Open chat");
    if (open && !iframe) {
      // Mint lazily on first open, then build the panel once we have an answer.
      bubble.disabled = true;
      mint().then(function (s) {
        session = s || "denied";
        createIframe();
        bubble.disabled = false;
      });
      return;
    }
    if (iframe) iframe.style.cssText = panelCss(open);
  }
})();
