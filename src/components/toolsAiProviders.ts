export type ProviderConfig = {
  id: string;
  label: string;
  color: string;
  models: { id: string; label: string }[];
  envKeyNote: string;
};

export const PROVIDERS: ProviderConfig[] = [
  {
    id: "gemini", label: "Gemini", color: "#38bdf8",
    models: [
      { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
      { id: "gemini-3.5-flash", label: "Gemini 3.5 Flash" },
    ],
    envKeyNote: "Default key provided. Add your own for higher limits.",
  },
  {
    id: "claude", label: "Claude", color: "#f59e0b",
    models: [
      { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5" },
      { id: "claude-sonnet-4-6",         label: "Claude Sonnet 4.6" },
    ],
    envKeyNote: "Paste your Anthropic API key.",
  },
  {
    id: "openai", label: "OpenAI", color: "#34d399",
    models: [
      { id: "gpt-4o-mini", label: "GPT-4o Mini" },
      { id: "gpt-4o",      label: "GPT-4o" },
    ],
    envKeyNote: "Paste your OpenAI API key.",
  },
  {
    id: "groq", label: "Groq", color: "#a78bfa",
    models: [
      // Both Llama names 404 on Groq now and gemma2-9b-it is decommissioned;
      // these two were verified reachable 2026-09-06.
      { id: "qwen/qwen3.6-27b", label: "Qwen3.6 27B" },
      { id: "qwen/qwen3.8-27b", label: "Qwen3.8 27B" },
    ],
    envKeyNote: "Paste your Groq API key (free tier available).",
  },
  {
    id: "cohere", label: "Cohere", color: "#fb923c",
    models: [
      { id: "command-a-03-2025", label: "Command A 03-2025" },
    ],
    envKeyNote: "Default key provided. Add your own for higher limits.",
  },
  {
    id: "mistral", label: "Mistral", color: "#f472b6",
    models: [
      { id: "mistral-small-latest", label: "Mistral Small" },
      { id: "mistral-large-latest", label: "Mistral Large" },
    ],
    envKeyNote: "Paste your Mistral API key.",
  },
  {
    id: "perplexity", label: "Perplexity", color: "#67e8f9",
    models: [
      { id: "sonar",     label: "Sonar" },
      { id: "sonar-pro", label: "Sonar Pro" },
    ],
    envKeyNote: "Paste your Perplexity API key.",
  },
];