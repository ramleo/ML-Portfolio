import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Heal — Testwright",
  description: "Run your saved tests as a suite, group failures by root cause, and self-heal each group in one click.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
