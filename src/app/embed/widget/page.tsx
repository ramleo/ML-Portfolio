import EmbedWidget from "./EmbedWidget";

/** Q3 M3 — the chat UI that renders INSIDE the embed iframe (public).
 *
 * It holds no secret: the loader (running on the embedding site) mints a short session
 * token and hands it in by postMessage, and every call carries that token. This page is
 * framed cross-origin by third-party sites, so it must NOT set X-Frame-Options/DENY;
 * which sites may frame it is enforced at session mint (origin allowlist), not here. */

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Chat",
  robots: { index: false, follow: false },
};

export default function EmbedWidgetPage() {
  return <EmbedWidget />;
}
