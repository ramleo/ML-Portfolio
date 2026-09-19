export const SQL_WORLD_GUIDE = `
# Text-to-SQL — Platform Guide

## What it is
The **Text-to-SQL** platform turns a plain-English question into SQL, runs it
**live** against a real database, and explains both the query and the results.
It has its own FastAPI + LLM backend — a full app, not a single-screen demo.

## What it does
- **Ask** — a free LLM (Groq → Mistral → Cohere) writes SQL for your schema from
  a natural-language question.
- **Run** — the SQL executes live, with pagination and column filtering on the
  results.
- **Explain** — an LLM explains the generated SQL and the results in plain
  English, so you can trust what ran.
- **Connect** — start on the Chinook demo, upload a CSV, or connect your own
  PostgreSQL / MySQL / SQL Server. Browse the schema and its ER diagram.

## How to use it
Open the tool, pick or connect a database, and ask a question — for example
"what is the total revenue for each year?". Read the SQL, run it, and open the
explanation if you want the reasoning.

## Honest limits
The SQL is **AI-generated** — accuracy depends on the model and the schema, so
**verify results before you rely on them**. It is aimed at reading and analysing
data, and results are paginated/bounded rather than unbounded exports.

## Why it matters
Most people who need an answer from a database don't write SQL fluently.
Turning the question into runnable, explained SQL puts real analysis one sentence
away — and shows the query so it stays auditable.
`;

export const SQL_WORLD_SUGGESTIONS = [
  "What databases can I connect to Text-to-SQL?",
  "How accurate is the generated SQL?",
  "What does the explanation show me?",
  "Open the tool with the Chinook demo.",
];
