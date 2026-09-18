"use client";

import type { Scorecard } from "./useIntrusionDetection";

// Per-class accent so the confusion matrix and chips read consistently.
export const CLASS_COLOR: Record<string, string> = {
  normal: "#3f8358",
  DoS: "#c84b60",
  Probe: "#c8623f",
  R2L: "#8b6fc9",
  U2R: "#3c7d9b",
};

function pct(x: number): string {
  return `${(x * 100).toFixed(0)}%`;
}

export default function IntrusionScorecard({ sc, accent }: { sc: Scorecard; accent: string }) {
  const { classNames, confusion, perClass, importances } = sc;
  const maxImp = Math.max(...importances.map((i) => i.value), 1e-9);

  return (
    <div className="flex flex-col gap-5">
      {/* Confusion matrix */}
      <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-baseline justify-between flex-wrap gap-2">
          <h2 className="text-sm font-bold" style={{ color: "var(--text)" }}>Confusion matrix</h2>
          <span className="text-[10px]" style={{ color: "var(--text3)" }}>rows = actual · columns = predicted</span>
        </div>
        <div className="overflow-x-auto">
          <table className="text-[11px] border-collapse" style={{ color: "var(--text2)" }}>
            <thead>
              <tr>
                <th className="p-1.5"></th>
                {classNames.map((c) => (
                  <th key={c} className="p-1.5 font-semibold text-center" style={{ color: CLASS_COLOR[c] ?? "var(--text)" }}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {confusion.map((row, t) => {
                const rowTotal = row.reduce((a, b) => a + b, 0) || 1;
                return (
                  <tr key={t}>
                    <td className="p-1.5 font-semibold text-right whitespace-nowrap" style={{ color: CLASS_COLOR[classNames[t]] ?? "var(--text)" }}>{classNames[t]}</td>
                    {row.map((v, p) => {
                      const frac = v / rowTotal;
                      const diag = t === p;
                      const color = diag ? "#22c55e" : "#ef4444";
                      return (
                        <td key={p} className="p-1.5 text-center tabular-nums font-mono"
                          style={{
                            background: v ? `${color}${Math.round(frac * 60 + 8).toString(16).padStart(2, "0")}` : "transparent",
                            color: v ? "var(--text)" : "var(--text3)",
                            border: "1px solid var(--border)",
                            minWidth: 44,
                          }}>{v}</td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-[10px] leading-relaxed" style={{ color: "var(--text3)" }}>
          Green diagonal = correct. Off-diagonal red = confusions — note how many R2L rows land in the <strong>normal</strong> column: those attacks look like ordinary logins, which is why R2L is the hardest class.
        </p>
      </div>

      {/* Per-class metrics */}
      <div className="rounded-xl p-4 flex flex-col gap-2" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <h2 className="text-sm font-bold mb-1" style={{ color: "var(--text)" }}>Per-class performance</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]" style={{ color: "var(--text2)" }}>
            <thead>
              <tr className="text-left" style={{ color: "var(--text3)" }}>
                <th className="py-1 pr-3 font-semibold">Class</th>
                <th className="py-1 pr-3 font-semibold text-right">Precision</th>
                <th className="py-1 pr-3 font-semibold text-right">Recall</th>
                <th className="py-1 pr-3 font-semibold text-right">F1</th>
                <th className="py-1 font-semibold text-right">Support</th>
              </tr>
            </thead>
            <tbody>
              {perClass.map((m) => (
                <tr key={m.name} style={{ borderTop: "1px solid var(--border)" }}>
                  <td className="py-1.5 pr-3 font-semibold" style={{ color: CLASS_COLOR[m.name] ?? "var(--text)" }}>{m.name}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums">{pct(m.precision)}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums" style={{ color: m.recall < 0.4 ? "#ef4444" : "var(--text2)" }}>{pct(m.recall)}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums">{pct(m.f1)}</td>
                  <td className="py-1.5 text-right tabular-nums" style={{ color: "var(--text3)" }}>{m.support}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Feature importances */}
      <div className="rounded-xl p-4 flex flex-col gap-2" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <h2 className="text-sm font-bold mb-1" style={{ color: "var(--text)" }}>What the model relied on</h2>
        <p className="text-[10px] mb-1" style={{ color: "var(--text3)" }}>Top RandomForest feature importances</p>
        <div className="flex flex-col gap-1.5">
          {importances.map((f) => (
            <div key={f.name} className="flex items-center gap-2 text-[11px]">
              <span className="font-mono truncate" style={{ color: "var(--text2)", width: 180 }}>{f.name}</span>
              <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: "var(--bg)" }}>
                <div className="h-full rounded-full" style={{ width: `${(f.value / maxImp) * 100}%`, background: accent }} />
              </div>
              <span className="tabular-nums shrink-0" style={{ color: "var(--text3)", width: 44, textAlign: "right" }}>{f.value.toFixed(3)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
