import { useCallback, useState } from "react";
import { ML_UNIFIED_API } from "@/config/urls";
import { groupAlerts, type AlertGroup } from "./alertGrouping";

const JUDGE_TIMEOUT_MS = 25_000;

export type TriageVerdict = { priority: string; reasoning: string; suggested_action: string };
export type TriagedGroup = AlertGroup & { verdict: TriageVerdict | null };

export function useSiemTriage() {
  const [running, setRunning] = useState(false);
  const [totalLines, setTotalLines] = useState<number | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [triaged, setTriaged] = useState<TriagedGroup[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(async (text: string) => {
    const { totalLines: lines, groups, truncated: wasTruncated } = groupAlerts(text);
    setTotalLines(lines);
    setTruncated(wasTruncated);
    setError(null);
    setTriaged(null);
    if (groups.length === 0) return;

    setRunning(true);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), JUDGE_TIMEOUT_MS);
    try {
      const res = await fetch(`${ML_UNIFIED_API}/siem-triage/judge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groups: groups.map(g => ({ template: g.template, count: g.count, example: g.example, unique_ips: g.uniqueIps })),
        }),
        signal: controller.signal,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.detail?.[0]?.msg || data?.detail || "Judge call failed.");
      const verdicts: (TriageVerdict | null)[] = Array.isArray(data) ? data : groups.map(() => null);
      const combined: TriagedGroup[] = groups.map((g, i) => ({ ...g, verdict: verdicts[i] ?? null }));
      combined.sort((a, b) => priorityRank(a.verdict?.priority) - priorityRank(b.verdict?.priority));
      setTriaged(combined);
    } catch (err) {
      setError(err instanceof Error && err.name === "AbortError" ? "Request timed out." : (err as Error).message || "Judge call failed.");
      setTriaged(groups.map(g => ({ ...g, verdict: null })));
    } finally {
      clearTimeout(timeout);
      setRunning(false);
    }
  }, []);

  const reset = useCallback(() => {
    setTotalLines(null);
    setTruncated(false);
    setTriaged(null);
    setError(null);
  }, []);

  return { analyze, running, totalLines, truncated, triaged, error, reset };
}

function priorityRank(priority: string | undefined): number {
  const order = ["critical", "high", "medium", "low", "noise"];
  const idx = order.indexOf(priority || "");
  return idx === -1 ? order.length : idx;
}
