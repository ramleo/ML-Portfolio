"use client";

import { useState } from "react";
import { usePasswordAudit } from "./usePasswordAudit";

const SCORE_COLOR = ["#f87171", "#fb923c", "#fbbf24", "#a3e635", "#34d399"];
const SCORE_LABEL = ["Very weak", "Weak", "Fair", "Strong", "Very strong"];

/** Password strength via zxcvbn (real pattern-matching algorithm, not
 * character-class entropy) as you type, plus an on-demand k-anonymity
 * breach lookup against Have I Been Pwned's Pwned Passwords API. The
 * password is never stored (no history) and never leaves the browser as
 * plaintext — the breach check sends only a 5-character SHA-1 hash prefix,
 * directly to HIBP's own API, with no backend of any kind involved. */
export default function PasswordAuditRunner({ accent }: { accent: string }) {
  const { password, setPassword, strength, breach, checkBreach, reset } = usePasswordAudit();
  const [show, setShow] = useState(false);

  const cardStyle: React.CSSProperties = {
    background: "var(--bg-glass)", border: "1px solid var(--border)", borderRadius: 16,
  };

  return (
    <div className="flex flex-col gap-4">
      <div style={cardStyle} className="p-5">
        <p className="text-xs mb-4" style={{ color: "var(--text3)" }}>
          Type a password below. Strength is scored entirely in your browser using zxcvbn — the same
          pattern-matching technique (dictionaries, keyboard walks, dates, repeats) real password meters use,
          not a naive character-class count. Nothing is sent anywhere for this part.
        </p>

        <div className="flex items-center gap-2">
          <input
            type={show ? "text" : "password"}
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            placeholder="Type a password to audit…"
            className="flex-1 text-sm rounded-lg px-3 py-2 min-w-0"
            style={{ background: "var(--bg-glass)", border: "1px solid var(--border2)", color: "var(--text)" }}
          />
          <button onClick={() => setShow(s => !s)}
            className="text-[11px] px-3 py-2 rounded-lg border shrink-0 transition-colors"
            style={{ borderColor: "var(--border2)", color: "var(--text3)" }}>
            {show ? "Hide" : "Show"}
          </button>
          {password && (
            <button onClick={reset}
              className="text-[11px] px-3 py-2 rounded-lg border shrink-0 transition-colors"
              style={{ borderColor: "var(--border2)", color: "var(--text3)" }}>
              Clear
            </button>
          )}
        </div>

        {strength && (
          <div className="mt-4">
            <div className="flex gap-1 mb-2">
              {[0, 1, 2, 3, 4].map(i => (
                <div key={i} className="h-1.5 flex-1 rounded-full transition-colors"
                  style={{ background: i <= strength.score ? SCORE_COLOR[strength.score] : "var(--border)" }} />
              ))}
            </div>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-sm font-bold" style={{ color: SCORE_COLOR[strength.score] }}>
                {SCORE_LABEL[strength.score]}
              </span>
              <span className="text-[11px]" style={{ color: "var(--text3)" }}>
                Estimated offline crack time: {strength.crackTimeDisplay}
              </span>
            </div>
            {strength.warning && (
              <p className="text-[11px] mt-2" style={{ color: SCORE_COLOR[strength.score] }}>{strength.warning}</p>
            )}
            {strength.suggestions.length > 0 && (
              <ul className="mt-1 flex flex-col gap-0.5">
                {strength.suggestions.map((s, i) => (
                  <li key={i} className="text-[11px]" style={{ color: "var(--text3)" }}>• {s}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {password && (
        <div style={cardStyle} className="p-5">
          <p className="text-xs mb-3" style={{ color: "var(--text3)" }}>
            Separately, check whether this exact password has appeared in a known data breach — via Have
            I Been Pwned&apos;s Pwned Passwords database, using k-anonymity: your password is hashed (SHA-1,
            HIBP&apos;s own requirement) right here in your browser, and only the first 5 characters of that
            hash are ever sent. The full password and full hash never leave your device.
          </p>
          <button onClick={checkBreach} disabled={breach.status === "checking"}
            className="text-sm px-4 py-2 rounded-lg font-semibold transition-colors"
            style={{ background: accent, color: "#fff", opacity: breach.status === "checking" ? 0.6 : 1 }}>
            {breach.status === "checking" ? "Checking…" : "Check breach exposure"}
          </button>

          {breach.status === "clean" && (
            <p className="text-xs mt-3 font-semibold" style={{ color: "#34d399" }}>
              Not found in the Pwned Passwords database — reassuring, but not a guarantee of strength on its
              own. Use the meter above for that.
            </p>
          )}
          {breach.status === "pwned" && (
            <p className="text-xs mt-3 font-semibold" style={{ color: "#f87171" }}>
              Found in {breach.count.toLocaleString()} previously breached password{breach.count === 1 ? "" : "s"}{" "}
              — this password is known to attackers. Change it anywhere it&apos;s used.
            </p>
          )}
          {breach.status === "error" && (
            <p className="text-xs mt-3" style={{ color: "#f87171" }}>{breach.message}</p>
          )}
        </div>
      )}
    </div>
  );
}
