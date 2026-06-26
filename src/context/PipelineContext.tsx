"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { type MLPipelineState, emptyPipelineState } from "@/types/pipeline";

type PipelineContextValue = {
  state: MLPipelineState;
  setState: React.Dispatch<React.SetStateAction<MLPipelineState>>;
};

const PipelineContext = createContext<PipelineContextValue | null>(null);

const LS_KEY = "ml_pipeline_state";

// Fields that cannot be serialized (File objects)
const EXCLUDED: (keyof MLPipelineState)[] = ["csv", "cleanedCsv"];

function saveToStorage(state: MLPipelineState) {
  try {
    const serializable = Object.fromEntries(
      Object.entries(state).filter(([k]) => !EXCLUDED.includes(k as keyof MLPipelineState))
    );
    localStorage.setItem(LS_KEY, JSON.stringify(serializable));
  } catch {
    // quota or SSR — silently ignore
  }
}

function loadFromStorage(): Partial<MLPipelineState> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Partial<MLPipelineState>;
  } catch {
    return {};
  }
}

export function PipelineProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<MLPipelineState>(emptyPipelineState);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate once on mount
  useEffect(() => {
    const persisted = loadFromStorage();
    setState({
      ...emptyPipelineState,
      ...persisted,
      // File fields cannot survive serialization — always null on hydrate
      csv: null,
      cleanedCsv: null,
    });
    setHydrated(true);
  }, []);

  // Persist on every state change (after hydration)
  useEffect(() => {
    if (hydrated) saveToStorage(state);
  }, [state, hydrated]);

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
