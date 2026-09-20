import type { Metadata } from "next";
import WorldShell from "@/components/world/WorldShell";
import WorldNav, { type WorldNavItem } from "@/components/world/WorldNav";
import { ML_ACCENT, ML_ACCENT2, APP_HREF } from "./theme";

export const metadata: Metadata = {
  title: "ML Unified — Four Models, One App",
  description:
    "The ML Unified platform inside AIRaML: four trained models — Iris, Titanic, Diabetes, Insurance — served from one schema-driven FastAPI backend with dynamic forms and live predictions.",
};

const navItems: WorldNavItem[] = [
  { label: "Overview", href: "/ml" },
  { label: "Open the platform", href: APP_HREF, dot: "#34d399", external: true },
];

const icon = (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
    <circle cx="5" cy="6" r="2" /><circle cx="5" cy="18" r="2" /><circle cx="19" cy="12" r="2" />
    <path d="M7 6h6M7 18h6M13 6a6 6 0 016 6M13 18a6 6 0 006-6" strokeLinecap="round" />
  </svg>
);

export default function MlLayout({ children }: { children: React.ReactNode }) {
  return (
    <WorldShell nav={
      <WorldNav wordmark="ML Unified" wordmarkHref="/ml" icon={icon}
        accent={ML_ACCENT} accent2={ML_ACCENT2} items={navItems} />
    }>
      {children}
    </WorldShell>
  );
}
