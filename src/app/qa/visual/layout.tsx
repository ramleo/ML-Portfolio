import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Visual — Testwright",
  description: "Capture a page on isolated CI, save a baseline in your browser, then diff later captures pixel-for-pixel to catch visual regressions.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
