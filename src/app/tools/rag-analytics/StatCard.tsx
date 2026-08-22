"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { useCountUp } from "./useCountUp";

type Props = {
  icon: LucideIcon;
  label: string;
  value: number;
  suffix?: string;
  decimals?: number;
  sub?: string;
  accent: string;
  index: number;
};

export default function StatCard({ icon: Icon, label, value, suffix = "", decimals = 0, sub, accent, index }: Props) {
  const animated = useCountUp(value);
  const display = decimals > 0 ? animated.toFixed(decimals) : Math.round(animated).toLocaleString();

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4, ease: "easeOut" }}
      whileHover={{ y: -3, boxShadow: `0 10px 30px -10px ${accent}70` }}
      className="rounded-2xl p-4"
      style={{ background: `linear-gradient(135deg, ${accent}18, rgba(255,255,255,0.02))`, border: `1px solid ${accent}30` }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-[9px] font-bold uppercase tracking-wide" style={{ color: "var(--text3)" }}>
          {label}
        </span>
        <Icon size={16} style={{ color: accent }} />
      </div>
      <div className="text-2xl font-bold" style={{ color: accent }}>
        {display}{suffix}
      </div>
      {sub && <div className="text-[10px] mt-1" style={{ color: "var(--text3)" }}>{sub}</div>}
    </motion.div>
  );
}