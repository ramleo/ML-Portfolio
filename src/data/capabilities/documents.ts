/** Language & Documents tool cards.
 *
 *  Split out of a single 961-line capabilities.ts, which was pinned as
 *  oversized debt and could not take another card without failing the
 *  file-length gate. Order within a domain is preserved exactly, because
 *  that is the order the domain page renders. Flat order across domains
 *  is not used by anything: every consumer takes a length or filters by
 *  domain.
 */
import { BookOpenCheck, FileSearch, Scale } from "lucide-react";

import { GITHUB, type Capability } from "./_types";

// Text-to-SQL is no longer a toolkit card here — it graduated to its own
// platform world at /sql (see registry.json + src/app/sql). It is a full app
// with its own backend, so it lives in the "Deployed Platforms" tier, not the
// single-purpose toolkit.
const languageDocuments: Capability[] = [
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
