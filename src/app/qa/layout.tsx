import type { Metadata } from "next";
import WorldShell from "@/components/world/WorldShell";
import WorldNav, { type WorldNavItem } from "@/components/world/WorldNav";
import { STAGES, STATUS_COLOR, QA_ACCENT, QA_ACCENT2 } from "./theme";

export const metadata: Metadata = {
  title: "Testwright — QA Automation",
  description:
    "Testwright is the QA-automation platform inside AIRaML: describe a browser test in plain English and get a runnable Playwright TypeScript test with resilient locators. Free, own-site first.",
};

const navItems: WorldNavItem[] = STAGES.map((s) => ({
  label: s.label,
  href: s.href,
  dot: STATUS_COLOR[s.status],
}));

const flask = (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2">
    <path d="M9 3h6M10 3v5.5L5.5 17a2 2 0 0 0 1.8 3h9.4a2 2 0 0 0 1.8-3L14 8.5V3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function QaLayout({ children }: { children: React.ReactNode }) {
  return (
    <WorldShell nav={
      <WorldNav wordmark="Testwright" wordmarkHref="/qa" icon={flask}
        accent={QA_ACCENT} accent2={QA_ACCENT2} items={navItems} />
    }>
      {children}
    </WorldShell>
  );
}
