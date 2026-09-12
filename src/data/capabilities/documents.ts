/** Language & Documents tool cards.
 *
 *  Split out of a single 961-line capabilities.ts, which was pinned as
 *  oversized debt and could not take another card without failing the
 *  file-length gate. Order within a domain is preserved exactly, because
 *  that is the order the domain page renders. Flat order across domains
 *  is not used by anything: every consumer takes a length or filters by
 *  domain.
 */
import { BookOpenCheck, FileSearch, Scale, Terminal } from "lucide-react";

import { GITHUB, type Capability } from "./_types";

const languageDocuments: Capability[] = [
  {
    id: "text-to-sql",
    featured: 5,
    domain: "Language & Documents",
    title: "Text-to-SQL Agent",
    subtitle: "Natural Language → Database Queries",
    description:
      "Ask a question in plain English and get SQL you can actually run. The agent writes the query, executes it against a real database, explains what came back, and retries itself if the query errors. Bring your own SQLite file or a PostgreSQL connection, or try it on the Chinook demo database.",
    accent: "#6a6cc8",
    icon: Terminal,
    stat: "3",
    statLabel: "LLM Providers",
    model: "Groq / Gemini / Cohere",
    input: "Natural language question",
    tags: ["SQL", "LLM", "Agent", "Database", "NLP"],
    link: "/?mode=ml",
    github: GITHUB,
    internalLink: "/tools/text-to-sql",
  },
  {
    id: "document-intelligence",
    domain: "Language & Documents",
    title: "Document Intelligence",
    subtitle: "AI-Powered Document Data Extraction",
    description:
      "Upload an invoice, contract, resume, medical report or bank statement and get its fields back as structured data. The document type is identified automatically, each field is extracted with a confidence score, and a box is drawn on the page showing exactly where the value was found.",
    accent: "#387e8a",
    icon: FileSearch,
    stat: "8",
    statLabel: "Document Types",
    model: "Groq / Gemini / Cohere",
    input: "PDF, PNG, JPG, JPEG, WEBP",
    tags: ["OCR", "LLM", "PDF", "Extraction", "NLP"],
    link: "/?mode=ml",
    github: GITHUB,
    internalLink: "/tools/document-intelligence",
  },
  {
    id: "multimodal-rag",
    featured: 2,
    domain: "Language & Documents",
    title: "Multimodal RAG",
    subtitle: "Tables & Figures as Citable Knowledge",
    description:
      "Ask questions about a PDF and get answers cited back to the page they came from — including answers that live in a table or a chart rather than a paragraph. Tables are read as structured data and figures get an AI-written caption, so a number buried in a bar chart is still findable.",
    accent: "#7e68c0",
    icon: BookOpenCheck,
    stat: "3",
    statLabel: "Chunk Types",
    model: "Groq / Mistral / Gemini",
    input: "PDF (text, tables, figures)",
    tags: ["RAG", "Multimodal", "PDF", "Citations", "LLM"],
    link: "/?mode=ml",
    github: GITHUB,
    internalLink: "/tools/multimodal-rag",
  },
  {
    id: "contract-invoice-reconciliation",
    domain: "Language & Documents",
    title: "Contract/Invoice Reconciliation Assistant",
    subtitle: "Discrepancy Report Across Documents",
    description:
      "Upload a contract, then the invoices billed against it, and see where they disagree. Mismatched amounts, dates and terms are flagged with both source passages side by side and an explanation of the conflict. Invoices are only ever checked against the contract, never against each other — they are supposed to differ.",
    accent: "#966f2b",
    icon: Scale,
    stat: "2",
    statLabel: "Doc Roles",
    model: "Cohere / Mistral / Gemini",
    input: "PDF, PNG, JPG (contract + invoices)",
    tags: ["RAG", "Reconciliation", "Contracts", "Invoices", "LLM"],
    link: "/?mode=ml",
    github: GITHUB,
    internalLink: "/tools/contract-invoice-reconciliation",
  },
];

export default languageDocuments;
