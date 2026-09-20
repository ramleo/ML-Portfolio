import type { Metadata } from "next";
import WorldShell from "@/components/world/WorldShell";
import WorldNav, { type WorldNavItem } from "@/components/world/WorldNav";
import { EDA_ACCENT, EDA_ACCENT2, APP_HREF } from "./theme";

export const metadata: Metadata = {
  title: "EDA Explorer — Profile Any CSV",
  description:
    "The EDA Explorer platform inside AIRaML: upload any CSV and instantly profile it — distributions, correlations, mutual information, 3D PCA and a downloadable report, no code.",
};

const navItems: WorldNavItem[] = [
  { label: "Overview", href: "/eda" },
  { label: "Open the explorer", href: APP_HREF, dot: "#34d399", external: true },
];

const icon = (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
    <path d="M4 20V10M10 20V4M16 20v-7M22 20V8" strokeLinecap="round" />
  </svg>
);

export default function EdaLayout({ children }: { children: React.ReactNode }) {
  return (
    <WorldShell nav={
      <WorldNav wordmark="EDA Explorer" wordmarkHref="/eda" icon={icon}
        accent={EDA_ACCENT} accent2={EDA_ACCENT2} items={navItems} />
    }>
      {children}
    </WorldShell>
  );
}
