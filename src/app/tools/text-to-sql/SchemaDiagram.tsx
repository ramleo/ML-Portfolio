"use client";

import { useState, useRef, useCallback, useMemo } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface FKRel  { from_col: string; to_table: string; to_col: string; }
interface Col    { name: string; type: string; pk: boolean; }
interface Table  { columns: Col[]; row_count: number; foreign_keys?: FKRel[]; }

interface Props { schema: Record<string, Table>; onClose: () => void; }

// ── Constants ─────────────────────────────────────────────────────────────────
const TW       = 186;   // table card width
const HEADER_H = 34;
const ROW_H    = 18;
const COL_GAP  = 240;
const ROW_GAP  = 48;
const COLS     = 4;
const ACCENT   = "#6366f1";

const PALETTE = [
  "#6366f1","#06b6d4","#10b981","#f59e0b",
  "#ec4899","#8b5cf6","#ef4444","#14b8a6",
  "#f97316","#84cc16","#3b82f6","#a78bfa",
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const th = (cols: Col[]) => HEADER_H + cols.length * ROW_H + 6;

function autoLayout(names: string[], schema: Record<string, Table>) {
  const pos: Record<string, { x: number; y: number }> = {};
  let col = 0, x = 24, y = 24, rowH = 0;
  names.forEach(n => {
    pos[n] = { x, y };
    rowH = Math.max(rowH, th(schema[n].columns));
    col++;
    if (col >= COLS) { col = 0; x = 24; y += rowH + ROW_GAP; rowH = 0; }
    else { x += COL_GAP; }
  });
  return pos;
}

function bezier(sx: number, sy: number, tx: number, ty: number): string {
  const cx = Math.min(Math.abs(tx - sx) / 2, 90);
  return `M${sx},${sy} C${sx > tx ? sx - cx : sx + cx},${sy} ${tx > sx ? tx - cx : tx + cx},${ty} ${tx},${ty}`;
}

// ── Key SVG icon ──────────────────────────────────────────────────────────────
function KeyIcon() {
  return (
    <svg width="9" height="9" viewBox="0 0 12 12" fill="none" style={{ display: "inline", verticalAlign: "middle" }}>
      <circle cx="4.5" cy="4.5" r="3" stroke="#f59e0b" strokeWidth="1.5"/>
      <path d="M7 7l3.5 3.5M9 7.5l1 1" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg width="9" height="9" viewBox="0 0 12 12" fill="none" style={{ display: "inline", verticalAlign: "middle" }}>
      <path d="M5 6a3 3 0 004.24 0l1.42-1.42a3 3 0 00-4.24-4.24L5 1.76" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M7 6a3 3 0 01-4.24 0L1.34 7.42a3 3 0 004.24 4.24L7 10.24" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function SchemaDiagram({ schema, onClose }: Props) {
  const names = useMemo(() => Object.keys(schema), [schema]);

  const [pos, setPos]         = useState(() => autoLayout(names, schema));
  const [selected, setSelected] = useState<string | null>(null);
  const [vp, setVp]           = useState({ x: 0, y: 0, s: 0.85 });
  const drag = useRef<{ kind: "tbl" | "bg"; name?: string; sx: number; sy: number; ox: number; oy: number } | null>(null);

  // Tables connected to selection
  const related = useMemo(() => {
    if (!selected) return new Set<string>();
    const s = new Set([selected]);
    (schema[selected]?.foreign_keys ?? []).forEach(fk => s.add(fk.to_table));
    names.forEach(n => { if ((schema[n]?.foreign_keys ?? []).some(fk => fk.to_table === selected)) s.add(n); });
    return s;
  }, [selected, schema, names]);

  // All FK edges
  const edges = useMemo(() => {
    const e: { from: string; fc: string; to: string; tc: string }[] = [];
    names.forEach(n => {
      (schema[n]?.foreign_keys ?? []).forEach(fk => {
        if (schema[fk.to_table]) e.push({ from: n, fc: fk.from_col, to: fk.to_table, tc: fk.to_col });
      });
    });
    return e;
  }, [names, schema]);

  const edgePts = useCallback((e: typeof edges[0]) => {
    const fp = pos[e.from], tp = pos[e.to];
    if (!fp || !tp) return null;
    const fi = schema[e.from].columns.findIndex(c => c.name === e.fc);
    const ti = schema[e.to].columns.findIndex(c => c.name === e.tc);
    const fy = fp.y + HEADER_H + (fi >= 0 ? fi * ROW_H + ROW_H / 2 : ROW_H / 2);
    const ty = tp.y + HEADER_H + (ti >= 0 ? ti * ROW_H + ROW_H / 2 : ROW_H / 2);
    const fromRight = fp.x + TW / 2 > tp.x + TW / 2;
    return { sx: fromRight ? fp.x : fp.x + TW, sy: fy, tx: fromRight ? tp.x + TW : tp.x, ty, fromRight };
  }, [pos, schema]);

  const onPDown = useCallback((e: React.PointerEvent, kind: "tbl" | "bg", name?: string) => {
    e.stopPropagation();
    drag.current = {
      kind, name,
      sx: e.clientX, sy: e.clientY,
      ox: name ? pos[name].x : vp.x,
      oy: name ? pos[name].y : vp.y,
    };
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  }, [pos, vp]);

  const onPMove = useCallback((e: React.PointerEvent) => {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.sx, dy = e.clientY - drag.current.sy;
    if (drag.current.kind === "tbl" && drag.current.name) {
      const n = drag.current.name;
      setPos(p => ({ ...p, [n]: { x: drag.current!.ox + dx / vp.s, y: drag.current!.oy + dy / vp.s } }));
    } else {
      setVp(v => ({ ...v, x: drag.current!.ox + dx, y: drag.current!.oy + dy }));
    }
  }, [vp.s]);

  const onPUp = useCallback(() => { drag.current = null; }, []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setVp(v => ({ ...v, s: Math.min(2.5, Math.max(0.18, v.s * (e.deltaY < 0 ? 1.1 : 0.9))) }));
  }, []);

  const reset = useCallback(() => {
    setPos(autoLayout(names, schema));
    setVp({ x: 0, y: 0, s: 0.85 });
    setSelected(null);
  }, [names, schema]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#09090f]">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-5 py-2.5 border-b border-white/8 shrink-0">
        <div className="flex items-center gap-3">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="1" y="1" width="6" height="4" rx="1" stroke={ACCENT} strokeWidth="1.2"/>
            <rect x="9" y="1" width="6" height="4" rx="1" stroke="#06b6d4" strokeWidth="1.2"/>
            <rect x="1" y="11" width="6" height="4" rx="1" stroke="#10b981" strokeWidth="1.2"/>
            <path d="M7 3h2M7 13h2M8 5v6" stroke="rgba(255,255,255,0.2)" strokeWidth="1" strokeLinecap="round"/>
          </svg>
          <span className="text-sm font-semibold text-white">Schema Diagram</span>
          <span className="text-xs text-gray-500">{names.length} tables · {edges.length} relationships</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:block text-[10px] text-gray-600">drag tables · scroll to zoom · click to select</span>
          <button onClick={reset} className="text-[11px] px-2.5 py-0.5 rounded border border-white/10 text-gray-400 hover:text-white transition-colors">Reset</button>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1 transition-colors">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-hidden" style={{ cursor: "grab" }}>
        <svg className="w-full h-full" onPointerDown={e => onPDown(e, "bg")}
          onPointerMove={onPMove} onPointerUp={onPUp} onWheel={onWheel}
          style={{ userSelect: "none" }}>
          {/* Dot-grid background */}
          <defs>
            <pattern id="dot" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="0.8" fill="rgba(255,255,255,0.04)"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dot)"/>

          <g transform={`translate(${vp.x},${vp.y}) scale(${vp.s})`}>
            {/* Pass 1: FK bezier paths — behind tables, no arrowheads */}
            {edges.map((e, i) => {
              const p = edgePts(e);
              if (!p) return null;
              const hi = selected !== null && (selected === e.from || selected === e.to);
              const dim = selected !== null && !related.has(e.from) && !related.has(e.to);
              return (
                <path key={i} d={bezier(p.sx, p.sy, p.tx, p.ty)}
                  fill="none" stroke={hi ? ACCENT : "rgba(99,102,241,0.45)"}
                  strokeWidth={hi ? 2 : 1} strokeDasharray={hi ? undefined : "5 3"}
                  opacity={dim ? 0.08 : 1}
                  style={{ transition: "opacity 0.2s, stroke 0.15s" }}/>
              );
            })}

            {/* Pass 2: Table cards */}
            {names.map((name, ti) => {
              const p   = pos[name];
              const t   = schema[name];
              const h   = th(t.columns);
              const clr = PALETTE[ti % PALETTE.length];
              const sel = selected === name;
              const dim = selected !== null && !related.has(name);

              return (
                <g key={name} transform={`translate(${p.x},${p.y})`}
                  opacity={dim ? 0.18 : 1}
                  style={{ transition: "opacity 0.2s" }}
                  onClick={e => { e.stopPropagation(); setSelected(s => s === name ? null : name); }}>

                  {/* Card shadow */}
                  <rect x={3} y={4} width={TW} height={h} rx={7} fill="rgba(0,0,0,0.5)"/>

                  {/* Card body */}
                  <rect width={TW} height={h} rx={7}
                    fill="#0d0d18" stroke={sel ? clr : "rgba(255,255,255,0.08)"}
                    strokeWidth={sel ? 1.5 : 1}/>

                  {/* Left color bar */}
                  <rect width={3} height={h} rx={1.5} fill={clr} opacity={0.9}/>

                  {/* Header gradient */}
                  <rect width={TW} height={HEADER_H} rx={7} fill={`${clr}18`}/>
                  <rect y={HEADER_H - 8} width={TW} height={8} fill={`${clr}18`}/>

                  {/* Header drag area */}
                  <rect width={TW} height={HEADER_H} fill="transparent" rx={7}
                    style={{ cursor: "grab" }}
                    onPointerDown={e => { e.stopPropagation(); onPDown(e, "tbl", name); }}
                    onClick={e => e.stopPropagation()}/>

                  {/* Table name */}
                  <text x={14} y={21} fontSize={10.5} fontWeight="700"
                    fill={sel ? clr : "rgba(255,255,255,0.92)"} style={{ pointerEvents: "none" }}>
                    {name}
                  </text>
                  {/* Row count */}
                  <text x={TW - 8} y={21} fontSize={8} fill={`${clr}80`} textAnchor="end"
                    style={{ pointerEvents: "none" }}>
                    {t.row_count.toLocaleString()}
                  </text>

                  {/* Divider */}
                  <line x1={0} y1={HEADER_H} x2={TW} y2={HEADER_H}
                    stroke="rgba(255,255,255,0.06)" strokeWidth={1}/>

                  {/* Columns */}
                  {t.columns.map((col, ci) => {
                    const cy  = HEADER_H + ci * ROW_H;
                    const fk  = (t.foreign_keys ?? []).some(f => f.from_col === col.name);
                    const lbl = col.type.split("(")[0].slice(0, 9).toUpperCase();
                    return (
                      <g key={col.name} style={{ pointerEvents: "none" }}>
                        {ci % 2 === 0 && <rect x={0} y={cy} width={TW} height={ROW_H} fill="rgba(255,255,255,0.015)"/>}
                        {/* icon column — 14px wide */}
                        {col.pk && (
                          <foreignObject x={5} y={cy + 4} width={10} height={10}>
                            <KeyIcon/>
                          </foreignObject>
                        )}
                        {fk && !col.pk && (
                          <foreignObject x={5} y={cy + 4} width={10} height={10}>
                            <LinkIcon/>
                          </foreignObject>
                        )}
                        <text x={col.pk || fk ? 20 : 10} y={cy + 13} fontSize={9}
                          fill={col.pk ? "#f59e0b" : fk ? ACCENT : "rgba(255,255,255,0.65)"}>
                          {col.name}
                        </text>
                        <text x={TW - 8} y={cy + 13} fontSize={7.5}
                          fill="rgba(255,255,255,0.2)" textAnchor="end">
                          {lbl}
                        </text>
                      </g>
                    );
                  })}
                </g>
              );
            })}

            {/* Pass 3: Arrowheads rendered on top of table cards so they're always visible */}
            {edges.map((e, i) => {
              const p = edgePts(e);
              if (!p) return null;
              const hi = selected !== null && (selected === e.from || selected === e.to);
              const dim = selected !== null && !related.has(e.from) && !related.has(e.to);
              const { tx, ty, fromRight } = p;
              // Triangle tip sits ON the card edge, pointing inward to show direction
              const aw = 8, ah = 5;
              const pts = fromRight
                ? `${tx},${ty} ${tx + aw},${ty - ah} ${tx + aw},${ty + ah}`
                : `${tx},${ty} ${tx - aw},${ty - ah} ${tx - aw},${ty + ah}`;
              return (
                <polygon key={i} points={pts}
                  fill={hi ? ACCENT : "rgba(99,102,241,0.7)"}
                  opacity={dim ? 0.08 : 1}
                  style={{ transition: "opacity 0.2s" }}
                  pointerEvents="none" />
              );
            })}
          </g>
        </svg>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5 px-5 py-2 border-t border-white/8 shrink-0 bg-[#09090f]">
        <span className="text-[10px] text-gray-500 flex items-center gap-1.5">
          <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
            <circle cx="4.5" cy="4.5" r="3" stroke="#f59e0b" strokeWidth="1.5"/>
            <path d="M7 7l3.5 3.5M9 7.5l1 1" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          Primary key
        </span>
        <span className="text-[10px] text-gray-500 flex items-center gap-1.5">
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4h7M6 1l3 3-3 3" stroke={ACCENT} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Foreign key
        </span>
        <span className="text-[10px] text-gray-500 flex items-center gap-1.5">
          <svg width="16" height="6" viewBox="0 0 16 6" fill="none">
            <path d="M1 3h14" stroke="rgba(99,102,241,0.4)" strokeWidth="1" strokeDasharray="3 2"/>
          </svg>
          Relationship line
        </span>
        {selected && (
          <span className="ml-auto text-[10px]" style={{ color: ACCENT }}>
            {selected} selected — click again to clear
          </span>
        )}
      </div>
    </div>
  );
}