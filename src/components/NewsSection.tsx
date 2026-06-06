"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { motion, useInView } from "framer-motion";

interface NewsItem {
  title: string;
  summary: string;
  url: string;
  published: string;
  authors: string;
  source: string;
  image?: string;
}

const fade = { hidden: { opacity: 0, y: 28 }, visible: { opacity: 1, y: 0, transition: { duration: 0.45 } } };

function NewsCard({ item, accent }: { item: NewsItem; accent: string }) {
  return (
    <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
      <div className="news-card" style={{ height: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
          <span
            style={{
              fontSize: "0.62rem", fontWeight: 700, textTransform: "uppercase",
              letterSpacing: "0.08em", color: accent,
              background: `${accent}18`, border: `1px solid ${accent}35`,
              borderRadius: 4, padding: "2px 7px",
            }}
          >
            {item.source}
          </span>
          <span style={{ fontSize: "0.68rem", color: "var(--text3)" }}>{item.published}</span>
        </div>

        <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text)", lineHeight: 1.45, margin: 0, flex: 1 }}>
          {item.title}
        </p>

        {item.summary && (
          <p style={{ fontSize: "0.78rem", color: "var(--text2)", lineHeight: 1.6, margin: 0 }}>
            {item.summary.slice(0, 180)}{item.summary.length > 180 ? "…" : ""}
          </p>
        )}

        {item.authors && (
          <p style={{ fontSize: "0.7rem", color: "var(--text3)", margin: 0 }}>
            {item.authors}
          </p>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", color: accent, fontSize: "0.75rem", fontWeight: 600 }}>
          Read more
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M2 10L10 2M10 2H5M10 2v5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </a>
  );
}

export default function NewsSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  const [tab, setTab] = useState<"papers" | "news">("papers");
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [noKey, setNoKey] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async (type: "papers" | "news") => {
    setLoading(true);
    setError(false);
    setNoKey(false);
    try {
      const res = await fetch(`/api/news?type=${type}`);
      const data = await res.json();
      if (data.noKey) setNoKey(true);
      setItems(data.items ?? []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (inView) load(tab); }, [inView, tab, load]);

  const accent = tab === "papers" ? "#818cf8" : "#38bdf8";

  return (
    <section id="news" style={{ background: "var(--bg)", padding: "0 0 2rem" }}>
      <div className="section-sep" />
      <div className="section" ref={ref}>

        <motion.div initial="hidden" animate={inView ? "visible" : "hidden"} variants={{ visible: { transition: { staggerChildren: 0.08 } } }}>
          <motion.p className="section-label" variants={fade}>AI News</motion.p>
          <motion.h2 className="section-heading" variants={fade}>
            What&apos;s happening in <span className="gradient-text">AI & ML</span>
          </motion.h2>
          <motion.p variants={fade} style={{ fontSize: "0.95rem", color: "var(--text3)", maxWidth: 500, marginBottom: "2rem" }}>
            Latest research papers from arXiv and industry news — updated hourly.
          </motion.p>

          {/* Tabs */}
          <motion.div variants={fade} style={{ display: "flex", gap: "0.5rem", marginBottom: "2rem" }}>
            {(["papers", "news"] as const).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); }}
                style={{
                  padding: "0.4rem 1.1rem", borderRadius: 9999, fontSize: "0.8rem", fontWeight: 600,
                  border: tab === t ? "none" : "1px solid var(--border2)",
                  background: tab === t ? "linear-gradient(135deg, #6366f1, #38bdf8)" : "var(--border)",
                  color: tab === t ? "#fff" : "var(--text2)",
                  cursor: "pointer", transition: "all 0.15s",
                  boxShadow: tab === t ? "0 2px 12px rgba(99,102,241,0.3)" : "none",
                }}
              >
                {t === "papers" ? "📄 Research Papers" : "📰 Industry News"}
              </button>
            ))}
          </motion.div>

          {/* Content */}
          {loading && (
            <div style={{ textAlign: "center", padding: "4rem", color: "var(--text3)" }}>
              <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>⟳</div>
              Loading…
            </div>
          )}

          {error && (
            <div style={{ textAlign: "center", padding: "4rem", color: "var(--text3)" }}>
              Could not load at this time. Try again later.
            </div>
          )}

          {noKey && (
            <div style={{
              background: "var(--bg-card)", border: "1px solid var(--border2)", borderRadius: 14,
              padding: "2rem", textAlign: "center",
            }}>
              <div style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>🔑</div>
              <p style={{ fontWeight: 600, color: "var(--text)", marginBottom: "0.5rem" }}>NewsAPI key not configured</p>
              <p style={{ fontSize: "0.85rem", color: "var(--text3)" }}>
                Add <code style={{ background: "var(--border)", padding: "2px 6px", borderRadius: 4 }}>NEWSAPI_KEY</code> to your Vercel environment variables to enable this tab.
                Get a free key at <strong>newsapi.org</strong>.
              </p>
            </div>
          )}

          {!loading && !error && !noKey && items.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
              style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1rem" }}
            >
              {items.map((item, i) => (
                <motion.div
                  key={item.url}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.35 }}
                  style={{ display: "flex", flexDirection: "column" }}
                >
                  <NewsCard item={item} accent={accent} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </motion.div>
      </div>
    </section>
  );
}
