import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ConstellationBackground from "@/components/ConstellationBackground";
import DomainToolGrid from "@/components/DomainToolGrid";
import { allDomains, countFor, domainBySlug } from "@/data/domains";

/**
 * One page per domain, from one file.
 *
 * This dynamic segment sits alongside fifty-one static `/tools/<tool-id>`
 * directories. Next resolves static segments before dynamic ones, so every
 * existing tool URL still hits its own page and this only ever receives the
 * leftovers — the four domain slugs, plus anything mistyped, which 404s rather
 * than rendering an empty grid. Adding a domain means adding a line to
 * data/domains.ts; adding a tool whose id collides with a domain slug is the
 * one thing that would break, and `generateStaticParams` would surface it as a
 * duplicate route at build time.
 */
type Params = { params: Promise<{ domain: string }> };

export function generateStaticParams() {
  return allDomains().map((d) => ({ domain: d.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const domain = domainBySlug((await params).domain);
  if (!domain) return {};
  const count = countFor(domain);
  return {
    title: `${domain.name} — ${count} tools`,
    description: domain.blurb || `${count} live ${domain.name} tools.`,
  };
}

export default async function DomainPage({ params }: Params) {
  const domain = domainBySlug((await params).domain);
  // A slug that is neither a real tool nor a listed domain. Without this the
  // page would render its chrome around an empty grid and look like a bug.
  if (!domain || countFor(domain) === 0) notFound();

  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ color: "var(--text)" }}>
      <ConstellationBackground />
      <div className="relative z-10">
        <Navbar />
        <main style={{ paddingTop: "1.5rem" }}>
          <DomainToolGrid domain={domain} />
        </main>
        <Footer />
      </div>
    </div>
  );
}
