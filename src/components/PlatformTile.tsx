"use client";

import Link from "next/link";

/** One platform rendered as a bento tile in the Toolkit's `.dom-card` style:
 *  a faded texture of the platform's own terms, its name and task at the foot.
 *  Native platforms navigate client-side ("Enter"); external HF-Space apps open
 *  in a new tab carrying the current theme + palette. */
export type Platform = {
  id: string;
  title: string;
  description: string;
  model: string;
  task: string;
  dataset: string;
  tags: string[];
  url: string;
  accent: string;
  internal?: boolean;
  href?: string;
};

/** Build the faded name-mosaic from the platform's own fields, so a tile reads
 *  as density (like the toolkit's tool-name texture) rather than an empty box. */
function texture(p: Platform): string[] {
  const raw = [
    ...p.tags,
    ...p.model.split(/[·,]/),
    ...p.dataset.split(/[·,]/),
    p.task,
  ].map((s) => s.trim()).filter(Boolean);
  return Array.from(new Set(raw)).slice(0, 14);
}

export default function PlatformTile({ platform, size }: { platform: Platform; size: "big" | "sm" }) {
  const { title, description, task, accent, internal, href, url } = platform;
  const tokens = texture(platform);
  const cls = `dom-card subtle-card dom-${size}`;
  const styleVars = { ["--dom" as string]: accent, ["--dom-l" as string]: accent };

  const inner = (
    <>
      <span className="dom-mosaic" aria-hidden="true">
        {tokens.map((t, i) => (
          <i key={t} className={i % 3 === 2 ? "hi" : undefined}>{t}</i>
        ))}
      </span>
      <span className="dom-cap">
        <span className="dom-name">{title}</span>
        <span className="dom-count">{task} · Enter</span>
        {size === "big" && <span className="dom-blurb">{description}</span>}
      </span>
    </>
  );

  if (internal) {
    return (
      <Link href={href ?? "/"} className={cls} style={styleVars}>{inner}</Link>
    );
  }

  // External HF-Space app: open in a new tab, carrying theme + palette so the
  // app matches the site the visitor came from (same behaviour as before).
  const openExternal = (e: React.MouseEvent) => {
    e.preventDefault();
    const theme = document.documentElement.classList.contains("light") ? "light" : "dark";
    let palette = "cosmic";
    try { palette = localStorage.getItem("palette") ?? "cosmic"; } catch {}
    const sep = url.includes("?") ? "&" : "?";
    window.open(`${url}${sep}theme=${theme}&palette=${palette}`, "_blank", "noopener");
  };

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className={cls} style={styleVars} onClick={openExternal}>
      {inner}
    </a>
  );
}
