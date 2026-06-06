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

function NewsCard({ item, accent, delay }: { item: NewsItem; accent: string; delay: number }) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [hovering, setHovering] = useState(false);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = (e.clientX - rect.left) / rect.width - 0.5;
    const cy = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: cy * -8, y: cx * 8 });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35 }}
      style={{ height: "100%" }}
    >
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        style={{ textDecoration: "none", display: "flex", height: "100%" }}
      >
        <div
          onMouseMove={onMove}
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => { setHovering(false); setTilt({ x: 0, y: 0 }); }}
          style={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: "0.65rem",
            padding: "1.25rem",
            position: "relative",
            borderRadius: 14,
            background: "var(--bg-glass)",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
            border: `1px solid ${hovering ? accent + "44" : "var(--border)"}`,
            transform: hovering
              ? `perspective(900px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateY(-5px)`
              : "perspective(900px) rotateX(0deg) rotateY(0deg) translateY(0px)",
            transition: hovering
              ? "transform 0.08s ease, box-shadow 0.2s ease, border-color 0.2s ease"
              : "transform 0.45s cubic-bezier(0.23,1,0.32,1), box-shadow 0.25s ease, border-color 0.2s ease",
            boxShadow: hovering
              ? `0 0 0 1px ${accent}30, 0 16px 48px ${accent}18, 0 6px 20px rgba(0,0,0,0.3)`
              : "0 4px 20px rgba(0,0,0,0.2)",
          }}
        >
          {/* Shimmer */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 14,
              background: hovering
                ? `radial-gradient(circle at ${50 + tilt.y * 4}% ${50 - tilt.x * 4}%, rgba(255,255,255,0.06) 0%, transparent 65%)`
                : "none",
              pointerEvents: "none",
            }}
          />

          {/* Source + date row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem", position: "relative" }}>
            <span
              style={{
                fontSize: "0.62rem", fontWeight: 700, textTransform: "uppercase",
                letterSpacing: "0.08em", color: accent,
                background: `${accent}18`, border: `1px solid ${accent}35`,
                borderRadius: 4, padding: "2px 7px", flexShrink: 0,
              }}
            >
              {item.source}
            </span>
            <span style={{ fontSize: "0.68rem", color: "var(--text3)", whiteSpace: "nowrap" }}>{item.published}</span>
          </div>

          {/* Title */}
          <p style={{
            fontSize: "0.85rem", fontWeight: 600, color: "var(--text)",
            lineHeight: 1.45, margin: 0, flex: 1, position: "relative",
          }}>
            {item.title}
          </p>

          {/* Summary */}
          {item.summary && (
            <p style={{ fontSize: "0.78rem", color: "var(--text2)", lineHeight: 1.6, margin: 0, position: "relative" }}>
              {item.summary.slice(0, 160)}{item.summary.length > 160 ? "…" : ""}
            </p>
          )}

          {/* Authors */}
          {item.authors && (
            <p style={{ fontSize: "0.7rem", color: "var(--text3)", margin: 0, position: "relative" }}>
              {item.authors}
            </p>
          )}

          {/* Read more */}
          <div style={{
            display: "flex", alignItems: "center", gap: "0.3rem",
            color: accent, fontSize: "0.75rem", fontWeight: 600,
            position: "relative", marginTop: "auto",
          }}>
            Read more
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2 10L10 2M10 2H5M10 2v5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </a>
    </motion.div>
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
    <section id="news" style={{ background: "var(--bg-section)", padding: "0 0 2rem" }}>
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
                onClick={() => setTab(t)}
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

          {/* States */}
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
              background: "var(--bg-glass)", backdropFilter: "blur(14px)",
              border: "1px solid var(--border2)", borderRadius: 14,
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

          {/* Cards grid — align-items stretch keeps card heights equal in each row */}
          {!loading && !error && !noKey && items.length > 0 && (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: "1rem",
              alignItems: "stretch",
            }}>
              {items.map((item, i) => (
                <NewsCard key={item.url} item={item} accent={accent} delay={i * 0.05} />
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
}
