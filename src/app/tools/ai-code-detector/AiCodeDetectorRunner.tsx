"use client";

import { useState } from "react";
import { analyzeCode, type CodeAnalysis } from "./stylometry";
import { useAiCodeJudge } from "./useAiCodeJudge";

const EXAMPLES: Record<string, { label: string; code: string }> = {
  aiStyle: {
    label: "AI-style snippet",
    code: `def calculate_average(numbers):
    """
    Calculate the average of a list of numbers.

    Args:
        numbers (list): A list of numeric values.

    Returns:
        float: The average of the input numbers.
    """
    # Check if the list is empty
    if not numbers:
        return 0

    # Calculate the sum of all numbers
    total = sum(numbers)

    # Calculate the average
    result = total / len(numbers)

    return result


def process_data(data):
    """
    Process the input data and return a result.

    Args:
        data (list): The data to process.

    Returns:
        dict: A dictionary containing the processed result.
    """
    try:
        # Step 1: Validate the input
        if not data:
            raise ValueError("Data cannot be empty")

        # Step 2: Perform the calculation
        output = calculate_average(data)

        return {"result": output}
    except Exception as e:
        print(f"Error: {e}")
        return None
`,
  },
  messyHuman: {
    label: "Messy human snippet",
    code: `def calc_avg(nums):
    # todo: handle empty list better
    total=0
    for n in nums:
        total+=n
    avg = total/len(nums)
    print(avg)  # debug
    return avg

def procData(d):
    x = calc_avg(d)
    #result = old_calc(d)
    return {'res':x}
`,
  },
  cleanHuman: {
    label: "Clean human snippet (should NOT flag)",
    code: `def median(values):
    """Return the median of a non-empty sequence of numbers."""
    s = sorted(values)
    n = len(s)
    mid = n // 2
    if n % 2:
        return s[mid]
    return (s[mid - 1] + s[mid]) / 2


def stddev(values):
    m = sum(values) / len(values)
    variance = sum((v - m) ** 2 for v in values) / len(values)
    return variance ** 0.5
`,
  },
};

const OVERALL_LABEL: Record<CodeAnalysis["overallLabel"], { text: string; color: string }> = {
  several: { text: "Several AI-style signals", color: "#f59e0b" },
  few: { text: "A few AI-style signals", color: "#64748b" },
  none: { text: "No notable AI-style signals", color: "#22c55e" },
};

const ASSESSMENT_LABEL: Record<string, { text: string; color: string }> = {
  ai_leaning: { text: "leans AI-written", color: "#f59e0b" },
  human_leaning: { text: "leans human-written", color: "#22c55e" },
  inconclusive: { text: "inconclusive", color: "#64748b" },
};

function Badge({ text, color }: { text: string; color: string }) {
  return (
    <span className="text-[11px] px-2 py-[3px] rounded-full font-semibold uppercase tracking-wide"
      style={{ background: `${color}18`, color, border: `1px solid ${color}40` }}>
      {text}
    </span>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <h2 className="text-sm font-bold mb-3" style={{ color: "var(--text)" }}>{title}</h2>
      {children}
    </div>
  );
}

export default function AiCodeDetectorRunner({ accent }: { accent: string }) {
  const [code, setCode] = useState("");
  const [analysis, setAnalysis] = useState<CodeAnalysis | null>(null);
  const { judge, running, verdict, error, reset: resetJudge } = useAiCodeJudge();

  const runCheck = () => {
    if (!code.trim()) return;
    setAnalysis(analyzeCode(code));
    judge(code);
  };

  const clear = () => {
    setCode("");
    setAnalysis(null);
    resetJudge();
  };

  return (
    <div className="flex flex-col gap-5">
      <Section title="Paste a code snippet">
        <textarea
          data-wt="acd-input"
          value={code}
          onChange={e => setCode(e.target.value)}
          placeholder="Paste a function or short script..."
          rows={12}
          className="w-full rounded-lg p-3 text-xs font-mono resize-y"
          style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
        />
        <div className="flex flex-wrap items-center gap-3 mt-3">
          <button
            data-wt="acd-analyze"
            onClick={runCheck}
            disabled={running || !code.trim()}
            className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-40"
            style={{ background: accent, color: "#fff" }}>
            {running ? "Running heuristics + LLM judge…" : "Analyze code"}
          </button>
          {Object.entries(EXAMPLES).map(([key, ex]) => (
            <button key={key} data-wt={`acd-ex-${key}`} onClick={() => setCode(ex.code)} disabled={running}
              className="px-3 py-2 rounded-lg text-xs font-semibold disabled:opacity-40"
              style={{ background: "var(--surface2)", color: "var(--text)", border: "1px solid var(--border)" }}>
              {ex.label}
            </button>
          ))}
          {(code || analysis) && (
            <button onClick={clear} disabled={running} className="text-sm underline disabled:opacity-40" style={{ color: "var(--text3)" }}>
              Clear
            </button>
          )}
        </div>
      </Section>

      {error && (
        <div className="rounded-xl p-4 text-sm" style={{ background: "#ef444418", border: "1px solid #ef444440", color: "#ef4444" }}>
          {error}
        </div>
      )}

      {analysis && (
        <>
          <div className="rounded-xl p-4" data-wt="acd-verdict"
            style={{ background: `${OVERALL_LABEL[analysis.overallLabel].color}14`, border: `1px solid ${OVERALL_LABEL[analysis.overallLabel].color}40` }}>
            <div className="text-base font-bold" style={{ color: OVERALL_LABEL[analysis.overallLabel].color }}>
              {OVERALL_LABEL[analysis.overallLabel].text}
            </div>
            <div className="text-sm mt-0.5" style={{ color: "var(--text2)" }}>
              Not a verdict — see the raw signals and independent LLM opinion below, and the limits noted at the bottom of this page.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-wt="acd-signals">
            <Section title={`Stylistic signals (${analysis.signals.length})`}>
              {analysis.signals.length === 0
                ? <p className="text-sm" style={{ color: "var(--text3)" }}>No documented AI-style stylistic pattern matched.</p>
                : analysis.signals.map((s, i) => (
                    <div key={s.id} className="py-2" style={{ borderTop: i > 0 ? "1px solid var(--border)" : undefined }}>
                      <div className="text-sm font-semibold mb-0.5" style={{ color: "var(--text)" }}>{s.label}</div>
                      <div className="text-xs mb-1" style={{ color: "var(--text3)" }}>{s.detail}</div>
                      <p className="text-xs leading-relaxed" style={{ color: "var(--text2)" }}>{s.why}</p>
                    </div>
                  ))}
            </Section>

            <Section title="Independent LLM opinion">
              {verdict === undefined
                ? <p className="text-sm" style={{ color: "var(--text3)" }}>{running ? "Waiting for the judge model…" : "Not run."}</p>
                : verdict === null
                ? <p className="text-sm" style={{ color: "var(--text3)" }}>LLM judge unavailable (no server key configured) — relying on stylistic signals only.</p>
                : (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <Badge text={ASSESSMENT_LABEL[verdict.assessment]?.text ?? verdict.assessment} color={ASSESSMENT_LABEL[verdict.assessment]?.color ?? "#64748b"} />
                      <Badge text={`confidence: ${verdict.confidence}`} color="#64748b" />
                    </div>
                    <p className="text-sm" style={{ color: "var(--text2)" }}>{verdict.explanation}</p>
                  </div>
                )}
            </Section>
          </div>
        </>
      )}

      <div className="text-xs leading-relaxed rounded-xl p-4" data-wt="acd-limits" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text3)" }}>
        <strong style={{ color: "var(--text2)" }}>What this doesn&apos;t do:</strong> no reliable, published, general-purpose AI-vs-human code
        detector exists. Every signal here is individually weak and trivially fakeable in either direction — a careful human can write
        clean, well-documented code, and any LLM can be prompted to write messy code. This tool never outputs a probability or a
        &quot;written by AI&quot; verdict, and it shouldn&apos;t be treated as one even when several signals appear together.
      </div>
    </div>
  );
}
