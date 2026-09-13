"use client";
import type { ColumnProfile } from "./edaTypes";

/** The colour-by control shared by the scatter matrix and the 3D projection.
 *
 *  Both charts receive every candidate series from the server up front, so
 *  changing this is a relabel of data already in the browser — no request, no
 *  spinner. */
export default function EdaColorPicker({
  options, value, onChange, label = "Colour by",
}: {
  options: string[];
  value: string | null;
  onChange: (v: string | null) => void;
  label?: string;
}) {
  if (options.length === 0) return null;
  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}>
      <span style={{ fontSize: "0.68rem", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text3)" }}>
        {label}
      </span>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        style={{
          background: "var(--bg-card)", color: "var(--text)", border: "1px solid var(--border)",
          borderRadius: 7, padding: "0.25rem 0.45rem", fontSize: "0.78rem", maxWidth: 180,
        }}
      >
        <option value="">none</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}

/** Plotly's 3D and matrix marks take numbers, not category names, so a text
 *  series becomes integer codes plus a tick label per code. Capping the
 *  legend at twelve entries is deliberate: a colour bar with ninety labels is
 *  unreadable and the hover still names the real value. */
export function encode(values: string[] | undefined, columnName: string | null, textColor: string) {
  if (!values || values.length === 0 || !columnName) {
    return { codes: null as number[] | null, hover: [] as string[], colorbar: undefined };
  }
  const unique = [...new Set(values)];
  return {
    codes: values.map((v) => unique.indexOf(v)),
    hover: values,
    colorbar: {
      thickness: 10, len: 0.6,
      tickfont: { size: 9, color: textColor },
      tickvals: unique.map((_, i) => i),
      ticktext: unique.length <= 12 ? unique : unique.slice(0, 12).concat(["…"]),
      title: { text: columnName, font: { size: 9, color: textColor } },
    },
  };
}

/**
 * Which of the server's colour-by candidates are worth offering.
 *
 * The backend includes any non-numeric column, and on a real dataset that
 * sweeps in the customer ID: 401 unique values, one colour each, a rainbow
 * that encodes nothing and a colour bar taller than the chart. A colour
 * channel can carry a handful of categories, so anything past twenty is
 * dropped, and so is a column with only one value, which colours every point
 * the same.
 */
export function usableColorCols(candidates: string[], columns: ColumnProfile[]): string[] {
  const nunique = new Map(columns.map((c) => [c.name, c.nunique]));
  return candidates.filter((name) => {
    const n = nunique.get(name);
    return n !== undefined && n >= 2 && n <= 20;
  });
}
