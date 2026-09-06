/** Exports and downloads — LOGGING_SPEC.md §3 stage 6.
 *
 * 21 files build their own download, mostly with createObjectURL + a
 * synthetic anchor click. Editing all 21 would be the "twelve Gemini call
 * sites" mistake again, so this catches them centrally instead.
 *
 * Two mechanisms, because one does not cover everything:
 *
 *  1. A capture-phase click listener on the document. This sees any RENDERED
 *     `<a download>` the visitor clicks — the Export CSV links and similar.
 *
 *  2. A patched URL.createObjectURL. Every programmatic download in this
 *     codebase goes through it, including the ones on detached anchors that
 *     never bubble to the document and so are invisible to (1). It records
 *     the blob's type and size, which is what stage 6 asks for, and does not
 *     alter what the browser does.
 *
 * Filenames are NOT recorded: "q3-payroll.csv" is content, and §6 rule 1
 * keeps content out of this table.
 */
import { track } from "@/hooks/useAnalytics";
import { EV } from "@/lib/logEvents";

const extOf = (name: string) => (name.split(".").pop() ?? "").toLowerCase().slice(0, 8);

export function installDownloadTracking(): () => void {
  const onClick = (e: MouseEvent) => {
    const el = (e.target as HTMLElement | null)?.closest?.("a[download]") as HTMLAnchorElement | null;
    if (!el) return;
    track(EV.EXPORT, { meta: {
      ext: extOf(el.getAttribute("download") || ""),
      path: window.location.pathname,
      via: "link",
    } });
  };
  document.addEventListener("click", onClick, true);

  // Patch createObjectURL to see programmatic saves. Kept deliberately dumb:
  // read two fields off the blob, fire and forget, always return the real URL.
  // If anything here threw, every download on the site would break.
  const original = URL.createObjectURL.bind(URL);
  const patched = (obj: Blob | MediaSource): string => {
    try {
      if (obj instanceof Blob && obj.size > 0) {
        track(EV.DOWNLOAD, { meta: {
          mime: (obj.type || "unknown").slice(0, 60),
          size_bytes: obj.size,
          path: window.location.pathname,
          via: "blob",
        } });
      }
    } catch { /* never let logging break a download */ }
    return original(obj);
  };
  URL.createObjectURL = patched as typeof URL.createObjectURL;

  return () => {
    document.removeEventListener("click", onClick, true);
    URL.createObjectURL = original;
  };
}

/** Explicit copy tracking, for the buttons that copy rather than download. */
export function trackCopy(what: string, chars: number) {
  track(EV.COPY, { meta: { what, chars, path: window.location.pathname } });
}
