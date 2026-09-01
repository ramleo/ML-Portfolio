"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { markJump, movedByHand } from "./handbookJump";

/**
 * A navigation rail down the right edge of the handbook.
 *
 * The page is roughly 387,000 pixels tall, which leaves the browser's own
 * scrollbar thumb a few pixels high — accurate to a thousand lines at best and
 * genuinely hard to grab. This is the same axis made usable: every chapter is
 * a tick you can click, and the whole strip can be dragged to scrub, so the
 * target is the full height of the window rather than a sliver.
 */

type Stop = { id: string; label: string; num: string; part: boolean; at: number };

function collect(): Stop[] {
  const body = document.querySelector(".hb-body");
  if (!body) return [];
  const total = document.documentElement.scrollHeight;
  const heads = body.querySelectorAll<HTMLElement>("h1.bk-chapter, .bk-partpage h1");
  const stops: Stop[] = [];
  for (const el of heads) {
    const part = !el.classList.contains("bk-chapter");
    // A part page carries its name in the h2 under the "Part 4" h1.
    const titleEl = part ? el.parentElement?.querySelector("h2") : el;
    const num = el.querySelector(".bk-chnum")?.textContent?.trim() ?? el.textContent?.trim() ?? "";
    const full = titleEl?.textContent?.trim() ?? "";
    stops.push({
      id: (part ? el.parentElement?.id : el.id) ?? "",
      label: part ? full : full.slice(num.length).trim(),
      num,
      part,
      at: (el.getBoundingClientRect().top + window.scrollY) / total,
    });
  }
  return stops;
}

export default function HandbookRail() {
  const [stops, setStops] = useState<Stop[]>([]);
  const [progress, setProgress] = useState(0);
  const [hover, setHover] = useState<Stop | null>(null);
  const [dragging, setDragging] = useState(false);
  const rail = useRef<HTMLDivElement>(null);

  // Measured after layout settles: the headings' offsets are meaningless until
  // fonts and the tables above them have stopped moving.
  useEffect(() => {
    const measure = () => setStops(collect());
    const t = window.setTimeout(measure, 400);
    window.addEventListener("resize", measure);
    return () => { window.clearTimeout(t); window.removeEventListener("resize", measure); };
  }, []);

  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const max = document.documentElement.scrollHeight - window.innerHeight;
        setProgress(max > 0 ? window.scrollY / max : 0);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); if (frame) cancelAnimationFrame(frame); };
  }, []);

  const scrubTo = useCallback((clientY: number) => {
    const box = rail.current?.getBoundingClientRect();
    if (!box) return;
    const fraction = Math.min(1, Math.max(0, (clientY - box.top) / box.height));
    const max = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo({ top: fraction * max, behavior: "instant" });
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    // Scrubbing is the reader moving themselves, not a jump: it should not
    // offer a way back, and it should let the next real jump mark afresh.
    movedByHand();
    setDragging(true);
    scrubTo(e.clientY);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const box = rail.current?.getBoundingClientRect();
    if (box && stops.length) {
      const fraction = (e.clientY - box.top) / box.height;
      // Nearest stop to the pointer, so the label names where a release lands.
      setHover(stops.reduce((a, b) => (Math.abs(b.at - fraction) < Math.abs(a.at - fraction) ? b : a)));
    }
    if (dragging) scrubTo(e.clientY);
  };

  const endDrag = (e: React.PointerEvent) => {
    if (!dragging) return;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    setDragging(false);
  };

  const jump = (s: Stop) => {
    markJump();
    document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (!stops.length) return null;

  return (
    <div
      ref={rail}
      className={`hb-rail${dragging ? " hb-rail-dragging" : ""}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onPointerLeave={() => !dragging && setHover(null)}
      role="navigation"
      aria-label="Jump to a chapter"
    >
      <div className="hb-rail-track" />
      <div className="hb-rail-now" style={{ top: `${progress * 100}%` }} />
      {stops.map(s => (
        <button
          key={s.id}
          type="button"
          onClick={() => jump(s)}
          style={{ top: `${s.at * 100}%` }}
          className={`hb-rail-tick${s.part ? " hb-rail-tick-part" : ""}`}
          aria-label={`${s.num}${s.num ? ": " : ""}${s.label}`}
        />
      ))}
      {hover && (
        <span className="hb-rail-label" style={{ top: `${hover.at * 100}%` }}>
          {hover.num && <em>{hover.num}</em>}
          {hover.label}
        </span>
      )}
    </div>
  );
}
