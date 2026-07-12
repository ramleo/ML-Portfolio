"use client";

import { useMemo, useState } from "react";

interface SrcCol { table: string; column: string }
interface LineageCol { output: string; sources: SrcCol[] }

function parseLineage(sql: string): LineageCol[] {
  // Strip identifier quotes ("Name" → Name, `col` → col) then remove comments
  const clean = sql
    .replace(/--[^\n]*/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/["'`](\w+)["'`]/g, "$1")
    .trim();
  const upper = clean.toUpperCase();

  // Find first FROM at depth 0 (handles spaces, newlines, tabs before FROM)
  let depth = 0, fromIdx = -1;
  for (let i = 1; i < clean.length - 3; i++) {
    if (clean[i] === "(") depth++;
    else if (clean[i] === ")") depth--;
    else if (depth === 0 && /\s/.test(clean[i - 1]) && upper.slice(i, i + 4) === "FROM" && /[\s(]/.test(clean[i + 4] ?? " ")) {
      fromIdx = i; break;
    }
  }
  const selStart = upper.indexOf("SELECT");
  if (selStart < 0 || fromIdx < 0) return [];
  const selectClause = clean.slice(selStart + 6, fromIdx).trim();
  if (!selectClause || selectClause === "*") return [];

  // Table alias map
  const aliasMap = new Map<string, string>();
  for (const m of clean.matchAll(/(?:FROM|JOIN)\s+["'`]?(\w+)["'`]?(?:\s+(?:AS\s+)?(\w+))?/gi)) {
    const real = m[1], alias = (m[2] ?? m[1]);
    aliasMap.set(alias.toLowerCase(), real);
    aliasMap.set(real.toLowerCase(), real);
  }

  // Split SELECT respecting parens
  const exprs: string[] = [];
  depth = 0; let start = 0;
  for (let i = 0; i < selectClause.length; i++) {
    if (selectClause[i] === "(") depth++;
    else if (selectClause[i] === ")") depth--;
    else if (selectClause[i] === "," && depth === 0) {
      exprs.push(selectClause.slice(start, i).trim()); start = i + 1;
    }
  }
  exprs.push(selectClause.slice(start).trim());

  const SKIP = new Set(["count","sum","avg","max","min","distinct","coalesce","nullif","ifnull","iif","case","when","then","else","end","cast","strftime","date","now","length","lower","upper","trim","round","abs"]);

  // Walk right-to-left at depth 0 to find " AS alias" — avoids $ anchoring issues
  function extractAlias(expr: string): string | undefined {
    let d = 0;
    for (let i = expr.length - 1; i >= 3; i--) {
      if (expr[i] === ")") d++;
      else if (expr[i] === "(") d--;
      else if (d === 0 && i >= 2 && expr.slice(i - 1, i + 2).toUpperCase() === " AS") {
        const after = expr.slice(i + 2).trim();
        return after.match(/^(\w+)$/)?.[1];
      }
    }
    return undefined;
  }

  return exprs.flatMap(expr => {
    const alias = extractAlias(expr);
    const simpleRef = expr.trim().match(/^(?:\w+\.)?(\w+)$/)?.[1];
    const funcName = expr.trim().match(/^(\w+)\s*\(/)?.[1]?.toLowerCase();
    const output: string = alias ?? simpleRef ?? funcName ?? "?";

    // Qualified refs: tbl.col
    const qRefs = [...expr.matchAll(/\b(\w+)\.(\w+)\b/g)].map(m => ({
      table: aliasMap.get(m[1].toLowerCase()) ?? m[1],
      column: m[2],
    }));
    if (qRefs.length > 0) return [{ output, sources: qRefs }];

    // Bare column: simple `col` or `col AS alias`
    const stripped = expr.replace(/\bAS\s+\w+\s*$/i, "").trim();
    const bareId = stripped.match(/^(\w+)$/)?.[1];
    if (bareId && !SKIP.has(bareId.toLowerCase())) {
      return [{ output, sources: [{ table: "", column: bareId }] }];
    }

    // Column inside function: COUNT(DISTINCT col), SUM(tbl.col), etc.
    const funcBody = stripped.match(/\((.+)\)/)?.[1]?.replace(/\bDISTINCT\b/gi, "").trim();
    if (funcBody) {
      const fq = [...funcBody.matchAll(/\b(\w+)\.(\w+)\b/g)].map(m => ({
        table: aliasMap.get(m[1].toLowerCase()) ?? m[1],
        column: m[2],
      }));
      if (fq.length > 0) return [{ output, sources: fq }];
      const fb = funcBody.match(/^(\w+)$/)?.[1];
      if (fb && !SKIP.has(fb.toLowerCase())) return [{ output, sources: [{ table: "", column: fb }] }];
    }
    return [];
  });
}

const PALETTE = ["#818cf8","#34d399","#fb923c","#f472b6","#60a5fa","#fbbf24","#a78bfa"];

export default function ColumnLineageGraph({ sql }: { sql: string }) {
  const [open, setOpen] = useState(false);
  const columns = useMemo(() => parseLineage(sql), [sql]);
  if (columns.length === 0) return null;

  // Collect unique source keys and table colours
  const srcKeys: string[] = [];
  const seen = new Set<string>();
  const tableColor = new Map<string, string>();
  let ci = 0;
  columns.forEach(c => c.sources.forEach(s => {
    const k = s.table ? `${s.table}.${s.column}` : s.column;
    if (!seen.has(k)) { seen.add(k); srcKeys.push(k); }
    if (s.table && !tableColor.has(s.table)) tableColor.set(s.table, PALETTE[ci++ % PALETTE.length]);
  }));

  const ROW = 30, PAD = 24;
  const H = Math.max(srcKeys.length, columns.length) * ROW + PAD;
  const W = 460, LX = 132, RX = W - 104;
  const srcY = (i: number) => PAD / 2 + i * ROW;
  const outY = (i: number) => PAD / 2 + i * ROW + ((srcKeys.length - columns.length) * ROW / 2);

  return (
    <div className="rounded-xl border border-violet-500/15 bg-black/30 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-white/[0.02] transition-colors"
      >
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" className="text-violet-400 shrink-0">
          <circle cx="1.5" cy="6" r="1.5" fill="currentColor" />
          <circle cx="10.5" cy="2" r="1.5" fill="currentColor" />
          <circle cx="10.5" cy="10" r="1.5" fill="currentColor" />
          <path d="M3 6L9 2M3 6L9 10" stroke="currentColor" strokeWidth="1" strokeOpacity="0.7" />
        </svg>
        <span className="text-[10px] font-semibold text-violet-400/70 uppercase tracking-widest flex-1 text-left">
          Column Lineage
        </span>
        <span className="text-[9px] text-gray-600 mr-1">
          {srcKeys.length} source{srcKeys.length !== 1 ? "s" : ""} → {columns.length} output{columns.length !== 1 ? "s" : ""}
        </span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
          className={`text-gray-600 transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
          <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div className="px-4 pb-3 pt-1 border-t border-white/5 overflow-x-auto">
          <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ minWidth: 300, maxWidth: W }}>
            {/* Bezier edges */}
            {columns.map((col, oi) =>
              col.sources.map((src, si) => {
                const k = src.table ? `${src.table}.${src.column}` : src.column;
                const si2 = srcKeys.indexOf(k);
                const color = src.table ? (tableColor.get(src.table) ?? "#94a3b8") : "#94a3b8";
                const x1 = LX, y1 = srcY(si2), x2 = RX, y2 = outY(oi);
                const mx = (x1 + x2) / 2;
                return (
                  <path key={`e${oi}-${si}`}
                    d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`}
                    fill="none" stroke={color} strokeWidth="1.2" strokeOpacity="0.38" />
                );
              })
            )}

            {/* Source nodes */}
            {srcKeys.map((k, i) => {
              const dot = k.indexOf(".");
              const tbl = dot >= 0 ? k.slice(0, dot) : "";
              const col = dot >= 0 ? k.slice(dot + 1) : k;
              const color = tbl ? (tableColor.get(tbl) ?? "#94a3b8") : "#94a3b8";
              const y = srcY(i);
              return (
                <g key={k}>
                  <rect x="1" y={y - 11} width={LX - 10} height={22} rx="4"
                    fill={color} fillOpacity="0.08" stroke={color} strokeOpacity="0.22" strokeWidth="0.8" />
                  {tbl && <text x="6" y={y - 3} fontSize="5.5" fill={color} fillOpacity="0.6">{tbl}</text>}
                  <text x="6" y={y + (tbl ? 6 : 4)} fontSize="7" fill={color} fontFamily="monospace">{col}</text>
                  <circle cx={LX - 4} cy={y} r="2.5" fill={color} fillOpacity="0.8" />
                </g>
              );
            })}

            {/* Output nodes */}
            {columns.map((col, i) => {
              const y = outY(i);
              return (
                <g key={col.output}>
                  <circle cx={RX + 4} cy={y} r="2.5" fill="#a78bfa" fillOpacity="0.8" />
                  <rect x={RX + 9} y={y - 11} width={W - RX - 14} height={22} rx="4"
                    fill="rgba(167,139,250,0.07)" stroke="rgba(167,139,250,0.2)" strokeWidth="0.8" />
                  <text x={RX + 15} y={y + 4} fontSize="7" fill="#c4b5fd" fontFamily="monospace">{col.output}</text>
                </g>
              );
            })}
          </svg>

          {tableColor.size > 0 && (
            <div className="flex flex-wrap gap-3 mt-1 pt-2 border-t border-white/5">
              {[...tableColor.entries()].map(([tbl, color]) => (
                <span key={tbl} className="flex items-center gap-1.5 text-[9px]" style={{ color }}>
                  <span className="w-2 h-2 rounded-sm inline-block" style={{ background: color, opacity: 0.55 }} />
                  {tbl}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}