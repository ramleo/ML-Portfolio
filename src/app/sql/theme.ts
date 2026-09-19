/** Text-to-SQL world — signature colours and the capability definitions.
 *  Mirrors the Testwright world's theme.ts. Unlike Testwright's roadmap stages,
 *  every Text-to-SQL capability is live today. */

export const SQL_ACCENT = "#6366f1";   // indigo — matches Language & Documents
export const SQL_ACCENT2 = "#8b5cf6";  // violet — gradient partner

export const TOOL_HREF = "/tools/text-to-sql";

export type Capability = {
  key: string;
  label: string;
  blurb: string;
  note: string;
};

export const CAPABILITIES: Capability[] = [
  {
    key: "ask",
    label: "Ask",
    blurb: "Type a question the way you'd say it out loud — \"top 5 artists by album count\" — and a free LLM turns it into SQL for your schema.",
    note: "Groq · Mistral · Cohere",
  },
  {
    key: "run",
    label: "Run",
    blurb: "The SQL runs live against a real database, with pagination and column filtering on the results — not a canned preview.",
    note: "Live query · paginated",
  },
  {
    key: "explain",
    label: "Explain",
    blurb: "An LLM explains the generated SQL and the results in plain English, so you can trust what ran and what came back.",
    note: "Query + results, in words",
  },
  {
    key: "connect",
    label: "Connect",
    blurb: "Start on the Chinook demo, upload a CSV, or point it at your own PostgreSQL, MySQL or SQL Server. Browse the schema and its ER diagram.",
    note: "Demo · CSV · Postgres · MySQL",
  },
];
