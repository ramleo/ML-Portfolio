"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { type MLPipelineState, emptyPipelineState } from "@/types/pipeline";

type PipelineContextValue = {
  state: MLPipelineState;
  setState: React.Dispatch<React.SetStateAction<MLPipelineState>>;
};

const PipelineContext = createContext<PipelineContextValue | null>(null);

export function PipelineProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<MLPipelineState>(emptyPipelineState);
  return (
    <PipelineContext.Provider value={{ state, setState }}>
      {children}
    </PipelineContext.Provider>
  );
}

export function usePipeline() {
  const ctx = useContext(PipelineContext);
  if (!ctx) throw new Error("usePipeline must be used within PipelineProvider");
  return ctx;
}