import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Discover — Testwright",
  description: "Give an own-site URL; Testwright renders it, reads the page snapshot, and proposes candidate test cases to draft and run.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
