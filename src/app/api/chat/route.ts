import { NextRequest, NextResponse } from 'next/server';

const SECTION_CONTEXT: Record<string, string> = {
  hero:     "The visitor is on the hero/intro section — overview of who Ramakrishnasai is and what he builds.",
  about:    "The visitor is on the About section. Key facts: PG Diploma in Data Science from IIIT-Bangalore (3.7/4.0 GPA), specialization in Deep Learning. ML Engineer who builds end-to-end production systems, not just notebooks.",
  skills:   "The visitor is exploring the Skills section. Core areas: Machine Learning (XGBoost, SHAP, LIME, GridSearch), Deep Learning (CNN, RNN, LSTM, Transfer Learning with VGG/ResNet/MobileNet), Generative AI (RAG, AI Agents, LangChain, LangGraph, Prompt Engineering), NLP (Word2Vec, Topic Modeling, Sentiment Analysis), Computer Vision (Object Detection, Semantic Segmentation, ONNX, TinyYOLOv3), MLOps (Python, FastAPI, Docker, GCP, Render, MLFlow, Scikit-learn, Pandas, Plotly).",
  projects: "The visitor is browsing the Projects section — live interactive ML apps: Iris species classifier, insurance cost predictor (regression), Titanic survival predictor, diabetes risk classifier. All deployed and running.",
  pipeline: "The visitor is exploring the ML Pipeline visualization — an interactive 8-stage pipeline: Data Ingestion → EDA → Feature Engineering → Model Training → Evaluation → SHAP/Explainability → Model Registry → API Deployment. Each stage is clickable with detail.",
  news:     "The visitor is on the AI/ML News section showing curated live news from the AI industry.",
  timeline: "The visitor is viewing the professional Timeline showing career history and education milestones.",
  contact:  "The visitor is on the Contact section. They can reach out via LinkedIn (WRamakrishnasai), GitHub (ramleo), DockerHub (wram), or the contact form on this page.",
};

function buildSystemPrompt(section: string): string {
  const ctx = SECTION_CONTEXT[section] ?? "The visitor is browsing the portfolio.";
  return `You are an AI assistant embedded in the portfolio website of Ramakrishnasai Wuppalapati (AIRaML), an ML Engineer and Data Scientist based in Hyderabad, India.

Your role is to help visitors learn about his skills, projects, experience, and background. Keep responses concise — 2 to 4 sentences maximum. Be friendly, specific, and professional.

${ctx}

Do not make up information not provided here. If asked something you don't know, suggest the visitor use the contact form.`;
}

export async function POST(req: NextRequest) {
  const { messages, section } = await req.json();

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ reply: "No messages provided." }, { status: 400 });
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return NextResponse.json({ reply: "Chatbot is not configured yet. Use the contact form to get in touch!" });
  }

  const systemPrompt = buildSystemPrompt(section ?? 'hero');
  const contents = [
    { role: "user", parts: [{ text: systemPrompt }] },
    { role: "model", parts: [{ text: "Understood. I'll help visitors learn about Ramakrishnasai's portfolio." }] },
    ...messages.map((m: { role: string; content: string }) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }],
    })),
  ];

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          contents,
          generationConfig: { maxOutputTokens: 400, temperature: 0.7 },
        }),
      }
    );

    if (!res.ok) {
      return NextResponse.json({ reply: "Something went wrong. Please try again." });
    }

    const data = await res.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "No response received.";
    return NextResponse.json({ reply });
  } catch {
    return NextResponse.json({ reply: "Something went wrong. Please try again." });
  }
}
