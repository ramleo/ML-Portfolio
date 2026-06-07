"use client";

import { useRef, useEffect, useState, Suspense, lazy } from "react";
import { useInView } from "framer-motion";
import MagneticButton from "./MagneticButton";
import { useIsDark } from "../hooks/useIsDark";

const NeuralNetwork3D = lazy(() => import("./NeuralNetwork3D"));

function useTypewriter(text: string, speed = 110) {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    setDisplayed("");
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);
  return displayed;
}

function useCountUp(target: number, inView: boolean, duration = 1400) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!inView) return;
    setValue(0);
    let elapsed = 0;
    const interval = 16;
    const id = setInterval(() => {
      elapsed += interval;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(target * eased);
      if (progress >= 1) clearInterval(id);
    }, interval);
    return () => clearInterval(id);
  }, [inView, target, duration]);
  return value;
}

const STATS = [
  { target: 2,    suffix: "",   label: "Live Platforms" },
  { target: 4,    suffix: "",   label: "Datasets" },
  { target: 96.7, suffix: "%",  label: "Best Accuracy" },
  { target: null, label: "Pipeline", static: "Auto-ML" },
] as const;

function StatCard({ stat, inView }: { stat: typeof STATS[number]; inView: boolean }) {
  const count = useCountUp(
    "target" in stat && stat.target !== null ? stat.target : 0,
    inView
  );

  let display: string;
  if ("static" in stat && stat.static) {
    display = stat.static;
  } else if ("target" in stat && stat.target !== null) {
    const t = stat.target;
    display = Number.isInteger(t)
      ? `${Math.round(count)}${stat.suffix}`
      : `${count.toFixed(1)}${stat.suffix}`;
  } else {
    display = "";
  }

  return (
    <div
      style={{
        textAlign: "center",
        padding: "0.9rem 1.5rem",
        borderRadius: 14,
        background: "var(--border)",
        border: "1px solid var(--border2)",
        minWidth: 100,
      }}
    >
      <div
        style={{
          fontSize: "2rem",
          fontWeight: 800,
          color: "var(--text)",
          lineHeight: 1.1,
          letterSpacing: "-0.02em",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {display}
      </div>
      <div style={{ fontSize: "0.7rem", color: "var(--text3)", marginTop: 4 }}>
        {stat.label}
      </div>
    </div>
  );
}

export default function Hero() {
  const statsRef = useRef<HTMLDivElement>(null);
  const inView = useInView(statsRef, { once: true, margin: "-80px" });
  const typed   = useTypewriter("AIRaML");
  const isDark  = useIsDark();

  return (
    <section
      className="hero-bg"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "6rem 1.5rem 4rem",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* 3D Neural Network — full hero backdrop */}
      <div style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none" }}>
        <Suspense fallback={null}>
          <NeuralNetwork3D />
        </Suspense>
      </div>

      {/* Animated gradient blobs */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        <div style={{
          position: "absolute", width: "65%", height: "65%", top: "5%", left: "0%",
          background: `radial-gradient(ellipse, rgba(99,102,241,${isDark ? 0.13 : 0.22}) 0%, transparent 70%)`,
          animation: "blob1 9s ease-in-out infinite",
        }} />
        <div style={{
          position: "absolute", width: "55%", height: "55%", top: "15%", right: "0%",
          background: `radial-gradient(ellipse, rgba(56,189,248,${isDark ? 0.09 : 0.18}) 0%, transparent 70%)`,
          animation: "blob2 11s ease-in-out infinite 2s",
        }} />
        <div style={{
          position: "absolute", width: "45%", height: "45%", bottom: "10%", left: "35%",
          background: `radial-gradient(ellipse, rgba(52,211,153,${isDark ? 0.07 : 0.14}) 0%, transparent 70%)`,
          animation: "blob3 13s ease-in-out infinite 4s",
        }} />
      </div>

      {/* Subtle grid overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          maskImage: "radial-gradient(ellipse 80% 60% at 50% 50%, black 40%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 50%, black 40%, transparent 100%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          maxWidth: 760,
          width: "100%",
          textAlign: "center",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.3rem 1rem",
            borderRadius: 9999,
            border: "1px solid var(--border2)",
            background: "var(--border)",
            color: "var(--text2)",
            fontSize: "0.75rem",
            fontWeight: 500,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            marginBottom: "1.5rem",
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#34d399",
              boxShadow: "0 0 6px #34d399",
            }}
          />
          Machine Learning Engineer
        </div>

        {/* Headline with typewriter */}
        <h1
          style={{
            fontSize: "clamp(4rem, 9vw, 6rem)",
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: "-0.04em",
            marginBottom: "1.25rem",
            color: "var(--text)",
            minHeight: "1.1em",
          }}
        >
          <span className="gradient-text">
            {typed}
            <span
              style={{
                display: "inline-block",
                width: "0.05em",
                height: "0.85em",
                background: "currentColor",
                marginLeft: "0.06em",
                verticalAlign: "middle",
                animation: "blink 1s step-end infinite",
                opacity: typed.length < "AIRaML".length ? 1 : 0,
              }}
            />
          </span>
        </h1>

        <p
          style={{
            fontSize: "clamp(1rem, 2.5vw, 1.2rem)",
            color: "var(--text2)",
            lineHeight: 1.7,
            maxWidth: 560,
            margin: "0 auto 2.5rem",
          }}
        >
          I build end-to-end ML pipelines — from raw data to deployed prediction APIs
          with interactive frontends. Every project below is live and testable.
        </p>

        {/* Stats row with count-up */}
        <div
          ref={statsRef}
          style={{
            display: "flex",
            gap: "1rem",
            justifyContent: "center",
            flexWrap: "wrap",
            marginBottom: "2.5rem",
          }}
        >
          {STATS.map((s) => (
            <StatCard key={s.label} stat={s} inView={inView} />
          ))}
        </div>

        {/* CTAs */}
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
          <MagneticButton>
          <a
            href="#projects"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.75rem 1.75rem",
              borderRadius: 9999,
              background: "linear-gradient(135deg, #6366f1, #38bdf8)",
              color: "#fff",
              fontWeight: 600,
              fontSize: "0.95rem",
              textDecoration: "none",
              transition: "opacity 0.15s, transform 0.15s",
              boxShadow: "0 4px 20px rgba(99, 102, 241, 0.3)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = "0.9";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = "1";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            View Projects
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 3v10M3 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
          </MagneticButton>
          <MagneticButton>
          <a
            href="https://github.com/ramleo"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.75rem 1.75rem",
              borderRadius: 9999,
              border: "1px solid var(--border2)",
              background: "var(--border)",
              color: "var(--text)",
              fontWeight: 600,
              fontSize: "0.95rem",
              textDecoration: "none",
              transition: "background 0.15s, border-color 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--text3)")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border2)")}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
            </svg>
            GitHub
          </a>
          </MagneticButton>
        </div>
      </div>

      {/* Dark gradient at bottom — prevents hard edge blending into page */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 140,
          background: "linear-gradient(to bottom, transparent, var(--bg))",
          pointerEvents: "none",
        }}
      />
    </section>
  );
}
