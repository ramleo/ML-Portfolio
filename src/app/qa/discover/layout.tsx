import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Discover — Testwright",
  description: "Crawl an own-site URL, propose candidate test cases, confirm and run. On the Testwright roadmap (Phase 3).",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
