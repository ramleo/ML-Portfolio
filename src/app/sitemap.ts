import type { MetadataRoute } from "next";
import { readdirSync } from "node:fs";
import { join } from "node:path";

// SEO hygiene (WEBSITE_GUIDELINES §D): a real sitemap so every tool page is
// discoverable. Next.js serves this at /sitemap.xml. Tool slugs are read from
// the filesystem at build time, so a tool added later is included automatically
// — no hand-maintained list to fall out of date.
const BASE = "https://ml-portfolio-rho.vercel.app";

const STATIC_PATHS = ["", "/about", "/handbook", "/docs", "/changelog", "/privacy"];

function toolPaths(): string[] {
  try {
    return readdirSync(join(process.cwd(), "src/app/tools"), { withFileTypes: true })
      .filter((e) => e.isDirectory() && !e.name.startsWith("[") && !e.name.startsWith("_"))
      .map((e) => `/tools/${e.name}`);
  } catch {
    return []; // never fail the build over a sitemap; static pages still list
  }
}

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [...STATIC_PATHS, ...toolPaths()].map((path) => ({
    url: `${BASE}${path}`,
    lastModified: now,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : 0.7,
  }));
}
