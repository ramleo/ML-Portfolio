import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Run — Testwright",
  description: "Execute generated Playwright tests against our own site in a bounded runner. On the Testwright roadmap (Phase 2).",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
