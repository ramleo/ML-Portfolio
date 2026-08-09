// User guide for Multimodal RAG — rendered in MmRagUserGuideModal (the "User
// Guide" header button) AND injected into the floating AI Assistant as its
// ONLY tool knowledge. Keep factual and in sync with the actual feature set.
// Split into userGuide/*.ts by section to stay under the project's
// 400-line-per-file cap — this file just composes them in reading order.

import { MM_RAG_OVERVIEW } from "./userGuide/overview";
import { MM_RAG_UPLOAD_OPTIONS } from "./userGuide/uploadOptions";
import { MM_RAG_DOCUMENT_TOOLS } from "./userGuide/documentTools";
import { MM_RAG_CITATIONS } from "./userGuide/citations";
import { MM_RAG_OBJECT_DETECTION } from "./userGuide/objectDetection";
import { MM_RAG_OBJECT_REMOVAL } from "./userGuide/objectRemoval";
import { MM_RAG_SHARING_AND_STATS } from "./userGuide/sharingAndStats";

export const MM_RAG_GUIDE = `
# Multimodal RAG — User Guide

${MM_RAG_OVERVIEW}

${MM_RAG_UPLOAD_OPTIONS}

${MM_RAG_DOCUMENT_TOOLS}

${MM_RAG_CITATIONS}

${MM_RAG_OBJECT_DETECTION}

${MM_RAG_OBJECT_REMOVAL}

${MM_RAG_SHARING_AND_STATS}
`.trim();

export const MM_RAG_SUGGESTIONS = [
  "What's the difference between a Table and a Figure citation?",
  "What happens if I turn on 'find visually similar figures'?",
  "Does anything I upload here stay saved?",
  "How does the contradiction check between documents work?",
  "How do I remove an object from a photo and put something else there?",
];