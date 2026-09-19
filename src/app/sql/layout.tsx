import type { Metadata } from "next";
import WorldShell from "@/components/world/WorldShell";
import WorldNav, { type WorldNavItem } from "@/components/world/WorldNav";
import { SQL_ACCENT, SQL_ACCENT2, TOOL_HREF } from "./theme";

export const metadata: Metadata = {
  title: "Text-to-SQL — Ask Your Database",
  description:
    "The Text-to-SQL platform inside AIRaML: ask a question in plain English and get SQL, run live against a real database, with an LLM explanation of the query and results.",
};

const navItems: WorldNavItem[] = [
  { label: "Overview", href: "/sql" },
  { label: "Open the tool", href: TOOL_HREF, dot: "#34d399" },
];

const icon = (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
    <ellipse cx="12" cy="6" rx="8" ry="3" />
    <path d="M4 6v12c0 1.66 3.58 3 8 3s8-1.34 8-3V6M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3" strokeLinecap="round" />
  </svg>
);

export default function SqlLayout({ children }: { children: React.ReactNode }) {
  return (
    <WorldShell nav={
      <WorldNav wordmark="Text-to-SQL" wordmarkHref="/sql" icon={icon}
        accent={SQL_ACCENT} accent2={SQL_ACCENT2} items={navItems} />
    }>
      {children}
    </WorldShell>
  );
}
