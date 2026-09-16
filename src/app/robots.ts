import type { MetadataRoute } from "next";

// SEO hygiene (WEBSITE_GUIDELINES §D): a real robots.txt that points crawlers
// at the sitemap. Next.js serves this at /robots.txt. Everything is public, so
// allow all; only the API routes are noise for a crawler.
const BASE = "https://ml-portfolio-rho.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/api/" },
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
