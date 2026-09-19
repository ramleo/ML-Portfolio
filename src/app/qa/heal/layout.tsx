import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Heal — Testwright",
  description: "Group failing tests by root cause and fix them in one click or one by one. On the Testwright roadmap (Phase 5).",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
