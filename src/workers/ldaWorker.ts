/// <reference lib="webworker" />

import { runLDA } from "@/lib/feLDA";
import type { LDAPreprocessOpts } from "@/lib/feLDA";

interface LDAWorkerMessage {
  rawValues: string[];
  nTopics: number;
  nIter: number;
  vocabCap: number;
  opts: LDAPreprocessOpts;
}

self.onmessage = (e: MessageEvent<LDAWorkerMessage>) => {
  try {
    const { rawValues, nTopics, nIter, vocabCap, opts } = e.data;
    const payload = runLDA(rawValues, nTopics, nIter, vocabCap, opts);
    (self as unknown as Worker).postMessage({ type: "result", payload });
  } catch (err) {
    (self as unknown as Worker).postMessage({ type: "error", message: String(err) });
  }
};
