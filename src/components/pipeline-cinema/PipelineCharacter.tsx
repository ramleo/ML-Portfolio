"use client";

import { motion } from "framer-motion";

export type CharacterState = "idle" | "active" | "done";
export type StageKind = "preprocessing" | "feature-eng" | "feature-select" | "automl";

interface Props {
  stage: StageKind;
  state: CharacterState;
  accent: string;
}

const STAGE_LABELS: Record<StageKind, string> = {
  "preprocessing": "Preprocessing",
  "feature-eng": "Feature Eng",
  "feature-select": "Feature Select",
  "automl": "AutoML",
};

function Gear({ accent }: { accent: string }) {
  return (
    <motion.g
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
      style={{ originX: "40px", originY: "8px" }}
    >
      <circle cx="40" cy="8" r="5" fill="none" stroke={accent} strokeWidth="1.5" />
      <circle cx="40" cy="8" r="2" fill={accent} />
      {[0, 60, 120, 180, 240, 300].map((deg) => {
        const rad = (deg * Math.PI) / 180;
        const x1 = 40 + Math.cos(rad) * 4.5;
        const y1 = 8 + Math.sin(rad) * 4.5;
        const x2 = 40 + Math.cos(rad) * 7;
        const y2 = 8 + Math.sin(rad) * 7;
        return <line key={deg} x1={x1} y1={y1} x2={x2} y2={y2} stroke={accent} strokeWidth="2" strokeLinecap="round" />;
      })}
    </motion.g>
  );
}

function StageProp({ stage, state }: { stage: StageKind; state: CharacterState }) {
  const visible = state !== "idle";
  const opacity = visible ? 1 : 0;
  return (
    <motion.g animate={{ opacity }} transition={{ duration: 0.3 }}>
      {stage === "preprocessing" && (
        <g transform="translate(55, 50)">
          <line x1="0" y1="0" x2="0" y2="14" stroke="#888" strokeWidth="2" strokeLinecap="round" />
          <line x1="-5" y1="14" x2="5" y2="14" stroke="#888" strokeWidth="2" strokeLinecap="round" />
          <line x1="-4" y1="11" x2="4" y2="11" stroke="#888" strokeWidth="1.5" strokeLinecap="round" />
        </g>
      )}
      {stage === "feature-eng" && (
        <g transform="translate(54, 50)">
          <path d="M-2,0 L2,0 L4,4 L6,3 L7,5 L5,6 L6,8 L2,8 L0,4 Z" fill="#888" />
          <line x1="2" y1="8" x2="-4" y2="14" stroke="#888" strokeWidth="2" strokeLinecap="round" />
        </g>
      )}
      {stage === "feature-select" && (
        <g transform="translate(53, 48)">
          <circle cx="0" cy="0" r="5" fill="none" stroke="#888" strokeWidth="2" />
          <line x1="4" y1="4" x2="9" y2="9" stroke="#888" strokeWidth="2" strokeLinecap="round" />
        </g>
      )}
      {stage === "automl" && (
        <g transform="translate(55, 46)">
          <path d="M0,0 L-3,7 L1,7 L-2,14 L6,5 L2,5 L5,0 Z" fill="#888" />
        </g>
      )}
    </motion.g>
  );
}

export default function PipelineCharacter({ stage, state, accent }: Props) {
  const isIdle = state === "idle";
  const isActive = state === "active";
  const isDone = state === "done";

  return (
    <svg width="80" height="120" viewBox="0 0 80 120" overflow="visible">
      {/* Done state sparkles */}
      {isDone && [
        { dx: -22, dy: -10, delay: 0 },
        { dx: 22, dy: -10, delay: 0.15 },
        { dx: -14, dy: -26, delay: 0.3 },
        { dx: 14, dy: -26, delay: 0.1 },
      ].map(({ dx, dy, delay }, i) => (
        <motion.text
          key={i}
          x={40 + dx}
          y={32 + dy}
          fontSize="10"
          textAnchor="middle"
          fill={accent}
          animate={{ scale: [0, 1.5, 0], opacity: [0, 1, 0] }}
          transition={{ repeat: Infinity, duration: 1.2, delay, ease: "easeOut" }}
          style={{ originX: `${40 + dx}px`, originY: `${32 + dy}px` }}
        >★</motion.text>
      ))}

      {/* Gear above head when active */}
      {isActive && <Gear accent={accent} />}

      {/* Body group — breathing idle / sway active / jump done */}
      <motion.g
        style={{ originX: "40px", originY: "70px" }}
        animate={
          isIdle
            ? { scaleY: [1, 1.03, 1] }
            : isActive
            ? { rotate: [-3, 3, -3] }
            : { y: [0, -18, 0] }
        }
        transition={
          isDone
            ? { repeat: Infinity, duration: 0.6, ease: "easeInOut", type: "spring", stiffness: 200, damping: 10 }
            : { repeat: Infinity, duration: isActive ? 0.9 : 2.5, ease: "easeInOut" }
        }
      >
        {/* Head */}
        <circle cx="40" cy="32" r="20" fill="#f0e8d8" />
        {/* Hair */}
        <path d="M20,32 Q20,10 40,10 Q60,10 60,32 Q55,16 40,16 Q25,16 20,32 Z" fill="#1a1a2e" />
        {/* Eyes */}
        <motion.g
          animate={{ scaleY: [1, 0.1, 1] }}
          transition={{ repeat: Infinity, duration: 4, ease: "easeInOut", times: [0, 0.45, 0.55] }}
          style={{ originX: "40px", originY: "32px" }}
        >
          <circle cx="33" cy="33" r="3" fill="#1a1a2e" />
          <circle cx="47" cy="33" r="3" fill="#1a1a2e" />
          <circle cx="34" cy="32" r="1" fill="white" />
          <circle cx="48" cy="32" r="1" fill="white" />
        </motion.g>
        {/* Mouth */}
        {isDone
          ? <path d="M34,40 Q40,46 46,40" fill="none" stroke="#1a1a2e" strokeWidth="1.5" strokeLinecap="round" />
          : <path d="M35,40 Q40,43 45,40" fill="none" stroke="#1a1a2e" strokeWidth="1.5" strokeLinecap="round" />
        }
        {/* Neck */}
        <rect x="36" y="51" width="8" height="5" fill="#f0e8d8" />
        {/* Shirt/body */}
        <rect x="26" y="56" width="28" height="24" rx="4" fill={accent} />
        {/* Left arm */}
        <motion.g
          animate={
            isActive ? { rotate: [-30, 10, -30] } :
            isDone ? { rotate: -60 } : { rotate: 0 }
          }
          transition={isActive ? { repeat: Infinity, duration: 0.7, ease: "easeInOut" } : { duration: 0.3 }}
          style={{ originX: "26px", originY: "60px" }}
        >
          <rect x="18" y="58" width="8" height="16" rx="4" fill={accent} />
          <circle cx="22" cy="75" r="4" fill="#f0e8d8" />
        </motion.g>
        {/* Right arm */}
        <motion.g
          animate={
            isActive ? { rotate: [10, -30, 10] } :
            isDone ? { rotate: 60 } : { rotate: 0 }
          }
          transition={isActive ? { repeat: Infinity, duration: 0.7, ease: "easeInOut" } : { duration: 0.3 }}
          style={{ originX: "54px", originY: "60px" }}
        >
          <rect x="54" y="58" width="8" height="16" rx="4" fill={accent} />
          <circle cx="58" cy="75" r="4" fill="#f0e8d8" />
        </motion.g>
        {/* Legs */}
        <rect x="29" y="78" width="9" height="18" rx="4" fill="#1a1a2e" />
        <rect x="42" y="78" width="9" height="18" rx="4" fill="#1a1a2e" />
        {/* Shoes */}
        <ellipse cx="33" cy="96" rx="7" ry="4" fill="#111" />
        <ellipse cx="47" cy="96" rx="7" ry="4" fill="#111" />
      </motion.g>

      {/* Stage prop */}
      <StageProp stage={stage} state={state} />

      {/* Stage label */}
      <text x="40" y="115" fontSize="10" fontWeight="700" textAnchor="middle" fill={accent} fontFamily="sans-serif">
        {STAGE_LABELS[stage]}
      </text>
    </svg>
  );
}