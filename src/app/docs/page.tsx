import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ParticleGridClient from "@/components/ParticleGridClient";
import capabilities from "@/data/capabilities";

/**
 * Deliberately not a hand-written endpoint reference.
 *
 * The backend is FastAPI, so it already publishes an accurate, interactive
 * reference at /docs and a machine-readable schema at /openapi.json — both
 * checked live and returning 200. A hand-copied list of 116 operations would
 * start drifting from the real one the first time a router changed, so this
 * page explains the shape of the system and points at the generated docs
 * instead. Every figure and example below was run against production before
 * being written down.
 */
const API = "https://wram1708-ml-unified.hf.space";

const title = "Docs & API | AIRaML";
const description =
  "How the tools work, what runs where, and how to call the API directly — with the live interactive reference.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description, type: "website" },
};

const link = { color: "var(--accent-from)", textDecoration: "none" } as const;

function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: "2.75rem" }}>
      <h2 style={{ fontFamily: "var(--type-display)", fontSize: "1.15rem", fontWeight: 700, color: "var(--text)", margin: "0 0 0.75rem" }}>
        {heading}
      </h2>
      <div style={{ fontSize: "0.92rem", lineHeight: 1.7, color: "var(--text2)" }}>{children}</div>
    </section>
  );
}

function Code({ children }: { children: string }) {
  return (
    <pre
      style={{
        fontFamily: "var(--type-data)",
        fontSize: "0.78rem",
        lineHeight: 1.6,
        background: "var(--bg-card)",
        border: "1px solid var(--border2)",
        borderRadius: "var(--radius-card)",
        padding: "0.9rem 1rem",
        overflowX: "auto",
        margin: "0.75rem 0",
        color: "var(--text)",
      }}
    >
      <code>{children}</code>
    </pre>
  );
}

export default function DocsPage() {
  return (
    <>
      <ParticleGridClient />
      <Navbar />
      <div className="section" style={{ maxWidth: 760 }}>
        <p className="section-label">Docs</p>
        <h1 className="section-heading">
          How this <span className="heading-accent">actually works</span>
        </h1>
        <p style={{ fontSize: "0.95rem", color: "var(--text3)", marginBottom: "3rem", maxWidth: 620 }}>
          What runs where, and how to call the API yourself. Everything below was run against the live
          service before it was written down.
        </p>

        <Section heading="The shape of it">
          <p style={{ margin: "0 0 0.75rem" }}>
            The site is a Next.js app on Vercel. {capabilities.length} tools sit on top of one FastAPI
            backend running in a Docker container on a free Hugging Face Space, which currently exposes{" "}
            <strong style={{ color: "var(--text)" }}>116 endpoints</strong>.
          </p>
          <p style={{ margin: 0 }}>
            Ten tools never touch the backend at all — they run entirely in your browser. Which ones, and
            what happens to anything you upload to the rest, is set out on the{" "}
            <a href="/privacy" style={link}>Privacy &amp; Terms</a> page. The request path from browser to
            model, including the security layer in between, is diagrammed on the{" "}
            <a href="/#architecture" style={link}>home page</a>.
          </p>
        </Section>

        <Section heading="Calling the API">
          <p style={{ margin: "0 0 0.25rem" }}>
            There is no API key and no account. The base URL is:
          </p>
          <Code>{API}</Code>
          <p style={{ margin: "0.75rem 0 0.25rem" }}>
            A request that works right now, and what it returns:
          </p>
          <Code>{`curl ${API}/health

{"status":"ok","models":["80-cereals","diabetes","insurance",
                         "iris","my-automl-model","optuna-run","titanic"]}`}</Code>
          <p style={{ margin: "0.75rem 0 0" }}>
            Most tool endpoints are <code style={{ fontFamily: "var(--type-data)", fontSize: "0.85em" }}>POST</code>{" "}
            and take either JSON with a base64-encoded file or a multipart upload. Rather than list all
            116 here and let the list rot, use the generated reference below — it is produced from the
            running code, so it cannot drift.
          </p>
        </Section>

        <Section heading="Full endpoint reference">
          <p style={{ margin: "0 0 0.75rem" }}>
            FastAPI publishes an interactive reference with every route, its request schema and its
            response shape. You can send test requests straight from the page:
          </p>
          <p style={{ margin: "0 0 0.4rem" }}>
            <a href={`${API}/docs`} target="_blank" rel="noopener noreferrer" style={{ ...link, fontWeight: 600 }}>
              Interactive API reference (Swagger UI) →
            </a>
          </p>
          <p style={{ margin: 0 }}>
            <a href={`${API}/openapi.json`} target="_blank" rel="noopener noreferrer" style={{ ...link, fontWeight: 600 }}>
              OpenAPI schema (JSON) →
            </a>{" "}
            — for generating a client.
          </p>
        </Section>

        <Section heading="Limits you will hit">
          <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
            <li style={{ marginBottom: "0.35rem" }}>
              <strong style={{ color: "var(--text)" }}>Rate limits.</strong> 60 requests per minute per
              client, dropping to 10 per minute on endpoints backed by a paid language model. Over the
              limit returns <code style={{ fontFamily: "var(--type-data)", fontSize: "0.85em" }}>429</code>.
            </li>
            <li style={{ marginBottom: "0.35rem" }}>
              <strong style={{ color: "var(--text)" }}>Request size.</strong> Bodies over 10&nbsp;MB are
              rejected with <code style={{ fontFamily: "var(--type-data)", fontSize: "0.85em" }}>413</code>,
              and several upload routes cap lower than that.
            </li>
            <li style={{ marginBottom: "0.35rem" }}>
              <strong style={{ color: "var(--text)" }}>Browser origin.</strong> Requests carrying an{" "}
              <code style={{ fontFamily: "var(--type-data)", fontSize: "0.85em" }}>Origin</code> header
              from a site that is not allow-listed get{" "}
              <code style={{ fontFamily: "var(--type-data)", fontSize: "0.85em" }}>403</code>. Server-side
              calls with no Origin header — curl, scripts — are unaffected.
            </li>
            <li style={{ marginBottom: "0.35rem" }}>
              <strong style={{ color: "var(--text)" }}>Cold starts.</strong> The Space sleeps when idle, so
              the first request after a quiet spell takes a few seconds.
            </li>
            <li>
              <strong style={{ color: "var(--text)" }}>Daily budget.</strong> Endpoints that call a paid
              model have a per-day cap, after which they return{" "}
              <code style={{ fontFamily: "var(--type-data)", fontSize: "0.85em" }}>429</code> until it
              resets. This keeps the service free to run.
            </li>
          </ul>
        </Section>

        <Section heading="Source">
          <p style={{ margin: 0 }}>
            Backend and frontend are both public on{" "}
            <a href="https://github.com/ramleo" target="_blank" rel="noopener noreferrer" style={link}>
              GitHub
            </a>
            . Recent changes are listed on the <a href="/changelog" style={link}>changelog</a>.
          </p>
        </Section>
      </div>
      <Footer />
    </>
  );
}
