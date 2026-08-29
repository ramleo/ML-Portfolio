import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ParticleGridClient from "@/components/ParticleGridClient";

/**
 * Hand-curated rather than generated from git log, on purpose: commit
 * messages are written for whoever maintains the code, and most commits are
 * not things a visitor would notice. Only user-visible changes belong here.
 *
 * To add an entry: put it at the top of ENTRIES with an ISO date. Keep the
 * wording about what changed for someone using the site, not how it was
 * implemented.
 */
const title = "Changelog | AIRaML";
const description = "What has changed recently — new tools, fixes and corrections.";

export const metadata: Metadata = { title, description, openGraph: { title, description, type: "website" } };

type Entry = { date: string; kind: "Added" | "Changed" | "Fixed"; title: string; body: string };

const KIND_COLOR: Record<Entry["kind"], string> = {
  Added: "var(--arch-3)",
  Changed: "var(--arch-1)",
  Fixed: "var(--arch-2)",
};

const ENTRIES: Entry[] = [
  {
    date: "2026-08-29",
    kind: "Added",
    title: "Docs, changelog and a privacy page",
    body:
      "A page explaining how the system fits together and how to call the API directly, this changelog, " +
      "and a Privacy & Terms page setting out exactly which tools run in your browser, what happens to " +
      "files you upload, and what is logged.",
  },
  {
    date: "2026-08-29",
    kind: "Fixed",
    title: "Two tools described themselves as running locally when they do not",
    body:
      "Face Liveness and Depth Parallax both said they ran locally. Both actually send your image to the " +
      "server — no third-party AI provider is involved, but the photo does leave your device. Both now " +
      "say so. The image is processed in memory and not stored.",
  },
  {
    date: "2026-08-29",
    kind: "Changed",
    title: "The site is now a product, with the CV on its own page",
    body:
      "The home page is the tools. Background, skills, career history and the resume moved to /about. " +
      "All 50 tool descriptions were rewritten to say what each one does for you rather than how it was " +
      "built.",
  },
  {
    date: "2026-08-29",
    kind: "Fixed",
    title: "Performance figures that could not be substantiated were removed",
    body:
      "A handful of accuracy and confidence numbers were shown on cards and in descriptions without " +
      "anything on the site backing them up. They have been taken down rather than restated. The " +
      "qualitative limitations around them stay.",
  },
  {
    date: "2026-08-29",
    kind: "Fixed",
    title: "Phones no longer scroll sideways",
    body:
      "The home page and several tool pages were wider than a phone screen — the AutoML page by 285px — " +
      "so the whole page could be dragged left and right. Header controls were also too small to tap " +
      "reliably and some text was under 10px.",
  },
  {
    date: "2026-08-29",
    kind: "Fixed",
    title: "Headings were hard to read in light mode",
    body:
      "The gradient used on headings failed contrast requirements on the light background across all " +
      "four colour palettes — one stop at less than half the required ratio. Light mode now uses darker " +
      "stops that pass.",
  },
  {
    date: "2026-08-29",
    kind: "Changed",
    title: "Typography, and a diagram of the request path",
    body:
      "Headings, body text and figures now use three distinct typefaces instead of one. A new section on " +
      "the home page shows how a request travels from your browser through the security layer to the " +
      "models.",
  },
  {
    date: "2026-08-28",
    kind: "Added",
    title: "YARA File Scanner",
    body:
      "Scan a file with the real YARA engine using a built-in rule set, or write and test your own rule " +
      "against it.",
  },
  {
    date: "2026-08-28",
    kind: "Added",
    title: "Keystroke Biometric Auth-Risk Demo",
    body:
      "Enrol a typing-rhythm profile and see how closely a later attempt matches it. Runs entirely in " +
      "your browser.",
  },
  {
    date: "2026-08-28",
    kind: "Added",
    title: "Hardening against abuse",
    body:
      "Rate limiting, a request size cap, an origin allow-list, malware scanning on uploads and a daily " +
      "spend cap on the endpoints that call paid models — so the free tools stay available.",
  },
];

export default function ChangelogPage() {
  return (
    <>
      <ParticleGridClient />
      <Navbar />
      <div className="section" style={{ maxWidth: 760 }}>
        <p className="section-label">Changelog</p>
        <h1 className="section-heading">
          What changed, <span className="heading-accent">and when</span>
        </h1>
        <p style={{ fontSize: "0.95rem", color: "var(--text3)", marginBottom: "3rem", maxWidth: 620 }}>
          User-visible changes only. Corrections are listed alongside new features rather than quietly
          shipped — if something on this site was wrong, it says so here.
        </p>

        <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {ENTRIES.map((e, i) => (
            <li
              key={`${e.date}-${i}`}
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr)",
                gap: "0.4rem",
                paddingBottom: "1.6rem",
                marginBottom: "1.6rem",
                borderBottom: i === ENTRIES.length - 1 ? "none" : "1px solid var(--border)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
                <span
                  style={{
                    fontFamily: "var(--type-data)",
                    fontSize: "0.6rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    color: KIND_COLOR[e.kind],
                    border: `1px solid ${KIND_COLOR[e.kind]}`,
                    borderRadius: 9999,
                    padding: "2px 8px",
                  }}
                >
                  {e.kind}
                </span>
                <time
                  dateTime={e.date}
                  style={{ fontFamily: "var(--type-data)", fontSize: "0.68rem", color: "var(--text3)" }}
                >
                  {e.date}
                </time>
              </div>
              <h2
                style={{
                  fontFamily: "var(--type-display)",
                  fontSize: "1rem",
                  fontWeight: 700,
                  color: "var(--text)",
                  margin: 0,
                }}
              >
                {e.title}
              </h2>
              <p style={{ fontSize: "0.9rem", lineHeight: 1.65, color: "var(--text2)", margin: 0 }}>
                {e.body}
              </p>
            </li>
          ))}
        </ol>
      </div>
      <Footer />
    </>
  );
}
