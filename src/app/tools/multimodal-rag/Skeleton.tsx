"use client";

/** Shimmering placeholder block for a genuine multi-second async wait where
 * the UI would otherwise show nothing but text — sized/shaped by the caller
 * via `className` to match whatever real content it's standing in for, so
 * the swap from skeleton to real content doesn't jump. */
export default function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`rounded animate-pulse ${className}`} style={{ background: "var(--border)" }} />;
}
