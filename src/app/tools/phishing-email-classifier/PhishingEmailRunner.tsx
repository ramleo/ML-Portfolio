"use client";

import { useState } from "react";
import { classifyEmailBody, checkRuleBasedFlags, MEASURED_HELD_OUT_ACCURACY, type ClassifyResult, type RuleFlags } from "./emailBodyClassifier";
import { SAMPLE_PHISHING_EMAIL, SAMPLE_SAFE_EMAIL } from "./sampleEmails";

/** Two independent signals, shown side by side rather than fused into one
 * score: a real trained Multinomial Naive Bayes classifier (with its
 * actual top contributing words as evidence) and a small, transparent,
 * non-exhaustive rule-based flag list. Fully client-side — the shipped
 * model artifact and all scoring run entirely in the browser. */
export default function PhishingEmailRunner({ accent }: { accent: string }) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<ClassifyResult | null | undefined>(undefined);
  const [flags, setFlags] = useState<RuleFlags | null>(null);

  const run = (value: string) => {
    setText(value);
    setResult(classifyEmailBody(value));
    setFlags(value.trim() ? checkRuleBasedFlags(value) : null);
  };

  const reset = () => {
    setText("");
    setResult(undefined);
    setFlags(null);
  };

  const cardStyle: React.CSSProperties = {
    background: "var(--bg-glass)", border: "1px solid var(--border)", borderRadius: 16,
  };

  return (
    <div className="flex flex-col gap-4">
      <div style={cardStyle} className="p-5">
        <p className="text-xs mb-3" style={{ color: "var(--text3)" }}>
          Paste the body text of an email. A trained Naive Bayes classifier ({Math.round(MEASURED_HELD_OUT_ACCURACY * 100)}%
          {" "}measured accuracy on a real held-out test set) scores the language itself — not the sender, links,
          or headers, which the site&apos;s other phishing tools already cover.
        </p>
        <textarea
          value={text}
          onChange={e => run(e.target.value)}
          placeholder="Paste the body text of an email here…"
          rows={9}
          spellCheck={false}
          className="w-full text-xs rounded-lg px-3 py-2 mb-3"
          style={{ background: "var(--bg-glass)", border: "1px solid var(--border2)", color: "var(--text)" }}
        />
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => run(SAMPLE_PHISHING_EMAIL)}
            className="text-[11px] px-3 py-2 rounded-lg border transition-colors"
            style={{ borderColor: `${accent}50`, color: accent }}>
            Try a phishing example
          </button>
          <button onClick={() => run(SAMPLE_SAFE_EMAIL)}
            className="text-[11px] px-3 py-2 rounded-lg border transition-colors"
            style={{ borderColor: `${accent}50`, color: accent }}>
            Try a safe example
          </button>
          {text && (
            <button onClick={reset}
              className="text-[11px] px-3 py-2 rounded-lg border transition-colors"
              style={{ borderColor: "var(--border2)", color: "var(--text3)" }}>
              Clear
            </button>
          )}
        </div>
      </div>

      {result === null && (
        <div style={cardStyle} className="p-4">
          <p className="text-xs" style={{ color: "var(--text3)" }}>
            Not enough recognizable words to score — try pasting more of the email&apos;s body text.
          </p>
        </div>
      )}

      {result && (
        <div style={cardStyle} className="p-5">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
            <span className="text-sm font-bold"
              style={{ color: result.verdict === "phishing" ? "#f87171" : "#34d399" }}>
              {result.verdict === "phishing" ? "Likely phishing" : "Likely safe"}
            </span>
            <span className="text-[11px]" style={{ color: "var(--text3)" }}>
              {Math.round(result.phishingProbability * 100)}% phishing probability
            </span>
          </div>
          <p className="text-[11px] mb-2" style={{ color: "var(--text3)" }}>Top contributing words (real model evidence, not fabricated):</p>
          <div className="flex flex-wrap gap-1.5">
            {result.topWords.map(w => (
              <span key={w.word} className="text-[11px] px-2 py-0.5 rounded-full"
                style={{
                  background: w.delta > 0 ? "#f8717118" : "#34d39918",
                  color: w.delta > 0 ? "#f87171" : "#34d399",
                  border: `1px solid ${w.delta > 0 ? "#f8717140" : "#34d39940"}`,
                }}>
                {w.word}{w.count > 1 ? ` ×${w.count}` : ""}
              </span>
            ))}
          </div>
        </div>
      )}

      {flags && (
        <div style={cardStyle} className="p-5">
          <p className="text-xs mb-2 font-semibold" style={{ color: "var(--text)" }}>Rule-based flags (independent, transparent)</p>
          {flags.urgencyPhrases.length === 0 && !flags.genericGreeting ? (
            <p className="text-[11px]" style={{ color: "var(--text3)" }}>No urgency phrasing or generic greeting matched.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {flags.urgencyPhrases.map(p => (
                <li key={p} className="text-[11px]" style={{ color: "#fbbf24" }}>• Urgency phrasing: &quot;{p}&quot;</li>
              ))}
              {flags.genericGreeting && (
                <li className="text-[11px]" style={{ color: "#fbbf24" }}>• Generic greeting: &quot;{flags.genericGreeting}&quot;</li>
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
