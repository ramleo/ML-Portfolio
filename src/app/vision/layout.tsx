import type { Metadata } from "next";
import WorldShell from "@/components/world/WorldShell";
import WorldNav, { type WorldNavItem } from "@/components/world/WorldNav";
import { VISION_ACCENT, VISION_ACCENT2, APP_HREF } from "./theme";

export const metadata: Metadata = {
  title: "ML Vision — Classify, Detect, Segment",
  description:
    "The ML Vision platform inside AIRaML: three vision tasks in one app — classify (1000 ImageNet classes), detect (80 COCO classes) and segment (150 ADE20K classes), all as ONNX on a FastAPI backend.",
};

const navItems: WorldNavItem[] = [
  { label: "Overview", href: "/vision" },
  { label: "Open the platform", href: APP_HREF, dot: "#34d399", external: true },
];

const icon = (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" strokeLinejoin="round" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export default function VisionLayout({ children }: { children: React.ReactNode }) {
  return (
    <WorldShell nav={
      <WorldNav wordmark="ML Vision" wordmarkHref="/vision" icon={icon}
        accent={VISION_ACCENT} accent2={VISION_ACCENT2} items={navItems} />
    }>
      {children}
    </WorldShell>
  );
}
