"use client";
import EdaSection, { Scroller } from "./EdaSection";
import type { EdaResult, Sample } from "./edaTypes";

const th: React.CSSProperties = {
  textAlign: "left", padding: "0.5rem 0.7rem", fontSize: "0.62rem",
  fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
  color: "var(--text3)", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap",
};
const td: React.CSSProperties = {
  padding: "0.45rem 0.7rem", fontSize: "0.8rem", color: "var(--text2)",
  borderBottom: "1px solid var(--border)", whiteSpace: "nowrap",
  fontVariantNumeric: "tabular-nums", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis",
};

/** An empty cell is rendered as "—" in a muted italic, never as the text
 *  "null". A reader scanning a table cannot tell a missing value from a
 *  string that happens to spell it. */
function Cell({ value }: { value: string | number | null }) {
  if (value === null || value === undefined || value === "") {
    return <span style={{ color: "var(--text3)", fontStyle: "italic" }}>—</span>;
  }
  return <>{String(value)}</>;
}

function Table({ data }: { data: Sample }) {
  return (
    <Scroller min={Math.max(400, data.columns.length * 130)}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>{data.columns.map((c) => <th key={c} style={th}>{c}</th>)}</tr>
        </thead>
        <tbody>
          {data.rows.map((row, i) => (
            <tr key={i}>
              {row.map((v, j) => <td key={j} style={td}><Cell value={v} /></td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </Scroller>
  );
}

export default function EdaTables({ result }: { result: EdaResult }) {
  const dup = result.duplicate_rows;

  return (
    <>
      <EdaSection
        id="sample"
        testId="eda-sample"
        title="First rows"
        icon="table"
        meta={`first ${result.sample.rows.length} of ${result.overview.rows.toLocaleString()} rows`}
        note="The first five rows exactly as the parser read them. Worth a glance before trusting anything below: a shifted delimiter or a header row read as data shows up here and nowhere else."
      >
        <Table data={result.sample} />
      </EdaSection>

      {dup && dup.rows.length > 0 && (
        <EdaSection
          id="duplicates"
          testId="eda-duplicates"
          title="Duplicate rows"
          icon="table"
          note={`${result.overview.duplicates.toLocaleString()} row${result.overview.duplicates === 1 ? " is an exact repeat" : "s are exact repeats"} of an earlier one${dup.rows.length < result.overview.duplicates ? `; the first ${dup.rows.length} are shown` : ""}. Training on repeats weights those examples twice and leaks them across a train/test split.`}
        >
          <Table data={dup} />
        </EdaSection>
      )}
    </>
  );
}
