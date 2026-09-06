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

type ChatMessage = { role: string; content: string };

async function callGemini(key: string, systemPrompt: string, messages: ChatMessage[]) {
  const contents = messages.map((m) => ({
    role: m.role === "user" ? "user" : "model",
    parts: [{ text: m.content }],
  }));
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: { maxOutputTokens: 400, temperature: 0.7 },
      }),
    }
  );
  if (!res.ok) {
    const err = await res.text();
    console.error('[chat/gemini]', res.status, err);
    throw new Error(`Gemini ${res.status}: ${err.slice(0, 120)}`);
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "No response received.";
}

async function callClaude(key: string, systemPrompt: string, messages: ChatMessage[]) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system: systemPrompt,
      messages,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error('[chat/claude]', res.status, err);
    throw new Error('Claude error');
  }
  const data = await res.json();
  return data.content?.[0]?.text ?? "No response received.";
}

async function callGroq(key: string, systemPrompt: string, messages: ChatMessage[]) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      // llama-3.1-8b-instant was retired by Groq (404 model_not_found), which
      // made the Groq option in this chat throw for every visitor who picked
      // it. Verified 2026-09-06: this name resolves; max_tokens 400 below fits
      // the free tier's 1000 output-tokens-per-minute cap.
      model: 'qwen/qwen3.6-27b',
      max_tokens: 400,
      temperature: 0.7,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error('[chat/groq]', res.status, err);
    throw new Error('Groq error');
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "No response received.";
}

export async function POST(req: NextRequest) {
  const { messages, section, provider = 'gemini' } = await req.json();

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ reply: "No messages provided." }, { status: 400 });
  }

  const systemPrompt = buildSystemPrompt(section ?? 'hero');

  try {
    let reply: string;

    if (provider === 'claude') {
      const key = process.env.ANTHROPIC_API_KEY;
      if (!key) return NextResponse.json({ reply: "Claude is not configured yet. Try Gemini or Groq!" });
      reply = await callClaude(key, systemPrompt, messages);

    } else if (provider === 'groq') {
      const key = process.env.GROQ_API_KEY;
      if (!key) return NextResponse.json({ reply: "Groq is not configured yet. Try Gemini or Claude!" });
      reply = await callGroq(key, systemPrompt, messages);

    } else {
      const key = process.env.GEMINI_API_KEY;
      if (!key) return NextResponse.json({ reply: "Gemini is not configured yet. Use the contact form to get in touch!" });
      reply = await callGemini(key, systemPrompt, messages);
    }

    return NextResponse.json({ reply });
  } catch (e) {
    console.error('[chat] unhandled error:', e);
    return NextResponse.json({ reply: "Something went wrong. Please try again." });
  }
}
