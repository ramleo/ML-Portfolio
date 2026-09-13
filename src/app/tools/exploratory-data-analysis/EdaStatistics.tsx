"use client";
import EdaSection, { Scroller } from "./EdaSection";
import type { ColumnStats, EdaResult } from "./edaTypes";

/**
 * The statistics panel: which columns carry outliers, which are skewed, and
 * the full numeric detail behind both.
 *
 * The rebuild shipped without this section entirely — it is item 8 of the
 * build spec and the one panel that ranks columns against each other. The
 * table below repeats numbers that also appear per-column elsewhere; the two
 * bar charts are the part that cannot be read off a table, because sorting
 * thirty rows by eye is the work they remove.
 */

/** "—", never "0" and never "null". A statistic that does not exist for a
 *  column and one that happens to be zero are different facts. */
function num(value: number | null | undefined, digits = 2): string {
  return value === null || value === undefined ? "—" : Number(value).toFixed(digits);
}

/** Sorting needs a number. A null skew is not "zero skew", so it sorts last
 *  rather than into the middle of the ranking as 0 would. */
function magnitude(value: number | null | undefined): number {
  return value === null || value === undefined ? -1 : Math.abs(value);
}

const label: React.CSSProperties = {
  fontSize: "0.68rem", fontWeight: 700, color: "var(--text3)",
  textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.6rem",
};

const th: React.CSSProperties = {
  padding: "0.5rem 0.7rem", fontSize: "0.62rem", fontWeight: 700,
  letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text3)",
  borderBottom: "1px solid var(--border)", whiteSpace: "nowrap", textAlign: "right",
};
const td: React.CSSProperties = {
  padding: "0.45rem 0.7rem", fontSize: "0.8rem", color: "var(--text2)",
  borderBottom: "1px solid var(--border)", whiteSpace: "nowrap",
  fontVariantNumeric: "tabular-nums", textAlign: "right",
};

/** One row of a one-directional ranking: name, bar, value. */
function Bar({ name, pct, color, value }: { name: string; pct: number; color: string; value: string }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,96px) 1fr 54px", alignItems: "center", gap: "0.6rem", marginBottom: "0.3rem" }}>
      <span title={name} style={{ fontSize: "0.72rem", color: "var(--text2)", textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {name}
      </span>
      <span style={{ height: 8, borderRadius: 4, background: "var(--border)", overflow: "hidden" }}>
        <span style={{ display: "block", width: `${Math.min(100, pct)}%`, height: "100%", background: color, borderRadius: 4 }} />
      </span>
      <span style={{ fontSize: "0.72rem", fontWeight: 700, color, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
        {value}
      </span>
    </div>
  );
}

/** A ranking that has a sign. The bar grows left or right from a centre line,
 *  because a skew of −2 and one of +2 are equally strong and opposite, and a
 *  bar that only grows one way loses the half of that which matters. */
function SignedBar({ name, pct, negative, color, value }: {
  name: string; pct: number; negative: boolean; color: string; value: string;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,96px) 1fr 54px", alignItems: "center", gap: "0.6rem", marginBottom: "0.3rem" }}>
      <span title={name} style={{ fontSize: "0.72rem", color: "var(--text2)", textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {name}
      </span>
      <span style={{ position: "relative", height: 8, borderRadius: 4, background: "var(--border)" }}>
        <span aria-hidden style={{ position: "absolute", left: "50%", top: -2, bottom: -2, width: 1, background: "var(--border2)" }} />
        <span style={{
          position: "absolute", top: 0, height: "100%",
          width: `${Math.min(50, pct / 2)}%`,
          [negative ? "right" : "left"]: "50%",
          background: color, borderRadius: 4,
        }} />
      </span>
      <span style={{ fontSize: "0.72rem", fontWeight: 700, color, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
        {value}
      </span>
    </div>
  );
}

function skewColor(skew: number): string {
  const abs = Math.abs(skew);
  return abs > 2 ? "#f87171" : abs > 1 ? "#fbbf24" : "#38bdf8";
}

export default function EdaStatistics({ result }: { result: EdaResult }) {
  const stats: [string, ColumnStats][] = Object.entries(result.stats);
  const rows = Math.max(result.overview.rows, 1);

  const withOutliers = stats.filter(([, s]) => s.outliers > 0)
                            .sort((a, b) => b[1].outliers - a[1].outliers);
  const maxOutliers = withOutliers.length ? withOutliers[0][1].outliers : 1;

  const skewed = stats.filter(([, s]) => s.skew !== null)
                      .sort((a, b) => magnitude(b[1].skew) - magnitude(a[1].skew));
  const maxSkew = skewed.length ? magnitude(skewed[0][1].skew) || 1 : 1;

  return (
    <EdaSection
      id="statistics"
      testId="eda-statistics"
      title="Statistics"
      icon="chart"
      meta={`${stats.length} numeric column${stats.length === 1 ? "" : "s"}`}
      note="Columns ranked against each other, worst first. Outliers are counted by the interquartile rule; skew is signed, so a bar to the left of centre means a long tail of small values."
      empty={stats.length === 0
        ? "No numeric column produced statistics, so there is nothing to rank. Text columns have no mean, spread or skew."
        : undefined}
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.6rem", marginBottom: "1.4rem" }}>
        <div style={{ minWidth: 0 }}>
          <div style={label}>Outliers (IQR)</div>
          {withOutliers.length === 0 ? (
            <p style={{ fontSize: "0.78rem", color: "var(--text3)", margin: 0 }}>
              No outliers detected in any numeric column.
            </p>
          ) : withOutliers.map(([name, s]) => (
            <Bar
              key={name}
              name={name}
              pct={(s.outliers / maxOutliers) * 100}
              color="#fbbf24"
              value={`${(Math.round(s.outliers / rows * 1000) / 10).toFixed(1)}%`}
            />
          ))}
        </div>

        <div style={{ minWidth: 0 }}>
          <div style={label}>Skewness</div>
          {skewed.length === 0 ? (
            <p style={{ fontSize: "0.78rem", color: "var(--text3)", margin: 0 }}>
              Skew needs at least three values in a column. None here has enough.
            </p>
          ) : skewed.map(([name, s]) => {
            const skew = s.skew as number;
            return (
              <SignedBar
                key={name}
                name={name}
                pct={(Math.abs(skew) / maxSkew) * 100}
                negative={skew < 0}
                color={skewColor(skew)}
                value={`${skew >= 0 ? "+" : ""}${skew.toFixed(2)}`}
              />
            );
          })}
        </div>
      </div>

      <div style={label}>Full detail</div>
      <Scroller min={720}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ ...th, textAlign: "left" }}>Column</th>
              {["Mean", "Median", "Std", "Min", "Max", "Skew", "Kurtosis", "Outliers"].map((h) => (
                <th key={h} style={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stats.map(([name, s]) => (
              <tr key={name}>
                <td style={{ ...td, textAlign: "left", color: "var(--text)", fontWeight: 600 }}>{name}</td>
                <td style={td}>{num(s.mean)}</td>
                <td style={td}>{num(s.median)}</td>
                <td style={td}>{num(s.std)}</td>
                <td style={td}>{num(s.min)}</td>
                <td style={td}>{num(s.max)}</td>
                <td style={{ ...td, color: s.skew === null ? "var(--text2)" : skewColor(s.skew) }}>
                  {num(s.skew)}
                </td>
                <td style={td}>{num(s.kurtosis)}</td>
                <td style={{ ...td, color: s.outliers > 0 ? "#fbbf24" : "var(--text3)" }}>{s.outliers}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Scroller>
    </EdaSection>
  );
}
