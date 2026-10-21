"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Compact markdown renderer for chatbot answers — bold, lists, links (open in a new
 * tab), code — sized for a chat bubble. So a bot's **bold** / lists / Sources render
 * properly instead of showing raw asterisks. */
const MD = {
  p: ({ children }: React.PropsWithChildren) => <p style={{ margin: "0 0 8px", lineHeight: 1.55 }}>{children}</p>,
  ul: ({ children }: React.PropsWithChildren) => <ul style={{ margin: "0 0 8px", paddingLeft: 18, display: "grid", gap: 3 }}>{children}</ul>,
  ol: ({ children }: React.PropsWithChildren) => <ol style={{ margin: "0 0 8px", paddingLeft: 18, display: "grid", gap: 3 }}>{children}</ol>,
  li: ({ children }: React.PropsWithChildren) => <li style={{ lineHeight: 1.5 }}>{children}</li>,
  strong: ({ children }: React.PropsWithChildren) => <strong style={{ fontWeight: 700 }}>{children}</strong>,
  a: ({ href, children }: React.PropsWithChildren<{ href?: string }>) => (
    <a href={href} target="_blank" rel="noreferrer" style={{ color: "var(--accent)", wordBreak: "break-word" }}>{children}</a>
  ),
  code: ({ children }: React.PropsWithChildren) => (
    <code style={{ background: "var(--bg)", padding: "1px 5px", borderRadius: 4, fontSize: "0.9em", fontFamily: "var(--type-data, monospace)" }}>{children}</code>
  ),
  h1: ({ children }: React.PropsWithChildren) => <p style={{ fontWeight: 700, margin: "0 0 6px" }}>{children}</p>,
  h2: ({ children }: React.PropsWithChildren) => <p style={{ fontWeight: 700, margin: "0 0 6px" }}>{children}</p>,
  h3: ({ children }: React.PropsWithChildren) => <p style={{ fontWeight: 700, margin: "0 0 6px" }}>{children}</p>,
};

export default function ChatMarkdown({ text }: { text: string }) {
  return (
    <div style={{ fontSize: 14 }} className="chat-md">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD}>{text}</ReactMarkdown>
      <style>{".chat-md > :last-child{margin-bottom:0}"}</style>
    </div>
  );
}
