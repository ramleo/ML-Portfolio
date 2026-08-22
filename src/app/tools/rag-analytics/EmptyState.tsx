"use client";

import { Inbox, type LucideIcon } from "lucide-react";

export default function EmptyState({ label, icon: Icon = Inbox }: { label: string; icon?: LucideIcon }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
      <Icon size={22} style={{ color: "var(--text3)" }} />
      <span className="text-[11px]" style={{ color: "var(--text3)" }}>{label}</span>
    </div>
  );
}