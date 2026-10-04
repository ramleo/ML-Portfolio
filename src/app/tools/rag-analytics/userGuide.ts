export const RAG_ANALYTICS_GUIDE = `
# RAG Usage Analytics — User Guide

## What this tool does
An **instrumentation dashboard** for the site's RAG (document Q&A) tool: it shows how the
RAG feature is actually being used — headline **stat cards** (volume), a **provider donut**
(which LLM answered), and **upload-type bars** (CSV / Image / PDF / Video / Other). It
reads aggregate usage, not anyone's content.

## Purpose
Building a feature is half the job; knowing how it's used is the other half. This turns the
RAG tool's raw usage into a readable picture — how much it's used, which providers carry
the load, and what kinds of files people bring — so decisions are based on real behaviour,
not guesses.

## How to use it
1. Open the tool — it **loads the latest aggregates automatically** (no input needed).
2. Read the **stat cards** for totals, the **donut** for the provider split, and the
   **bars** for upload-type mix.
3. If there's no data yet, an **empty state** says so rather than showing zeros.

## A worked example
The donut shows most answers came from **Cohere** with a slice of **Mistral** (the free
cascade in action); the upload bars show **PDF** and **CSV** dominate with a little
**Image**. That tells you the RAG tool is mostly used for document and tabular Q&A, and
that the free providers are handling the load.

## Reading the result
- **Stat cards** — top-line counts (usage volume), animated as they load.
- **Provider donut** — share of answers per LLM provider.
- **Upload-type bars** — distribution across CSV / Image / PDF / Video / Other.

## Notes & limits
- **Aggregates only** — it's a usage view; it does **not** show anyone's queries,
  documents, or answers.
- **Read-only** — nothing to configure or submit.
- **Reflects recorded usage** — a quiet period shows the empty state, not an error.
`.trim();

export const RAG_ANALYTICS_SUGGESTIONS = [
  "What do the three panels show?",
  "Does this expose anyone's documents or queries?",
  "What does the provider donut tell me?",
  "Why do I see an empty state?",
];
