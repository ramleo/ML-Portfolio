import { useCallback, useRef, useState } from "react";
import { qaPost, qaGet } from "../lib/qaClient";

const TOOL_ID = "qa-heal-suite";
const POLL_MS = 4000;
const MAX_POLLS = 90;

export type SuiteItem = { name: string; code: string; correlationId: string | null; passed: boolean | null };
export type HealMember = {
  correlationId: string; name: string; code: string;
  healing: boolean; healed: boolean; passedAfter: boolean | null; note?: string;
};
export type HealGroup = { signature: string; cause: string; members: HealMember[] };
export type HealPhase = "idle" | "running" | "grouping" | "grouped" | "empty" | "error";

export type SuiteState = {
  phase: HealPhase;
  items: SuiteItem[];
  done: number;
  total: number;
  groups: HealGroup[];
  error: string | null;
};

const IDLE: SuiteState = { phase: "idle", items: [], done: 0, total: 0, groups: [], error: null };

async function executeAndWait(code: string, name: string): Promise<{ correlationId: string | null; passed: boolean }> {
  const acc = await qaPost<{ correlation_id: string }>("/qa/run/execute", { code, test_name: name }, { tool: TOOL_ID });
  const cid = acc?.correlation_id;
  if (!cid) return { correlationId: null, passed: false };
  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise((r) => setTimeout(r, POLL_MS));
    let s: { status: string; passed?: boolean };
    try { s = await qaGet(`/qa/run/status/${cid}`); } catch { continue; }
    if (s.status === "completed") return { correlationId: cid, passed: !!s.passed };
    if (s.status === "error") return { correlationId: cid, passed: false };
  }
  return { correlationId: cid, passed: false };
}

export function useHealSuite() {
  const [state, setState] = useState<SuiteState>(IDLE);
  const cancelled = useRef(false);

  const reset = useCallback(() => { cancelled.current = true; setState(IDLE); }, []);

  const runSuite = useCallback(async (tests: { name: string; code: string }[]) => {
    if (!tests.length) return;
    cancelled.current = false;
    const items: SuiteItem[] = tests.map((t) => ({ name: t.name, code: t.code, correlationId: null, passed: null }));
    setState({ phase: "running", items: [...items], done: 0, total: tests.length, groups: [], error: null });

    for (let i = 0; i < tests.length; i++) {
      if (cancelled.current) return;
      const { correlationId, passed } = await executeAndWait(tests[i].code, tests[i].name);
      items[i] = { ...items[i], correlationId, passed };
      setState((prev) => ({ ...prev, items: [...items], done: i + 1 }));
    }

    const failed = items.filter((it) => it.passed === false && it.correlationId);
    if (!failed.length) { setState((prev) => ({ ...prev, phase: "empty" })); return; }

    setState((prev) => ({ ...prev, phase: "grouping" }));
    let resp: { groups: { signature: string; cause: string; correlation_ids: string[] }[] };
    try {
      resp = await qaPost("/qa/heal/group", { correlation_ids: failed.map((f) => f.correlationId) }, { tool: TOOL_ID });
    } catch (err) {
      setState((prev) => ({ ...prev, phase: "error", error: (err as Error).message || "Grouping failed." }));
      return;
    }
    const byCid = new Map(items.map((it) => [it.correlationId, it]));
    const groups: HealGroup[] = (resp.groups || []).map((g) => ({
      signature: g.signature,
      cause: g.cause,
      members: g.correlation_ids.map((cid) => {
        const it = byCid.get(cid);
        return { correlationId: cid, name: it?.name ?? "test", code: it?.code ?? "", healing: false, healed: false, passedAfter: null };
      }),
    }));
    setState((prev) => ({ ...prev, phase: "grouped", groups }));
  }, []);

  const patchMember = (gi: number, mi: number, patch: Partial<HealMember>) => {
    setState((prev) => {
      const groups = prev.groups.map((g, gx) => gx !== gi ? g : {
        ...g, members: g.members.map((m, mx) => mx !== mi ? m : { ...m, ...patch }),
      });
      return { ...prev, groups };
    });
  };

  const healGroup = useCallback(async (gi: number, members: HealMember[]) => {
    for (let mi = 0; mi < members.length; mi++) {
      const m = members[mi];
      if (m.passedAfter) continue;
      patchMember(gi, mi, { healing: true, note: undefined });
      try {
        const resp = await qaPost<{ healed_code?: string }>(
          "/qa/run/heal", { correlation_id: m.correlationId, code: m.code }, { tool: TOOL_ID });
        if (!resp.healed_code) { patchMember(gi, mi, { healing: false, note: "Couldn't heal" }); continue; }
        const { passed } = await executeAndWait(resp.healed_code, m.name);
        patchMember(gi, mi, { healing: false, healed: true, passedAfter: passed, code: resp.healed_code });
      } catch {
        patchMember(gi, mi, { healing: false, note: "Heal failed" });
      }
    }
  }, []);

  return { state, runSuite, healGroup, reset };
}
