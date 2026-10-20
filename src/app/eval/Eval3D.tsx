"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Html, Line, Instances, Instance } from "@react-three/drei";

type Controls = React.ComponentRef<typeof OrbitControls>;

/** Q4 — interactive 3D scatter of recent LLM calls. Three continuous measures at
 * once (latency × tokens × cost) is exactly the case 3D earns its keep, and only
 * with the depth cues the research calls for: perspective projection (not
 * isometric), orbit rotation, drop-lines to the floor, and camera-facing labels.
 * Each point is one call; colour = provider; errors are red. Content-free. */

interface Call {
  ts: string | null; provider: string | null; model: string | null; status: string | null;
  latency_ms: number | null; cost_usd: number | null; input_tokens: number | null; output_tokens: number | null;
}

type MetricKey = "latency_ms" | "tokens" | "cost_usd" | "input_tokens" | "output_tokens";
const METRICS: Record<MetricKey, { label: string; get: (c: Call) => number | null; fmt: (v: number) => string }> = {
  latency_ms: { label: "Latency", get: (c) => c.latency_ms, fmt: (v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}s` : `${Math.round(v)}ms`) },
  tokens: { label: "Tokens", get: (c) => (c.input_tokens ?? 0) + (c.output_tokens ?? 0), fmt: (v) => Math.round(v).toLocaleString() },
  cost_usd: { label: "Cost", get: (c) => c.cost_usd, fmt: (v) => (v < 0.01 ? `$${v.toFixed(4)}` : `$${v.toFixed(2)}`) },
  input_tokens: { label: "Input tokens", get: (c) => c.input_tokens, fmt: (v) => Math.round(v).toLocaleString() },
  output_tokens: { label: "Output tokens", get: (c) => c.output_tokens, fmt: (v) => Math.round(v).toLocaleString() },
};

// Fixed categorical order (dataviz: assign, never cycle); error is the reserved red.
const PROVIDER_COLORS: Record<string, string> = {
  cohere: "#6366f1", gemini: "#0ea5e9", mistral: "#f59e0b", groq: "#10b981",
  claude: "#a855f7", openai: "#14b8a6",
};
const ERR = "#f87171";
const S = 10; // cube edge in world units
const AXES: ("x" | "y" | "z")[] = ["x", "y", "z"];

function providerColor(p: string | null): string {
  return PROVIDER_COLORS[(p ?? "").toLowerCase()] ?? "#94a3b8";
}

interface Pt { call: Call; x: number; y: number; z: number; color: string }

function Scene({ pts, axisLabels, ink, controls }: { pts: Pt[]; axisLabels: Record<"x" | "y" | "z", string>; ink: string; controls: React.Ref<Controls> }) {
  const [hover, setHover] = useState<Pt | null>(null);
  const corner: Record<"x" | "y" | "z", [number, number, number]> = {
    x: [S, 0, 0], y: [0, S, 0], z: [0, 0, S],
  };
  // Every drop-line (point → floor) packed into one position buffer.
  const dropSegs = useMemo(() => {
    const arr = new Float32Array(pts.length * 6);
    pts.forEach((p, i) => arr.set([p.x, 0, p.z, p.x, p.y, p.z], i * 6));
    return arr;
  }, [pts]);
  return (
    <>
      <ambientLight intensity={0.9} />
      <pointLight position={[15, 20, 15]} intensity={0.6} />
      {/* floor grid for depth reference */}
      <gridHelper args={[S, 10, ink, ink]} position={[S / 2, 0, S / 2]} />
      {/* three axes from the origin corner */}
      {AXES.map((a) => (
        <Line key={a} points={[[0, 0, 0], corner[a]]} color={ink} lineWidth={1.5} />
      ))}
      {AXES.map((a) => (
        <Html key={`lbl-${a}`} position={[corner[a][0] * 1.08, corner[a][1] * 1.08 + (a === "y" ? 0.3 : 0.2), corner[a][2] * 1.08]} center style={{ pointerEvents: "none" }}>
          <div style={{ fontSize: 11, color: "var(--text3)", whiteSpace: "nowrap", fontWeight: 600 }}>{axisLabels[a]}</div>
        </Html>
      ))}
      {/* all drop-lines in ONE geometry (not N Line objects — that was the stall) */}
      {dropSegs.length > 0 && (
        <lineSegments>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[dropSegs, 3]} />
          </bufferGeometry>
          <lineBasicMaterial color={ink} transparent opacity={0.22} />
        </lineSegments>
      )}
      {/* all points in ONE instanced mesh — one draw call, per-instance colour */}
      <Instances limit={pts.length} range={pts.length}>
        <sphereGeometry args={[0.18, 12, 12]} />
        <meshStandardMaterial />
        {pts.map((p, i) => (
          <Instance key={i} position={[p.x, p.y, p.z]} color={p.color}
            onPointerOver={(e) => { e.stopPropagation(); setHover(p); }}
            onPointerOut={() => setHover(null)} />
        ))}
      </Instances>
      {hover && (
        <Html position={[hover.x, hover.y + 0.4, hover.z]} center style={{ pointerEvents: "none" }}>
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border2)", borderRadius: 8, padding: "6px 9px", fontSize: 11.5, whiteSpace: "nowrap", boxShadow: "0 6px 18px rgba(0,0,0,0.3)", color: "var(--text)" }}>
            <strong>{hover.call.provider ?? "—"}</strong> {hover.call.model ?? ""}{hover.call.status !== "ok" && <span style={{ color: ERR }}> · error</span>}
          </div>
        </Html>
      )}
      <OrbitControls ref={controls} enablePan={false} minDistance={8} maxDistance={40} target={[S / 2, S / 2, S / 2]} />
    </>
  );
}

const card: React.CSSProperties = { background: "var(--bg-card)", border: "1px solid var(--border2)", borderRadius: "var(--radius-card)", padding: "18px 20px" };

export default function Eval3D({ days }: { days: number }) {
  const [calls, setCalls] = useState<Call[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [ax, setAx] = useState<Record<"x" | "y" | "z", MetricKey>>({ x: "latency_ms", y: "tokens", z: "cost_usd" });
  const controls = useRef<Controls>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      setCalls(null); setFailed(false);
      try {
        const res = await fetch(`/api/eval/calls?days=${days}&limit=400`, { cache: "no-store" });
        if (!active) return;
        if (res.ok) setCalls((await res.json()).rows as Call[]); else setFailed(true);
      } catch { if (active) setFailed(true); }
    })();
    return () => { active = false; };
  }, [days]);

  const { pts, axisLabels, insight } = useMemo(() => {
    const rows = calls ?? [];
    const scale = (key: MetricKey) => {
      const vals = rows.map((c) => METRICS[key].get(c)).filter((v): v is number => typeof v === "number");
      const lo = vals.length ? Math.min(...vals) : 0, hi = vals.length ? Math.max(...vals) : 1;
      const span = hi - lo || 1;
      return { to: (v: number | null) => (v == null ? 0 : ((v - lo) / span) * S), lo, hi };
    };
    const sx = scale(ax.x), sy = scale(ax.y), sz = scale(ax.z);
    const points: Pt[] = rows
      .filter((c) => [ax.x, ax.y, ax.z].every((k) => typeof METRICS[k].get(c) === "number"))
      .map((c) => ({
        call: c, x: sx.to(METRICS[ax.x].get(c)), y: sy.to(METRICS[ax.y].get(c)), z: sz.to(METRICS[ax.z].get(c)),
        color: c.status !== "ok" ? ERR : providerColor(c.provider),
      }));
    const lab = (k: MetricKey, s: { lo: number; hi: number }) => `${METRICS[k].label} (${METRICS[k].fmt(s.lo)}–${METRICS[k].fmt(s.hi)})`;

    // Data-driven read of the plot so the user doesn't have to interpret it.
    let insight = "";
    if (rows.length) {
      const prov = new Map<string, number>();
      rows.forEach((c) => { if (c.status === "ok") prov.set(c.provider ?? "?", (prov.get(c.provider ?? "?") ?? 0) + 1); });
      const top = [...prov.entries()].sort((a, b) => b[1] - a[1])[0];
      const errs = rows.filter((c) => c.status !== "ok").length;
      let peak: { v: number; who: string } | null = null;
      rows.forEach((c) => { const v = METRICS[ax.y].get(c); if (v != null && (!peak || v > peak.v)) peak = { v, who: c.provider ?? "?" }; });
      const parts = [`${points.length} calls plotted.`];
      if (top) parts.push(`${top[0]} runs the most (${top[1]}).`);
      if (peak) parts.push(`Highest ${METRICS[ax.y].label.toLowerCase()}: a ${(peak as { who: string }).who} call at ${METRICS[ax.y].fmt((peak as { v: number }).v)}.`);
      parts.push(errs ? `${errs} errored (red).` : "No errors.");
      insight = parts.join(" ");
    }
    return { pts: points, axisLabels: { x: lab(ax.x, sx), y: lab(ax.y, sy), z: lab(ax.z, sz) }, insight };
  }, [calls, ax]);

  const providersPresent = useMemo(() => {
    const set = new Map<string, string>();
    for (const p of pts) if (p.call.status === "ok") set.set(p.call.provider ?? "unknown", p.color);
    return [...set.entries()];
  }, [pts]);

  const sel = (which: "x" | "y" | "z") => (
    <label style={{ fontSize: 12, color: "var(--text2)", display: "inline-flex", gap: 5, alignItems: "center" }}>
      {which.toUpperCase()}
      <select value={ax[which]} onChange={(e) => setAx((a) => ({ ...a, [which]: e.target.value as MetricKey }))}
        style={{ fontSize: 12, padding: "0.2rem 0.4rem", borderRadius: 8, border: "1px solid var(--border2)", background: "var(--bg-card)", color: "var(--text)", cursor: "pointer" }}>
        {(Object.keys(METRICS) as MetricKey[]).map((k) => <option key={k} value={k}>{METRICS[k].label}</option>)}
      </select>
    </label>
  );

  return (
    <div style={card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
        <h3 style={{ fontFamily: "var(--type-display)", fontSize: 15, margin: 0, color: "var(--text)" }}>
          Call explorer <span style={{ color: "var(--text3)", fontWeight: 400 }}>· drag to rotate, scroll to zoom</span>
        </h3>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          {sel("x")}{sel("y")}{sel("z")}
          <button type="button" onClick={() => controls.current?.reset()}
            style={{ padding: "0.25rem 0.7rem", fontSize: 12, fontWeight: 600, cursor: "pointer", borderRadius: 9999, border: "1px solid var(--border2)", background: "transparent", color: "var(--text2)" }}>
            Reset view
          </button>
        </div>
      </div>

      <p style={{ fontSize: 12.5, color: "var(--text2)", margin: "0 0 12px", lineHeight: 1.5 }}>
        Each dot is one LLM call, colored by provider (errors in red).
        {" "}<strong>Left→right:</strong> {METRICS[ax.x].label.toLowerCase()}.
        {" "}<strong>Bottom→top:</strong> {METRICS[ax.y].label.toLowerCase()}.
        {" "}<strong>Near→far:</strong> {METRICS[ax.z].label.toLowerCase()}.
        {" "}Dots toward the far-upper-right are high on all three; lone dots away from the pack are outliers. Hover a dot for its model.
      </p>
      {insight && <p style={{ fontSize: 12.5, color: "var(--text)", margin: "0 0 12px", fontWeight: 500 }}>{insight}</p>}

      {failed ? <p style={{ fontSize: 13, color: ERR, margin: 0 }}>Couldn&apos;t load calls.</p>
        : !calls ? <p style={{ fontSize: 13, color: "var(--text2)", margin: 0 }}>Loading…</p>
        : pts.length === 0 ? <p style={{ fontSize: 13, color: "var(--text3)", margin: 0 }}>No calls with these three measures in the window.</p>
        : (
          <>
            <div style={{ height: 440, borderRadius: 10, overflow: "hidden", background: "var(--bg)" }}>
              <Canvas camera={{ position: [S * 1.9, S * 1.5, S * 1.9], fov: 60 }} dpr={[1, 2]}>
                <Scene pts={pts} axisLabels={axisLabels} ink="#8b93a7" controls={controls} />
              </Canvas>
            </div>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 10, fontSize: 12, color: "var(--text2)" }}>
              <span style={{ color: "var(--text3)" }}>{pts.length} calls ·</span>
              {providersPresent.map(([name, color]) => (
                <span key={name} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 9, height: 9, borderRadius: "50%", background: color, display: "inline-block" }} />{name}
                </span>
              ))}
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 9, height: 9, borderRadius: "50%", background: ERR, display: "inline-block" }} />error
              </span>
            </div>
          </>
        )}
    </div>
  );
}
