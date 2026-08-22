export function highlightSQL(sql: string) {
  const re = /("(?:[^"\\]|\\.)*")|('(?:[^'\\]|\\.)*')|(\b\d+(?:\.\d+)?\b)|(\b(?:SELECT|FROM|WHERE|JOIN|LEFT|RIGHT|INNER|OUTER|CROSS|ON|AS|GROUP BY|ORDER BY|HAVING|LIMIT|OFFSET|AND|OR|NOT|IN|LIKE|IS|NULL|DISTINCT|COUNT|SUM|AVG|MAX|MIN|ROUND|WITH|UNION|ALL|BY|DESC|ASC|CASE|WHEN|THEN|ELSE|END)\b)/gi;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parts: any[] = [];
  let last = 0, m: RegExpExecArray | null;
  while ((m = re.exec(sql)) !== null) {
    if (m.index > last) parts.push(sql.slice(last, m.index));
    if (m[1] || m[2])  parts.push(<span key={m.index} className="text-emerald-400">{m[0]}</span>);
    else if (m[3])     parts.push(<span key={m.index} className="text-amber-400">{m[0]}</span>);
    else if (m[4])     parts.push(<span key={m.index} className="text-indigo-400 font-semibold">{m[0]}</span>);
    last = m.index + m[0].length;
  }
  if (last < sql.length) parts.push(sql.slice(last));
  return parts;
}

export function formatCell(cell: unknown): string {
  if (cell === null) return "";
  const n = Number(cell);
  if (!isNaN(n) && String(cell).trim() !== "" && String(cell) !== String(Math.round(n))) return n.toFixed(2);
  return String(cell);
}

export function cleanErr(e: string): string {
  if (/429|Too Many Requests|rate.?limit/i.test(e)) return "Rate limit reached — wait ~60 seconds, then try again or switch to a different provider.";
  if (/All providers failed/i.test(e)) return "All providers failed — API keys may be rate-limited. Wait a moment or switch provider.";
  return e;
}

export function csvEscape(v: unknown): string {
  const s = v === null ? "" : String(v);
  return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
}

export function downloadFile(content: string, name: string, mime: string) {
  const a = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(new Blob([content], { type: mime })),
    download: name,
  });
  a.click();
  URL.revokeObjectURL(a.href);
}

export function SqlDiff({ original, edited }: { original: string; edited: string }) {
  const orig = original.split("\n"); const edit = edited.split("\n");
  const maxLen = Math.max(orig.length, edit.length);
  const lines = Array.from({ length: maxLen }, (_, i) => {
    const o = orig[i] ?? ""; const e = edit[i] ?? "";
    const type = o === e ? "same" : o === "" ? "add" : e === "" ? "del" : "chg";
    return { o, e, type };
  }).filter(l => l.type !== "same");
  if (!lines.length) return null;
  return (
    <div className="mt-2 rounded border border-[var(--border)] overflow-hidden text-[10px] font-mono">
      {lines.map((l, i) => (
        <div key={i}>
          {(l.type === "del" || l.type === "chg") && (
            <div className="px-2 py-0.5 bg-red-500/10 text-red-400 flex gap-2"><span className="opacity-40">−</span><span>{l.o}</span></div>
          )}
          {(l.type === "add" || l.type === "chg") && (
            <div className="px-2 py-0.5 bg-green-500/10 text-green-400 flex gap-2"><span className="opacity-40">+</span><span>{l.e}</span></div>
          )}
        </div>
      ))}
    </div>
  );
}

export function exportNotebook(question: string, sql: string, explanation: string) {
  const codeLines = [
    "import sqlite3\nimport pandas as pd\n\n",
    "# Download Chinook DB: https://github.com/lerocha/chinook-database\n",
    "conn = sqlite3.connect('chinook.db')\n\n",
    `df = pd.read_sql_query("""\n${sql}\n""", conn)\n`,
    "df",
  ].join("");
  const cells = [
    { cell_type: "markdown", metadata: {}, source: [`# ${question}`] },
    { cell_type: "code", metadata: {}, execution_count: null, outputs: [], source: [codeLines] },
    ...(explanation ? [{ cell_type: "markdown", metadata: {}, source: [`## Explanation\n\n${explanation}`] }] : []),
  ];
  const nb = {
    nbformat: 4, nbformat_minor: 5,
    metadata: { kernelspec: { display_name: "Python 3", language: "python", name: "python3" }, language_info: { name: "python", version: "3.10.0" } },
    cells,
  };
  downloadFile(JSON.stringify(nb, null, 2), "query.ipynb", "application/json");
}