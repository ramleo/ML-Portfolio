import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Run — Testwright",
  description: "Execute a Playwright test on an isolated GitHub Actions runner against a live site — pass/fail, summary, and a failure screenshot.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
