import type { Metadata } from "next";
import QaWorldShell from "./QaWorldShell";

export const metadata: Metadata = {
  title: "Testwright — QA Automation",
  description:
    "Testwright is the QA-automation platform inside AIRaML: describe a browser test in plain English and get a runnable Playwright TypeScript test with resilient locators. Free, own-site first.",
};

export default function QaLayout({ children }: { children: React.ReactNode }) {
  return <QaWorldShell>{children}</QaWorldShell>;
}
