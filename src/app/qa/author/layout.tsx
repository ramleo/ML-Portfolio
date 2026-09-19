import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Author — Testwright",
  description:
    "Describe a browser test in plain English and get a runnable Playwright TypeScript test with resilient locators. Generation only, free.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
