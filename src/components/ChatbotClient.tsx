"use client";

import dynamic from "next/dynamic";

/**
 * The chatbot is a floating widget — no content, not indexed — so it has no
 * reason to be on the home page's initial critical path. Loading it after
 * hydration (ssr:false) keeps its framer-motion + chat JS off the first paint,
 * which is where the home page's main-thread time was going.
 */
const Chatbot = dynamic(() => import("./Chatbot"), { ssr: false });

export default function ChatbotClient() {
  return <Chatbot />;
}
