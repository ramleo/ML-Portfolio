import { useEffect, useRef, useState } from "react";
import type { RunState } from "./useRun";
import type { HealInfo } from "./ResultView";

/** Auto-fix loop: run → heal → re-run, up to 2 passes, until the test passes or heal
 *  can't fix it. Reuses onHeal (stages a fix) and onConfirmHeal (applies + re-runs)
 *  from RunRunner, so there is one source of truth for healing. */
export function useAutoFix(opts: {
  state: RunState;
  healInfo: HealInfo | null;
  healing: boolean;
  onHeal: () => void;
  onConfirmHeal: () => void;
}) {
  const { state, healInfo, healing, onHeal, onConfirmHeal } = opts;
  const [auto, setAuto] = useState(false);
  const left = useRef(0);
  const busy = state.phase === "queued" || state.phase === "in_progress";

  const onAutoFix = () => {
    if (!state.correlationId || healing || busy) return;
    left.current = 2;
    setAuto(true);
    onHeal();
  };

  // A heal was staged during auto mode → apply + re-run it; stop if heal refused.
  useEffect(() => {
    if (!auto) return;
    if (healInfo?.error) { setAuto(false); left.current = 0; return; }
    if (healInfo?.pending) onConfirmHeal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, healInfo]);

  // Each auto re-run finished → stop on pass, else consume an iteration and heal again.
  useEffect(() => {
    if (!auto) return;
    if (state.phase === "error") { setAuto(false); left.current = 0; return; }
    if (state.phase === "completed") {
      if (state.passed) { setAuto(false); left.current = 0; return; }
      left.current -= 1;
      if (left.current > 0) onHeal(); else setAuto(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, state.phase, state.passed]);

  return { auto, onAutoFix };
}
