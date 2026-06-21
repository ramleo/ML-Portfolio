/// <reference lib="webworker" />

import { runSelection } from "@/lib/fsAlgorithms";
import type { ColInfo, SelectionOpts } from "@/lib/fsAlgorithms";

self.onmessage = (e: MessageEvent<{ cols: ColInfo[]; opts: SelectionOpts }>) => {
  try {
    const { cols, opts } = e.data;
    const payload = runSelection(cols, opts);
    (self as unknown as Worker).postMessage({ type: "result", payload });
  } catch (err) {
    (self as unknown as Worker).postMessage({ type: "error", message: String(err) });
  }
};
