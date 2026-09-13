"use client";
import { useEffect, useState } from "react";

/** Plotly, loaded from the CDN, once, and only on this route.
 *
 *  Bundling it would put roughly a megabyte of charting library into every
 *  page of the site to serve the one page that draws charts. The site's CSP
 *  already allows `script-src ... https:`, so the tag needs no config change.
 *
 *  The pinned version matters: `2.27.0` is what the legacy Explorer draws
 *  with, and `splom` and `scatter3d` behave differently enough across major
 *  versions that "latest" would make this page's appearance depend on a date.
 */
const PLOTLY_SRC = "https://cdn.plot.ly/plotly-2.27.0.min.js";

export type PlotlyStatus = "loading" | "ready" | "failed";

type PlotlyLike = {
  newPlot: (el: HTMLElement, data: unknown[], layout?: unknown, config?: unknown) => Promise<unknown>;
  react:   (el: HTMLElement, data: unknown[], layout?: unknown, config?: unknown) => Promise<unknown>;
  toImage: (el: HTMLElement, opts: Record<string, unknown>) => Promise<string>;
  purge:   (el: HTMLElement) => void;
  Plots:   { resize: (el: HTMLElement) => void };
};

declare global {
  interface Window { Plotly?: PlotlyLike }
}

let pending: Promise<void> | null = null;

function load(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.Plotly) return Promise.resolve();
  if (pending) return pending;
  pending = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${PLOTLY_SRC}"]`);
    const tag = existing ?? document.createElement("script");
    tag.addEventListener("load", () => resolve());
    tag.addEventListener("error", () => reject(new Error("plotly failed to load")));
    if (!existing) {
      tag.src = PLOTLY_SRC;
      tag.async = true;
      document.head.appendChild(tag);
    }
  });
  return pending;
}

export function usePlotly(): { status: PlotlyStatus; plotly: PlotlyLike | null } {
  const [status, setStatus] = useState<PlotlyStatus>(() =>
    typeof window !== "undefined" && window.Plotly ? "ready" : "loading");

  useEffect(() => {
    let live = true;
    load().then(
      () => live && setStatus(window.Plotly ? "ready" : "failed"),
      () => live && setStatus("failed"),
    );
    return () => { live = false; };
  }, []);

  return { status, plotly: status === "ready" ? (window.Plotly ?? null) : null };
}

/** True when the site is in light mode.
 *
 *  The toggle writes a `light` class onto `<html>` rather than firing an
 *  event, so an observer on that attribute is the only way a chart hears
 *  about the change. Charts that only read the theme on first paint keep
 *  dark axis labels on a white card until the next reload.
 */
export function useIsLight(): boolean {
  const [light, setLight] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const read = () => setLight(root.classList.contains("light"));
    read();
    const observer = new MutationObserver(read);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return light;
}
