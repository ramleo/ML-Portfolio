import type { Metadata } from "next";
import capabilities from "@/data/capabilities";

const SITE = "AIRaML";

/**
 * Per-tool page metadata, derived from the single capabilities list rather
 * than hardcoded per route. Before this, all 50 tool pages inherited the root
 * layout's metadata verbatim — every tab, every Google result and every shared
 * link read "AIRaML | ML Engineer Portfolio" with an identical description, so
 * no individual tool could rank or preview as itself.
 *
 * Called from each tool's layout.tsx at module scope, so Next.js still
 * evaluates it statically at build time.
 */
export function toolMetadata(id: string): Metadata {
  const cap = capabilities.find((c) => c.id === id);
  if (!cap) return {};

  const title = `${cap.title} | ${SITE}`;
  const description = summarize(cap.description);

  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

/**
 * Capability descriptions are full explanatory paragraphs. Search engines and
 * link previews truncate around 160 characters, so cut on a sentence boundary
 * where one falls in range and fall back to a word boundary otherwise —
 * never mid-word, and never an empty string.
 */
function summarize(text: string, limit = 158): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= limit) return clean;

  const window = clean.slice(0, limit);
  const lastStop = Math.max(window.lastIndexOf(". "), window.lastIndexOf("? "));
  if (lastStop > limit * 0.5) return window.slice(0, lastStop + 1);

  const lastSpace = window.lastIndexOf(" ");
  return `${window.slice(0, lastSpace > 0 ? lastSpace : limit).trimEnd()}…`;
}
