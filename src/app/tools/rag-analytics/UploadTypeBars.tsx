"use client";

import { motion } from "framer-motion";
import { File, FileText, Image as ImageIcon, Sheet, Video, type LucideIcon } from "lucide-react";
import EmptyState from "./EmptyState";

const TYPE_META: Record<string, { label: string; icon: LucideIcon; color: string }> = {
  pdf: { label: "PDF", icon: FileText, color: "#38bdf8" },
  image: { label: "Image", icon: ImageIcon, color: "#a78bfa" },
  csv: { label: "CSV", icon: Sheet, color: "#34d399" },
  video: { label: "Video", icon: Video, color: "#f472b6" },
  unknown: { label: "Other", icon: File, color: "#94a3b8" },
};

export default function UploadTypeBars({ data }: { data: Record<string, number> }) {
  const entries = Object.entries(data);
  const max = Math.max(1, ...entries.map(([, v]) => v));

  if (entries.length === 0) return <EmptyState label="No uploads yet" icon={File} />;

  return (
    <div className="flex flex-col gap-2.5">
      {entries.map(([type, count], i) => {
        const meta = TYPE_META[type] ?? TYPE_META.unknown;
        const Icon = meta.icon;
        const pct = Math.max(4, Math.round((count / max) * 100));
        return (
          <div key={type} className="flex items-center gap-2.5 text-[11px]">
            <Icon size={14} style={{ color: meta.color }} className="shrink-0" />
            <span className="w-14 shrink-0" style={{ color: "rgba(255,255,255,0.6)" }}>{meta.label}</span>
            <div className="flex-1 h-3.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ delay: i * 0.08, duration: 0.6, ease: "easeOut" }}
                style={{ height: "100%", background: meta.color, borderRadius: 9999 }} />
            </div>
            <span className="w-6 text-right shrink-0" style={{ color: "rgba(255,255,255,0.5)" }}>{count}</span>
          </div>
        );
      })}
    </div>
  );
}