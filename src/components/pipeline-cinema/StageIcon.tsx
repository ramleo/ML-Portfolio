"use client";

import { motion } from "framer-motion";

export type CharacterState = "idle" | "active" | "done";
export type StageKind = "preprocessing" | "feature-eng" | "feature-select" | "automl";

interface Props {
  stage: StageKind;
  state: CharacterState;
  accent: string;
}

const INF = Infinity;

function Gear({ cx, cy, r, stroke, spin }: { cx: number; cy: number; r: number; stroke: string; spin: boolean }) {
  return (
    <motion.g animate={spin ? { rotate: 360 } : {}} transition={{ repeat: spin ? INF : 0, duration: 2, ease: "linear" }} style={{ originX: `${cx}px`, originY: `${cy}px` }}>
      <circle cx={cx} cy={cy} r={r} fill="#0f2744" stroke={stroke} strokeWidth={1.2} />
      {Array.from({ length: 6 }, (_, i) => {
        const a = (i * 60 * Math.PI) / 180;
        const tx = cx + Math.cos(a) * (r + 3), ty = cy + Math.sin(a) * (r + 3);
        return <rect key={i} x={tx - 2} y={ty - 2.5} width={4} height={5} rx={0.5} fill="#0f2744" stroke={stroke} strokeWidth={0.6} transform={`rotate(${i * 60},${tx},${ty})`} />;
      })}
    </motion.g>
  );
}

function PreprocessingIcon({ state, accent }: { state: CharacterState; accent: string }) {
  const active = state === "active", done = state === "done";
  const gc = done ? "#22c55e" : accent;
  return (
    <>
      <path d="M15,10 L65,10 L55,55 L25,55 Z" fill="#0f2744" stroke={gc} strokeWidth={1.5} />
      {[{ x: 22, y: 18 }, { x: 35, y: 14 }, { x: 48, y: 20 }].map((p, i) => (
        <motion.rect key={i} x={p.x} y={p.y} width={8} height={8} rx={1} fill={done ? accent : "#ef4444"} opacity={0.85}
          animate={active ? { y: [0, 5, 10], opacity: [0.85, 0.5, 0.85] } : {}}
          transition={{ repeat: active ? INF : 0, duration: 1.5, delay: i * 0.2 }} />
      ))}
      {[27, 36, 45].map((x, i) => (
        <motion.rect key={i} x={x} y={60} width={8} height={8} rx={1} fill={done ? "#22c55e" : accent}
          animate={active ? { opacity: [0.5, 1, 0.5] } : {}}
          transition={{ repeat: active ? INF : 0, duration: 1, delay: i * 0.15 }} />
      ))}
      <Gear cx={10} cy={35} r={8} stroke={gc} spin={active} />
      <Gear cx={70} cy={35} r={8} stroke={gc} spin={active} />
      {done && (
        <motion.path d="M30,75 L40,85 L55,68" stroke="#22c55e" strokeWidth={3} fill="none" strokeLinecap="round"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5 }} />
      )}
    </>
  );
}

function FeatureEngIcon({ state, accent }: { state: CharacterState; accent: string }) {
  const active = state === "active", done = state === "done";
  return (
    <>
      {[28, 42].map((y, i) => (
        <motion.rect key={i} x={5} y={y} width={8} height={8} rx={1} fill="#1e3a5f" stroke={accent} strokeWidth={0.8}
          animate={active ? { x: [0, 4, 0] } : {}}
          transition={{ repeat: active ? INF : 0, duration: 1.2, delay: i * 0.3 }} />
      ))}
      <rect x={20} y={20} width={40} height={45} rx={4} fill="#0f2744" stroke={accent} strokeWidth={1.5} />
      <Gear cx={40} cy={42} r={10} stroke={accent} spin={active} />
      <motion.path d="M36,38 L44,38 M40,34 L40,42" stroke={accent} strokeWidth={1.5} strokeLinecap="round"
        animate={active ? { opacity: [1, 0.3, 1] } : {}} transition={{ repeat: active ? INF : 0, duration: 0.8 }} />
      {[24, 36, 48].map((y, i) => (
        <motion.rect key={i} x={67} y={y} width={8} height={8} rx={1} fill={done ? accent : "#1e3a5f"} stroke={accent} strokeWidth={0.8}
          initial={{ opacity: 0, x: -5 }} animate={active || done ? { opacity: 1, x: 0 } : { opacity: 0.3, x: -5 }}
          transition={{ delay: i * 0.2, duration: 0.4 }} />
      ))}
      {done && [{ x: 72, y: 18 }, { x: 78, y: 30 }].map((p, i) => (
        <motion.path key={i} d="M0,-5 L1,-1 L5,0 L1,1 L0,5 L-1,1 L-5,0 L-1,-1 Z" fill={accent}
          transform={`translate(${p.x},${p.y})`} initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ delay: i * 0.15, duration: 0.3 }} />
      ))}
    </>
  );
}

function FeatureSelectIcon({ state, accent }: { state: CharacterState; accent: string }) {
  const active = state === "active", done = state === "done";
  const bars = [30, 22, 26, 18, 14, 20];
  return (
    <>
      <motion.g animate={active ? { y: [-1, 1, -1] } : {}} transition={{ repeat: active ? INF : 0, duration: 1.5 }}>
        <circle cx={40} cy={20} r={12} fill="#0f2744" stroke={accent} strokeWidth={2} />
        <line x1={49} y1={29} x2={58} y2={38} stroke={accent} strokeWidth={2.5} strokeLinecap="round" />
        {done && (
          <motion.path d="M34,20 L38,24 L46,16" stroke="#22c55e" strokeWidth={2} fill="none" strokeLinecap="round"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.4 }} />
        )}
      </motion.g>
      {bars.map((w, i) => {
        const keep = i < 3;
        const fill = active || done ? (keep ? accent : "#ef4444") : "#1e3a5f";
        const tx = active || done ? (keep ? -15 : 15) : 0;
        const op = active || done ? (keep ? 1 : 0.4) : 1;
        return (
          <motion.rect key={i} x={25} y={40 + i * 7} width={w} height={4} rx={1} fill={fill}
            animate={{ x: tx, opacity: op }} transition={{ delay: i * 0.1, duration: 0.4 }} />
        );
      })}
      <rect x={5} y={82} width={28} height={14} rx={3} fill="rgba(34,197,94,0.15)" stroke="#22c55e" strokeWidth={1} />
      <text x={19} y={91} fontSize={6} fill="#22c55e" textAnchor="middle" fontWeight="bold">KEEP</text>
      <rect x={47} y={82} width={28} height={14} rx={3} fill="rgba(239,68,68,0.15)" stroke="#ef4444" strokeWidth={1} />
      <text x={61} y={91} fontSize={6} fill="#ef4444" textAnchor="middle" fontWeight="bold">DROP</text>
    </>
  );
}

function AutoMLIcon({ state, accent }: { state: CharacterState; accent: string }) {
  const active = state === "active", done = state === "done";
  const racks = [
    { x: 8, label: "RF", pct: 82, color: "#38bdf8" },
    { x: 26, label: "XGB", pct: 85, color: accent },
    { x: 44, label: "LGBM", pct: 84, color: "#34d399" },
    { x: 62, label: "LR", pct: 78, color: "#64748b" },
  ];
  const trackH = 28, trackY = 71;
  return (
    <>
      {racks.map((r, ri) => {
        const winner = ri === 1;
        const barH = (r.pct / 100) * trackH;
        return (
          <g key={ri}>
            <rect x={r.x} y={15} width={14} height={48} rx={2} fill="#0f2744"
              stroke={done && winner ? accent : "#1e3a5f"} strokeWidth={done && winner ? 1.5 : 1} />
            {[0, 1].map(li => (
              <motion.circle key={li} cx={r.x + 4 + li * 5} cy={20} r={1.5}
                fill={active ? (li === 0 ? "#22c55e" : accent) : "#1e3a5f"}
                animate={active ? { opacity: [1, 0.2, 1] } : {}}
                transition={{ repeat: active ? INF : 0, duration: 0.8, delay: (ri + li) * 0.12 }} />
            ))}
            <text x={r.x + 7} y={69} fontSize={5.5} fill={done && !winner ? "#64748b" : accent} textAnchor="middle" fontWeight="bold">{r.label}</text>
            <rect x={r.x + 2} y={trackY} width={10} height={trackH} rx={1} fill="#0f2744" stroke="#1e3a5f" strokeWidth={0.5} />
            <motion.rect x={r.x + 2} y={trackY + trackH - barH} width={10} height={barH} rx={1}
              fill={r.color} opacity={done && !winner ? 0.4 : 1}
              initial={{ scaleY: 0 }} animate={active || done ? { scaleY: 1 } : { scaleY: 0 }}
              style={{ transformOrigin: `${r.x + 7}px ${trackY + trackH}px` }}
              transition={{ delay: ri * 0.15, duration: 0.5 }} />
            {done && winner && (
              <motion.path d="M-6,0 L-3,-5 L0,-2 L3,-5 L6,0 Z" fill="#fbbf24"
                transform={`translate(${r.x + 7},12)`} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.3 }} />
            )}
          </g>
        );
      })}
    </>
  );
}

const LABELS: Record<StageKind, string> = {
  "preprocessing": "Preprocessing",
  "feature-eng": "Feature Eng",
  "feature-select": "Feature Select",
  "automl": "AutoML",
};

export default function StageIcon({ stage, state, accent }: Props) {
  return (
    <div style={{ width: 80, position: "relative" }}>
      <svg viewBox="0 0 80 100" width={80} height={100}>
        {stage === "preprocessing" && <PreprocessingIcon state={state} accent={accent} />}
        {stage === "feature-eng" && <FeatureEngIcon state={state} accent={accent} />}
        {stage === "feature-select" && <FeatureSelectIcon state={state} accent={accent} />}
        {stage === "automl" && <AutoMLIcon state={state} accent={accent} />}
        <text x={40} y={95} fontSize={8} fill={accent} textAnchor="middle" fontWeight="bold">{LABELS[stage]}</text>
      </svg>
    </div>
  );
}