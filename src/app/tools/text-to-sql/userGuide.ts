// User guide for Text-to-SQL — distilled from UserGuideModal.tsx content and
// injected into the floating AI Assistant as its ONLY tool knowledge.
// Keep in sync with the modal when features change.

export const TEXT_TO_SQL_GUIDE = `
# Text-to-SQL Agent — User Guide

## What this tool does
Ask questions about a database in plain English. The AI generates SQL, executes
it, shows results with charts, and can explain its reasoning. A demo music-store
database (Chinook) is preloaded so you can start immediately.

## Getting started
- Type any question in the input box (e.g. "Show the top 10 customers by total
  spending") and press Enter or click Ask.
- "Surprise me" runs a random sample question — good for exploring.
- A guided 6-step walkthrough runs on first visit.

## Connecting your data
Use the demo Chinook database, upload a CSV/SQLite file, or connect live
PostgreSQL, MySQL, or SQL Server databases with connection credentials.

## Results
- Paginated table (50 rows/page); click column headers to sort.
- Natural-language filter box: type e.g. "only customers from USA" — it becomes
  a SQL WHERE clause and re-runs.
- Auto charts: bar, line, scatter, pie, or key metrics detected from the result;
  override with the type pills. Choice is saved per tab.
- Export results as a Markdown file including the SQL and metadata.
- Auto-Insights can summarize notable patterns in the result.

## SQL panel
View and copy the generated SQL. "Edit SQL" lets you modify and run your own
SQL directly, bypassing the AI.

## AI explanation & follow-ups
Ask for an explanation of the query and results. Three "You might also ask"
follow-up suggestions appear after each explanation — click to run them.

## Teach the AI (corrections)
If the AI misunderstands, open "Show Reasoning", type what it got wrong (e.g.
"revenue means UnitPrice × Quantity") and click Fix & Re-run. The correction is
applied immediately and shown in a green banner; remove it with the ×.

## Glossary
Define domain terms in the sidebar (one per line, "term: definition"). They are
injected into every SQL prompt so the AI understands your vocabulary. The
glossary clears when you switch databases.

## Schema explorer
Browse tables and columns in the sidebar, search by name, open an interactive
ER diagram (drag, zoom, click to highlight relationships). CSV uploads show a
Column Profile view instead. A Column Lineage graph maps source columns to
output columns for supported queries.

## History & saved queries
Query history (session-only) lets you re-run past questions. Saved queries
persist in the browser and can be reloaded later.

## Reliability
If a generated query fails, the AI retries with the error message up to 3 times.
Multiple AI providers are used with automatic fallback (Groq, Mistral Codestral,
Gemini, Cohere) so the tool keeps working if one provider is rate-limited.

## Keyboard shortcuts
Cmd+Enter: run query · Cmd+K: focus question input · Esc: close modals.
`.trim();

export const TEXT_TO_SQL_SUGGESTIONS = [
  "How do I connect my own database?",
  "What is Teach the AI and how do I use it?",
  "How does the natural language filter work?",
];