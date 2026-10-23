/** Static config for the homepage RAG chat (Chatbot.tsx) — kept apart so the
 *  component stays under the file-length limit. Section hints + starter questions
 *  are per-section so the chat is relevant to whatever the visitor is reading. */

export type Provider = "cohere" | "gemini" | "claude" | "groq";

// Cohere leads because it is free; Gemini is the one paid provider on this route,
// so it is an explicit pick rather than what a visitor gets by default.
export const PROVIDERS: { id: Provider; label: string; color: string }[] = [
  { id: "cohere", label: "Cohere", color: "#a78bfa" },
  { id: "gemini", label: "Gemini", color: "#38bdf8" },
  { id: "claude", label: "Claude", color: "#f59e0b" },
  { id: "groq",   label: "Groq",   color: "#34d399" },
];

export const SECTION_IDS = ["hero", "about", "skills", "projects", "pipeline", "news", "timeline", "contact"];

export const SECTION_HINTS: Record<string, string> = {
  hero:     "Ask me about Ramakrishnasai's ML experience",
  about:    "Ask about background, education, or availability",
  skills:   "Ask how XGBoost, CNNs, RAG, or any skill is used",
  projects: "Ask about tech stack, accuracy, or how a project was built",
  pipeline: "Curious about any stage of the ML pipeline?",
  news:     "Ask anything about his work or AI/ML in general",
  timeline: "Ask about career milestones or education",
  contact:  "Ask about availability, roles, or collaboration",
};

// Clickable starter chips shown when the chat is empty — curated per section so a
// visitor who doesn't know what to ask has a relevant way in. Static (instant, no
// cost); the assistant itself stays grounded in the real content.
export const STARTER_QUESTIONS: Record<string, string[]> = {
  hero:     ["What has Ramakrishnasai built?", "What tools can I try here?", "Is he open to roles?"],
  about:    ["What's his background?", "Where did he study?", "Is he available for work?"],
  skills:   ["How does he use RAG?", "What's his deep-learning experience?", "Which languages and frameworks?"],
  projects: ["What's the most impressive project?", "How accurate are the models?", "How was the RAG system built?"],
  pipeline: ["Explain the ML pipeline stages", "How does AutoML work here?", "What does the drift detector do?"],
  news:     ["What has he worked on recently?", "What tools can I try here?", "How do I use the chatbot builder?"],
  timeline: ["Walk me through his career", "What are his key milestones?", "When did he start in ML?"],
  contact:  ["How can I reach him?", "What roles is he open to?", "Is he available for freelance?"],
};
