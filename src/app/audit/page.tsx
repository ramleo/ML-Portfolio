"use client";
import { useEffect, useState } from "react";

/** Click-audit viewer (Plan #2) — the dispute UI.
 *
 * An unlisted, standalone admin page (not in any public nav, not a tool card).
 * It is a thin client over /api/audit/lookup: the page itself is harmless to load,
 * because the data stays behind the AUDIT_ADMIN_KEY gate on the endpoint. The key
 * is entered here and remembered per-viewer in sessionStorage for convenience.
 *
 * Answers one question: did <actor> click <control> between <start> and <end>?
 */

interface RowMeta {
  tag?: string;
  role?: string;
  type?: string;
  label?: string;
  id?: string;
  testid?: string;
  name?: string;
  path?: string;
  value?: string;
}
interface Row {
  event_uuid: string;
  actor: string;
  control: string;
  path: string;
  client_ts: string;
  created_at: string;
  meta?: RowMeta;
}
interface LookupResult {
  actor: string;
  control: string | null;
  mode: "control" | "timeline";
  window: { start: string; end: string };
  clicked: boolean;
  count: number;
  rows: Row[];
}

/** A short human-readable "what was clicked" from the content-free meta. */
function describeRow(r: Row): string {
  const m = r.meta || {};
  if (m.label) return `${m.tag || "?"} “${m.label}”`;
  if (r.control.startsWith("audit:")) return `tagged: ${r.control.slice(6)}`;
  if (r.control.startsWith("testid:")) return `testid: ${r.control.slice(7)}`;
  if (r.control.startsWith("#")) return `#${r.control.slice(1)}`;
  const bits = [m.tag, m.role && `role=${m.role}`, m.type && `type=${m.type}`].filter(Boolean);
  return bits.join(" ") || r.control;
}

function localInput(d: Date): string {
  // value for <input type="datetime-local"> in local time
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default function AuditViewerPage() {
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 3600 * 1000);

  const [key, setKey] = useState("");
  const [actor, setActor] = useState("");
  const [control, setControl] = useState("");
  const [start, setStart] = useState(localInput(dayAgo));
  const [end, setEnd] = useState(localInput(now));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LookupResult | null>(null);

  useEffect(() => {
    try {
      const k = sessionStorage.getItem("_ml_audit_key");
      if (k) setKey(k);
    } catch { /* storage blocked */ }
  }, []);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    if (!key || !actor) {
      setError("Enter the admin key and an actor. Control is optional — leave it blank to see every click.");
      return;
    }
    try {
      sessionStorage.setItem("_ml_audit_key", key);
    } catch { /* storage blocked */ }
    setLoading(true);
    try {
      // datetime-local has minute precision. Make the end bound inclusive of the
      // whole selected minute (+59.999s), so a click later in that minute isn't
      // silently excluded; the start bound stays at :00 of its minute.
      const qs = new URLSearchParams({
        actor,
        control,
        start: new Date(start).toISOString(),
        end: new Date(new Date(end).getTime() + 59_999).toISOString(),
      });
      const res = await fetch(`/api/audit/lookup?${qs.toString()}`, {
        headers: { "x-audit-key": key },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const map: Record<number, string> = {
          401: "Unauthorized — wrong admin key.",
          503: "Lookup not configured on the server (set AUDIT_ADMIN_KEY), or the table is missing.",
          400: "Actor and control are required.",
        };
        setError(map[res.status] ?? (data.error || `Request failed (${res.status}).`));
        return;
      }
      setResult(data as LookupResult);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "2.5rem 1rem 4rem", color: "var(--fg, #e5e7eb)" }}>
      <p style={{ textTransform: "uppercase", letterSpacing: "0.08em", fontSize: 12, opacity: 0.6, margin: "0 0 0.4rem" }}>
        Internal · Click audit
      </p>
      <h1 style={{ fontSize: "1.9rem", fontWeight: 700, margin: "0 0 0.5rem" }}>Did they click it?</h1>
      <p style={{ opacity: 0.75, margin: "0 0 1.75rem", lineHeight: 1.5 }}>
        Look up whether an actor clicked a specific control in a time window. Empty means
        no such click was recorded. On this site the actor is the random session id; in a
        signed-in app it is the user id.
      </p>

      <form onSubmit={run} style={{ display: "grid", gap: "0.9rem" }}>
        <Field label="Admin key">
          <input type="password" value={key} onChange={(e) => setKey(e.target.value)}
            placeholder="AUDIT_ADMIN_KEY" autoComplete="off" style={inputStyle} />
        </Field>
        <Field label="Actor (session id / user id)">
          <input value={actor} onChange={(e) => setActor(e.target.value)}
            placeholder="e.g. 9befd38b-e28a-4bb4-…" style={inputStyle} />
        </Field>
        <Field label="Control (optional — blank = every click)">
          <input value={control} onChange={(e) => setControl(e.target.value)}
            placeholder="blank for all, or e.g. audit:save-btn / #submit" style={inputStyle} />
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.9rem" }}>
          <Field label="From">
            <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} style={inputStyle} />
          </Field>
          <Field label="To">
            <input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} style={inputStyle} />
          </Field>
        </div>
        <button type="submit" disabled={loading}
          style={{
            marginTop: "0.4rem", padding: "0.7rem 1rem", borderRadius: 10, border: "none",
            background: "var(--accent, #6366f1)", color: "#fff", fontWeight: 600,
            cursor: loading ? "wait" : "pointer", opacity: loading ? 0.7 : 1,
          }}>
          {loading ? "Looking up…" : "Look up"}
        </button>
      </form>

      {error && (
        <p role="alert" style={{ marginTop: "1.5rem", padding: "0.8rem 1rem", borderRadius: 10,
          background: "rgba(239,68,68,0.12)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.35)" }}>
          {error}
        </p>
      )}

      {result && (
        <div style={{ marginTop: "1.75rem" }}>
          <div style={{
            padding: "1rem 1.1rem", borderRadius: 12,
            background: result.clicked ? "rgba(16,185,129,0.12)" : "rgba(148,163,184,0.12)",
            border: `1px solid ${result.clicked ? "rgba(16,185,129,0.4)" : "rgba(148,163,184,0.35)"}`,
          }}>
            <strong style={{ fontSize: "1.05rem", color: result.clicked ? "#6ee7b7" : "#cbd5e1" }}>
              {result.mode === "control"
                ? (result.clicked
                    ? `Yes — ${result.control} was clicked ${result.count} time${result.count === 1 ? "" : "s"}.`
                    : `No record — ${result.control} was not clicked in this window.`)
                : (result.clicked
                    ? `${result.count} click${result.count === 1 ? "" : "s"} recorded for this actor in the window.`
                    : `No clicks recorded for this actor in this window.`)}
            </strong>
            <div style={{ fontSize: 13, opacity: 0.6, marginTop: 4 }}>
              actor {result.actor} · {new Date(result.window.start).toLocaleString()} → {new Date(result.window.end).toLocaleString()}
            </div>
          </div>

          {result.rows.length > 0 && (
            <div style={{ overflowX: "auto", marginTop: "1rem" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ textAlign: "left", opacity: 0.6 }}>
                    <th style={th}>Clicked at (browser)</th>
                    <th style={th}>What was clicked</th>
                    <th style={th}>Control id</th>
                    <th style={th}>Path</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((r) => (
                    <tr key={r.event_uuid} style={{ borderTop: "1px solid var(--border, rgba(148,163,184,0.2))" }}>
                      <td style={td}>{new Date(r.client_ts).toLocaleString()}</td>
                      <td style={td}>{describeRow(r)}</td>
                      <td style={{ ...td, fontFamily: "monospace", opacity: 0.7, maxWidth: 240, overflowWrap: "anywhere" }}>{r.control}</td>
                      <td style={td}>{r.path}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "0.6rem 0.75rem", borderRadius: 9,
  border: "1px solid var(--border, rgba(148,163,184,0.3))",
  background: "var(--bg2, rgba(255,255,255,0.04))", color: "inherit", fontSize: 14,
};
const th: React.CSSProperties = { padding: "0.5rem 0.6rem", fontWeight: 600 };
const td: React.CSSProperties = { padding: "0.5rem 0.6rem", verticalAlign: "top" };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block" }}>
      <span style={{ display: "block", fontSize: 13, opacity: 0.7, marginBottom: 4 }}>{label}</span>
      {children}
    </label>
  );
}
