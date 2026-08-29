import type { Metadata } from "next";

const title = "RAG Usage Analytics | AIRaML";
const description =
  "Usage and retrieval-quality analytics for the Multimodal RAG tool.";

export const metadata: Metadata = {
  title,
  description,
  // An internal instrumentation view for the RAG tool, not a portfolio piece —
  // keep it out of search results so it can't outrank the tools themselves.
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
