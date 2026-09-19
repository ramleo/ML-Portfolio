import type { Metadata } from "next";

// Text-to-SQL is a platform (see src/app/sql), not a toolkit capability card,
// so its metadata is set explicitly here rather than derived via toolMetadata().
export const metadata: Metadata = {
  title: "Text-to-SQL Agent | AIRaML",
  description:
    "Ask a question in plain English and get SQL, run live against a real database, with an LLM explanation of the query and results.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
