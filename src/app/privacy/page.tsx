import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ParticleGridClient from "@/components/ParticleGridClient";

/**
 * Written from what the code actually does, not from a template. Every claim
 * below was checked against the source before being written down:
 *
 *  - the client-side list is the set of tool pages with no reference to the
 *    backend URL anywhere in their own directory
 *  - the analytics columns are the exact insert in src/app/api/track/route.ts
 *  - the security-event fields are the exact payload in security/events.py
 *  - "processed in memory" was verified for the image endpoints by checking
 *    they never write to disk, and the RAG exception is called out because
 *    that one genuinely does persist an index
 *
 * If any of those change, this page is wrong and needs updating with them.
 */
const title = "Privacy & Terms | AIRaML";
const description =
  "What happens to files you upload, which tools run entirely in your browser, what is logged, and which third parties receive data.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description, type: "website" },
};

const CLIENT_ONLY = [
  "Password Strength & Breach Checker",
  "Keystroke Biometric Auth-Risk Demo",
  "Phishing Email Body Classifier",
  "Malicious Package Scanner",
  "DNS Tunneling / Exfiltration Detector",
  "ASL Fingerspelling Recognition",
  "Pose VJ Visuals",
  "Gait Pattern Comparison",
  "Movement Form Comparison",
  "Video-Call Keystroke Inference",
];

function Section({ id, heading, children }: { id: string; heading: string; children: React.ReactNode }) {
  return (
    <section id={id} style={{ marginBottom: "2.75rem" }}>
      <h2
        style={{
          fontFamily: "var(--type-display)",
          fontSize: "1.15rem",
          fontWeight: 700,
          color: "var(--text)",
          margin: "0 0 0.75rem",
        }}
      >
        {heading}
      </h2>
      <div style={{ fontSize: "0.92rem", lineHeight: 1.7, color: "var(--text2)" }}>{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <>
      <ParticleGridClient />
      <Navbar />
      <div className="section" style={{ maxWidth: 760 }}>
        <p className="section-label">Privacy &amp; Terms</p>
        <h1 className="section-heading">
          What happens to <span className="heading-accent">your data</span>
        </h1>
        <p style={{ fontSize: "0.95rem", color: "var(--text3)", marginBottom: "3rem", maxWidth: 620 }}>
          Written from what the code actually does rather than from a template. Where the answer is
          &ldquo;it depends on the tool&rdquo;, that is said plainly instead of averaged into something
          reassuring.
        </p>

        <Section id="in-browser" heading="Tools that never send your data anywhere">
          <p style={{ margin: "0 0 0.75rem" }}>
            These {CLIENT_ONLY.length} run entirely in your browser. What you type, paste or record is
            processed on your own machine and no request carrying it is made at all — you can confirm
            this in your browser&rsquo;s network tab:
          </p>
          <ul style={{ margin: "0 0 0.75rem", paddingLeft: "1.1rem" }}>
            {CLIENT_ONLY.map((t) => (
              <li key={t} style={{ marginBottom: "0.2rem" }}>{t}</li>
            ))}
          </ul>
          <p style={{ margin: 0 }}>
            The password checker is the one partial exception, and only by design: if you opt into the
            breach check it sends the first five characters of your password&rsquo;s SHA-1 hash to Have I
            Been Pwned. That is k-anonymity — the password itself and the full hash never leave your
            machine.
          </p>
        </Section>

        <Section id="uploads" heading="Tools that do send your file to a server">
          <p style={{ margin: "0 0 0.75rem" }}>
            Every other tool sends your input to this project&rsquo;s backend, a container running on a
            Hugging Face Space. In almost all cases the file is decoded, processed in memory and
            discarded when the response is returned — it is never written to disk.
          </p>
          <p style={{ margin: 0 }}>
            <strong style={{ color: "var(--text)" }}>The exception is Multimodal RAG.</strong> That tool
            has to store what you upload, because its whole purpose is to index a document so you can ask
            questions about it afterwards. Text chunks and embeddings are written to a vector database on
            the server. That storage is not encrypted, is not access-controlled per user, and sits on a
            free Hugging Face Space whose disk is wiped whenever the Space restarts or rebuilds. Treat it
            as a scratchpad: do not upload anything confidential.
          </p>
        </Section>

        <Section id="third-parties" heading="Third parties that may see your content">
          <p style={{ margin: "0 0 0.75rem" }}>
            Some tools call a hosted language or vision model. When they do, the relevant part of your
            input is sent to that provider and is subject to their terms, not this site&rsquo;s. The
            providers used are <strong style={{ color: "var(--text)" }}>Mistral, Google Gemini, Groq and
            Cohere</strong>.
          </p>
          <p style={{ margin: 0 }}>
            Where a tool can avoid sending your raw input it does. The SIEM Alert Triage tool, for
            example, groups and deduplicates your log in the browser first and sends only the summarised
            groups onward — never the raw log.
          </p>
        </Section>

        <Section id="logging" heading="What is recorded about your visit">
          <p style={{ margin: "0 0 0.75rem" }}>
            Basic usage analytics are stored: the event type, the page path, a random session id, the
            referrer, how long you stayed, and a two-letter country code derived from the request. Your
            IP address is not stored with analytics.
          </p>
          <p style={{ margin: "0 0 0.75rem" }}>
            Alongside each event a small amount of structured detail is stored, and it is deliberately
            limited to counts, sizes, durations and fixed choices — for example which tool you used, how
            long a run took, whether it succeeded, and if it failed, a category such as
            &ldquo;rate limited&rdquo; or &ldquo;timed out&rdquo; with the HTTP status. Each run is given
            a random id so a click can be matched to its outcome.
          </p>
          <p style={{ margin: "0 0 0.75rem" }}>
            <strong>None of it contains what you typed or uploaded.</strong> Document text, prompt text
            and search terms are never written to the analytics store. Where the length of something is
            useful, the length is recorded and the text is not.
          </p>
          <p style={{ margin: "0 0 0.75rem" }}>
            <strong>Analytics are kept for 14 months, then deleted automatically.</strong> That is long
            enough to compare one year against the next, and short enough that nothing is being hoarded.
            The deletion runs as a scheduled database job, not by hand.
          </p>
          <p style={{ margin: "0 0 0.75rem" }}>
            The backend separately logs security events — a blocked origin, a rate-limit hit, an
            oversized request, a file that matched a malware-scanning rule. Those entries do include the
            requesting IP address, because that is the point of them. They are operational logs on the
            Space and are not combined with the analytics above.
          </p>
          <p style={{ margin: "0 0 0.75rem" }}>
            <strong>When you upload a file, a short record of it is kept for 30 days</strong> so that
            abuse can be investigated: the filename, its type and size, and a SHA-256 fingerprint of its
            contents. <strong>The file itself is not kept</strong> — it is discarded once the tool has
            answered, and the fingerprint cannot be turned back into it. The fingerprint exists so that
            if a malicious file is identified later, it can be recognised without any copy having been
            stored. These records are deleted automatically after 30 days and are not readable by
            anything on this site. They also hold a scrambled, one-way form of the requesting IP
            address &mdash; not the address itself &mdash; used only to stop the same source
            flooding the log. It cannot be turned back into an address. If bot protection is enabled, that check is
            performed by Cloudflare Turnstile, which sees your IP and browser characteristics in order
            to tell a person from a script; it does not use tracking cookies and is not used to
            identify you across sites.
          </p>
          <p style={{ margin: 0 }}>
            Filenames are the one part of this worth spelling out: <em>report.pdf</em> reveals nothing,
            but a filename can carry a person&rsquo;s name. It is kept because a name without the
            document is a far smaller exposure than the document itself, and only under the 30-day
            limit above. <strong>The Password Strength checker is excluded from this entirely</strong> —
            nothing you type there leaves your browser, and no record of it is made anywhere.
          </p>
        </Section>

        <Section id="terms" heading="Terms of use">
          <p style={{ margin: "0 0 0.75rem" }}>
            Everything here is free to use, with no account and no payment. There is no uptime guarantee:
            this runs on free hosting, the backend sleeps when idle, and it can be unavailable or slow.
          </p>
          <p style={{ margin: "0 0 0.75rem" }}>
            The security and forensics tools are demonstrations of real techniques, not certified
            instruments. Several say so on their own page, and where a tool cannot reliably answer
            something it says that instead of guessing. Do not rely on any of them as the sole basis for a
            security, legal, medical or financial decision.
          </p>
          <p style={{ margin: 0 }}>
            Only scan domains and analyse files you are authorised to. Please do not upload other
            people&rsquo;s personal data.
          </p>
        </Section>

        <Section id="contact" heading="Questions">
          <p style={{ margin: 0 }}>
            Anything unclear or anything here that looks wrong — the source is public on{" "}
            <a href="https://github.com/ramleo" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent-from)" }}>
              GitHub
            </a>
            , or get in touch via the{" "}
            <a href="/about#contact" style={{ color: "var(--accent-from)" }}>
              contact form
            </a>
            .
          </p>
        </Section>
      </div>
      <Footer />
    </>
  );
}
