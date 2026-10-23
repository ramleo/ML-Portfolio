import { NextResponse } from "next/server";
import capabilities from "@/data/capabilities";
import { suggestQuestions } from "@/lib/tenant/rag";

/**
 * Dynamic starter questions for the homepage RAG chat — generated from the site's
 * OWN real content (the tool catalog), so they stay fresh as tools are added and
 * are grounded (no invented features). CACHED in-module with a TTL so this costs
 * one free-provider call every few hours, NOT one per visitor. The frontend shows
 * static curated chips instantly and swaps in these when they arrive; on any
 * failure it keeps the static ones.
 */

const TTL_MS = 6 * 60 * 60 * 1000; // 6h
let cache: { at: number; suggestions: string[] } | null = null;

const PERSONA =
  "You are the AIRaML website assistant. The site showcases Ramakrishnasai " +
  "Wuppalapati's machine-learning work and a catalog of free, in-browser ML/AI tools. " +
  "Suggest short questions a visitor might ask to explore the tools and his work.";

export async function GET() {
  if (cache && Date.now() - cache.at < TTL_MS) {
    return NextResponse.json({ suggestions: cache.suggestions });
  }
  // Ground the generation in the real tool catalog (name + one-line purpose).
  const chunks = capabilities.slice(0, 20).map((c) => `${c.title}: ${c.subtitle}. ${c.description}`);
  try {
    const suggestions = (await suggestQuestions(chunks, PERSONA)).slice(0, 4);
    if (suggestions.length) cache = { at: Date.now(), suggestions };
    return NextResponse.json({ suggestions });
  } catch {
    return NextResponse.json({ suggestions: [] });
  }
}
