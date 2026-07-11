import type { CT } from "./SqlChart";

export type Provider = "groq" | "gemini" | "cohere";

export interface HistoryTurn {
  question: string; sql: string; result_summary: string; count: number; timestamp?: number;
}
export interface FKRel { from_col: string; to_table: string; to_col: string; }
export interface SchemaTable { columns: { name: string; type: string; pk: boolean }[]; row_count: number; foreign_keys?: FKRel[]; }
export type Results = { columns: string[]; rows: unknown[][]; count: number; exec_time_ms: number };

export interface ResultTab {
  id: string;
  question: string;
  sql: string | null;
  currentSql: string | null;
  originalSql: string | null;
  results: Results | null;
  error: string | null;
  currentPage: number;
  totalCount: number;
  activeFilter: string | null;
  pinned?: boolean;
  chartOverride?: CT | null;
}

export const SAMPLE_QUESTIONS = [
  "Show me the top 5 artists by total album count",
  "What is the total revenue for each year?",
  "Show the top 6 genres by number of tracks",
  "List the top 10 customers by total spending",
  "What is the average track length in milliseconds vs average unit price per genre?",
];