"use client";
import { useMemo, useState } from "react";

const P = ["#6366f1","#8b5cf6","#06b6d4","#10b981","#f59e0b","#ef4444","#ec4899","#14b8a6","#f97316","#84cc16"];
export type CT = "bar"|"bar_h"|"grouped_bar"|"line"|"area"|"scatter"|"donut"|"heatmap"|"stat";
export interface VS { type: CT; cx: number; n: number[]; c2?: number; }

// ── Helpers ───────────────────────────────────────────────────────────────────
export const toN = (v: unknown) => (v === null || v === "" ? 0 : Number(v));
export const fmt = (v: number) =>
  Math.abs(v) >= 1e6 ? (v/1e6).toFixed(1)+"M" :
  Math.abs(v) >= 1e3 ? (v/1e3).toFixed(1)+"K" :
  v % 1 ? v.toFixed(2) : String(v);
const isNum = (v: unknown) => v !== null && v !== "" && !isNaN(Number(v));
const isNC  = (i: number, rows: unknown[][]) => {
  const s = rows.slice(0,15).filter(r => (r as unknown[])[i] !== null);
  return s.length > 0 && s.every(r => isNum((r as unknown[])[i]));
};
const isD = (c: string) => /(year|date|month|week|quarter|day|time|period)/i.test(c);

// ── Detection ─────────────────────────────────────────────────────────────────
export function detectViz(cols: string[], rows: unknown[][]): VS | null {
  if (!rows.length || !cols.length) return null;
  // date-name check wins over numeric-value check (Year=2021 is a date, not a measure)
  const ni = cols.map((_,i)=>i).filter(i=>!isD(cols[i]) && isNC(i,rows));
  const ac = cols.map((_,i)=>i).filter(i=>isD(cols[i]) || !isNC(i,rows));
  const di = ac.filter(i=>isD(cols[i]));
  const ci = ac.filter(i=>!isD(cols[i]));
  const n  = rows.length;
  if (n<=3 && ni.length>=1) return { type:"stat", cx:ac[0]??-1, n:ni };
  if (di.length>=1 && ni.length>=1) return { type:n>=10?"area":"line", cx:di[0], n:ni };
  if (ci.length>=2 && ni.length===1) return { type:"heatmap", cx:ci[0], n:ni, c2:ci[1] };
  if (ni.length>=2 && ci.length<=1 && n>=5) return { type:"scatter", cx:ci[0]??-1, n:ni };
  if (ci.length===1 && ni.length>1) return { type:"grouped_bar", cx:ci[0], n:ni };
  if (ci.length>=1 && ni.length>=1) {
    if (n<=5) return { type:"donut", cx:ci[0], n:[ni[0]] };
    const al = rows.reduce((s,r)=>s+String((r as unknown[])[ci[0]]??'').length,0)/n;
    return { type:(n>15||al>12)?"bar_h":"bar", cx:ci[0], n:[ni[0]] };
  }
  return null;
}

// ── Bar ───────────────────────────────────────────────────────────────────────
function Bar({ cols, rows, s }: { cols: string[]; rows: unknown[][]; s: VS }) {
  const vals = rows.map(r=>toN((r as unknown[])[s.n[0]]));
  const mx = Math.max(...vals, 0.001);
  const [W,PL,PR,PT,PB,iH] = [520,44,10,12,52,150];
  const iW = W-PL-PR, bW = Math.max(4, iW/rows.length-6);
  return (
    <svg viewBox={`0 0 ${W} ${PT+iH+PB}`} className="w-full" style={{maxHeight:"200px"}}>
      <text x={PL+iW/2} y={9} textAnchor="middle" fill="#6b7280" fontSize={9}>{cols[s.n[0]]}</text>
      {[0,.25,.5,.75,1].map(f=>(
        <g key={f}>
          <line x1={PL} x2={W-PR} y1={PT+iH*(1-f)} y2={PT+iH*(1-f)} stroke="#ffffff0e" strokeWidth={1}/>
          <text x={PL-4} y={PT+iH*(1-f)+4} textAnchor="end" fill="#6b7280" fontSize={8}>{fmt(mx*f)}</text>
        </g>
      ))}
      {rows.map((r,i)=>{
        const v = toN((r as unknown[])[s.n[0]]);
        const bH = Math.max(2,(v/mx)*iH);
        const x = PL+i*(iW/rows.length)+(iW/rows.length-bW)/2;
        const lbl = String((r as unknown[])[s.cx]??i);
        const rot = rows.length>7||lbl.length>8;
        return (
          <g key={i}>
            <rect x={x} y={PT+iH-bH} width={bW} height={bH} fill={P[0]} rx={2} opacity={0.85}/>
            <text x={x+bW/2} y={PT+iH+13} textAnchor={rot?"end":"middle"} fill="#9ca3af" fontSize={9}
              transform={rot?`rotate(-38,${x+bW/2},${PT+iH+13})`:undefined}>{lbl.slice(0,15)}</text>
            <text x={x+bW/2} y={PT+iH-bH-3} textAnchor="middle" fill="#d1d5db" fontSize={8}>{fmt(v)}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Horizontal Bar ────────────────────────────────────────────────────────────
function BarH({ cols, rows, s }: { cols: string[]; rows: unknown[][]; s: VS }) {
  const vals = rows.map(r=>toN((r as unknown[])[s.n[0]]));
  const mx = Math.max(...vals, 0.001);
  const [LW,PR,PT,bH,gap,W] = [115,56,18,12,4,520];
  const iW = W-LW-PR;
  const svgH = PT + rows.length*(bH+gap) + 8;
  return (
    <div className="max-h-[260px] overflow-y-auto">
      <svg viewBox={`0 0 ${W} ${svgH}`} style={{height:svgH,minWidth:"100%"}} className="w-full">
        <text x={LW+iW/2} y={14} textAnchor="middle" fill="#6b7280" fontSize={9}>{cols[s.n[0]]}</text>
        {rows.map((r,i)=>{
          const v = toN((r as unknown[])[s.n[0]]);
          const bW = Math.max(2,(v/mx)*iW);
          const y = PT+i*(bH+gap);
          return (
            <g key={i}>
              <text x={LW-5} y={y+bH/2+4} textAnchor="end" fill="#9ca3af" fontSize={9}>{String((r as unknown[])[s.cx]??i).slice(0,17)}</text>
              <rect x={LW} y={y} width={bW} height={bH} fill={P[0]} rx={2} opacity={0.85}/>
              <text x={LW+bW+5} y={y+bH/2+4} fill="#d1d5db" fontSize={9}>{fmt(v)}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── Grouped Bar ───────────────────────────────────────────────────────────────
function GroupedBar({ cols, rows, s }: { cols: string[]; rows: unknown[][]; s: VS }) {
  const allVals = s.n.flatMap(ni=>rows.map(r=>toN((r as unknown[])[ni])));
  const mx = Math.max(...allVals, 0.001);
  const [W,PL,PR,PT,PB,iH] = [520,44,10,24,52,150];
  const iW = W-PL-PR;
  const grpW = iW/rows.length, bW = Math.max(2, grpW/s.n.length-3);
  return (
    <svg viewBox={`0 0 ${W} ${PT+iH+PB}`} className="w-full" style={{maxHeight:"200px"}}>
      {s.n.map((ni,si)=>(
        <g key={si} transform={`translate(${8+si*80},8)`}>
          <rect width={9} height={9} rx={2} fill={P[si%P.length]}/>
          <text x={13} y={8} fill="#9ca3af" fontSize={9}>{cols[ni].slice(0,12)}</text>
        </g>
      ))}
      {[0,.25,.5,.75,1].map(f=>(
        <g key={f}>
          <line x1={PL} x2={W-PR} y1={PT+iH*(1-f)} y2={PT+iH*(1-f)} stroke="#ffffff0e" strokeWidth={1}/>
          <text x={PL-4} y={PT+iH*(1-f)+4} textAnchor="end" fill="#6b7280" fontSize={8}>{fmt(mx*f)}</text>
        </g>
      ))}
      {rows.map((r,i)=>{
        const lbl = String((r as unknown[])[s.cx]??i);
        const grpX = PL+i*grpW;
        return (
          <g key={i}>
            {s.n.map((ni,si)=>{
              const v = toN((r as unknown[])[ni]);
              const bH = Math.max(2,(v/mx)*iH);
              const x = grpX+si*(bW+3);
              return <rect key={si} x={x} y={PT+iH-bH} width={bW} height={bH} fill={P[si%P.length]} rx={2} opacity={0.85}/>;
            })}
            <text x={grpX+grpW/2} y={PT+iH+13} textAnchor="middle" fill="#9ca3af" fontSize={9}>{lbl.slice(0,12)}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Line / Area ───────────────────────────────────────────────────────────────
function LineArea({ cols, rows, s }: { cols: string[]; rows: unknown[][]; s: VS }) {
  const [W,PL,PR,PT,PB,iH] = [520,44,10,16,48,150];
  const iW = W-PL-PR;
  const allVals = s.n.flatMap(ni=>rows.map(r=>toN((r as unknown[])[ni])));
  const mx = Math.max(...allVals, 0.001);
  const xStep = iW/(rows.length-1||1);
  const xOf  = (i: number) => PL+i*xStep;
  const yOf  = (v: number) => PT+iH-(v/mx)*iH;
  return (
    <svg viewBox={`0 0 ${W} ${PT+iH+PB}`} className="w-full" style={{maxHeight:"200px"}}>
      {[0,.25,.5,.75,1].map(f=>(
        <g key={f}>
          <line x1={PL} x2={W-PR} y1={PT+iH*(1-f)} y2={PT+iH*(1-f)} stroke="#ffffff0e" strokeWidth={1}/>
          <text x={PL-4} y={PT+iH*(1-f)+4} textAnchor="end" fill="#6b7280" fontSize={8}>{fmt(mx*f)}</text>
        </g>
      ))}
      {s.n.map((ni,si)=>{
        const pts = rows.map((_,i)=>({ x:xOf(i), y:yOf(toN((rows[i] as unknown[])[ni])) }));
        const d = pts.map((p,i)=>`${i===0?"M":"L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
        const fill = s.type==="area"
          ? d+` L${pts[pts.length-1].x},${PT+iH} L${pts[0].x},${PT+iH} Z`
          : "";
        return (
          <g key={si}>
            {s.type==="area" && <path d={fill} fill={P[si%P.length]} opacity={0.15}/>}
            <path d={d} fill="none" stroke={P[si%P.length]} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/>
            {pts.map((p,i)=><circle key={i} cx={p.x} cy={p.y} r={3} fill={P[si%P.length]}/>)}
          </g>
        );
      })}
      {rows.filter((_,i)=>rows.length<=12||i%(Math.ceil(rows.length/12))===0).map((_,i)=>{
        const ri = rows.length<=12 ? i : i*Math.ceil(rows.length/12);
        if(ri>=rows.length) return null;
        const lbl = String((rows[ri] as unknown[])[s.cx]??ri);
        return <text key={i} x={xOf(ri)} y={PT+iH+13} textAnchor="middle" fill="#9ca3af" fontSize={9}>{lbl.slice(0,10)}</text>;
      })}
      {s.n.length>1 && s.n.map((ni,si)=>(
        <g key={si} transform={`translate(${PL+si*90},8)`}>
          <rect width={8} height={8} rx={2} fill={P[si%P.length]}/>
          <text x={12} y={7} fill="#9ca3af" fontSize={9}>{cols[ni].slice(0,12)}</text>
        </g>
      ))}
    </svg>
  );
}

// ── Scatter ───────────────────────────────────────────────────────────────────
function Scatter({ cols, rows, s }: { cols: string[]; rows: unknown[][]; s: VS }) {
  const [W,PL,PR,PT,PB,iH] = [520,44,10,16,32,160];
  const iW = W-PL-PR;
  const xv = rows.map(r=>toN((r as unknown[])[s.n[0]]));
  const yv = rows.map(r=>toN((r as unknown[])[s.n[1]]));
  const [minX,maxX] = [Math.min(...xv),Math.max(...xv)];
  const [minY,maxY] = [Math.min(...yv),Math.max(...yv)];
  const sx = (v:number)=>PL+((v-minX)/(maxX-minX||1))*iW;
  const sy = (v:number)=>PT+iH-((v-minY)/(maxY-minY||1))*iH;
  return (
    <svg viewBox={`0 0 ${W} ${PT+iH+PB}`} className="w-full" style={{maxHeight:"200px"}}>
      <line x1={PL} x2={PL} y1={PT} y2={PT+iH} stroke="#ffffff20" strokeWidth={1}/>
      <line x1={PL} x2={W-PR} y1={PT+iH} y2={PT+iH} stroke="#ffffff20" strokeWidth={1}/>
      <text x={PL+iW/2} y={PT+iH+24} textAnchor="middle" fill="#6b7280" fontSize={9}>{cols[s.n[0]]}</text>
      <text x={12} y={PT+iH/2} textAnchor="middle" fill="#6b7280" fontSize={9} transform={`rotate(-90,12,${PT+iH/2})`}>{cols[s.n[1]]}</text>
      {rows.map((r,i)=>(
        <circle key={i} cx={sx(toN((r as unknown[])[s.n[0]]))} cy={sy(toN((r as unknown[])[s.n[1]]))} r={4} fill={P[0]} opacity={0.75}/>
      ))}
    </svg>
  );
}

// ── Heatmap ───────────────────────────────────────────────────────────────────
function Heatmap({ cols, rows, s }: { cols: string[]; rows: unknown[][]; s: VS }) {
  const rows2 = Array.from(new Set(rows.map(r=>String((r as unknown[])[s.cx]))));
  const cols2 = Array.from(new Set(rows.map(r=>String((r as unknown[])[s.c2!]))));
  const vals = rows.map(r=>toN((r as unknown[])[s.n[0]]));
  const [mn,mx] = [Math.min(...vals),Math.max(...vals)||1];
  const cell = Math.max(28, Math.min(48, Math.floor(360/Math.max(cols2.length,1))));
  const LH = 90, TH = 20, W = LH+cols2.length*cell+10, H = TH+rows2.length*cell+10;
  const lookup = new Map(rows.map(r=>[`${(r as unknown[])[s.cx]}||${(r as unknown[])[s.c2!]}`,toN((r as unknown[])[s.n[0]])]));
  const opacity = (v:number) => 0.1+0.85*((v-mn)/(mx-mn||1));
  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} style={{minWidth:W,height:H}}>
        {cols2.map((c,j)=>(
          <text key={j} x={LH+j*cell+cell/2} y={TH-4} textAnchor="middle" fill="#9ca3af" fontSize={9}>{c.slice(0,8)}</text>
        ))}
        {rows2.map((r,i)=>(
          <g key={i}>
            <text x={LH-4} y={TH+i*cell+cell/2+4} textAnchor="end" fill="#9ca3af" fontSize={9}>{r.slice(0,12)}</text>
            {cols2.map((c,j)=>{
              const v = lookup.get(`${r}||${c}`)??0;
              return (
                <g key={j}>
                  <rect x={LH+j*cell+1} y={TH+i*cell+1} width={cell-2} height={cell-2} rx={3} fill={P[0]} opacity={opacity(v)}/>
                  {cell>=36&&<text x={LH+j*cell+cell/2} y={TH+i*cell+cell/2+4} textAnchor="middle" fill="#fff" fontSize={9} opacity={0.9}>{fmt(v)}</text>}
                </g>
              );
            })}
          </g>
        ))}
        <text x={LH} y={H-2} fill="#6b7280" fontSize={8}>{cols[s.n[0]]} — min {fmt(mn)} → max {fmt(mx)}</text>
      </svg>
    </div>
  );
}

// ── Donut ─────────────────────────────────────────────────────────────────────
function Donut({ cols, rows, s }: { cols: string[]; rows: unknown[][]; s: VS }) {
  const vals = rows.map(r=>toN((r as unknown[])[s.n[0]]));
  const total = vals.reduce((a,b)=>a+b,0)||1;
  const [cx,cy,R,ri] = [78,76,56,34];
  let ang = -Math.PI/2;
  const segs = vals.map((v,i)=>{
    const sw = (v/total)*2*Math.PI;
    const [x1,y1] = [cx+R*Math.cos(ang), cy+R*Math.sin(ang)];
    ang += sw;
    const [x2,y2] = [cx+R*Math.cos(ang), cy+R*Math.sin(ang)];
    const [ix1,iy1] = [cx+ri*Math.cos(ang-sw), cy+ri*Math.sin(ang-sw)];
    const [ix2,iy2] = [cx+ri*Math.cos(ang), cy+ri*Math.sin(ang)];
    const lg = sw>Math.PI?1:0;
    return { d:`M${x1},${y1}A${R},${R},0,${lg},1,${x2},${y2}L${ix2},${iy2}A${ri},${ri},0,${lg},0,${ix1},${iy1}Z`, c:P[i%P.length], pct:Math.round(v/total*100) };
  });
  return (
    <svg viewBox="0 0 290 155" className="w-full" style={{maxHeight:"180px"}}>
      {segs.map((sg,i)=><path key={i} d={sg.d} fill={sg.c} opacity={0.9}/>)}
      <text x={cx} y={cy+4} textAnchor="middle" fill="#e5e7eb" fontSize={11} fontWeight={600}>{fmt(total)}</text>
      <text x={cx} y={cy+15} textAnchor="middle" fill="#6b7280" fontSize={7}>{cols[s.n[0]]}</text>
      {rows.map((r,i)=>(
        <g key={i} transform={`translate(162,${12+i*22})`}>
          <rect width={8} height={8} rx={2} fill={P[i%P.length]}/>
          <text x={12} y={7} fill="#9ca3af" fontSize={9}>{String((r as unknown[])[s.cx]).slice(0,18)}<tspan fill="#d1d5db"> {segs[i].pct}%</tspan></text>
        </g>
      ))}
    </svg>
  );
}

// ── Stat cards ────────────────────────────────────────────────────────────────
function Stat({ cols, rows, s }: { cols: string[]; rows: unknown[][]; s: VS }) {
  return (
    <div className="flex flex-wrap gap-2 py-1">
      {rows.flatMap((r,ri)=>s.n.map(ni=>(
        <div key={`${ri}-${ni}`} className="flex-1 min-w-[110px] rounded-xl border border-[var(--border)] bg-[var(--bg-glass)] p-3">
          <p className="text-[9px] text-[var(--text3)] uppercase tracking-wide mb-1 truncate">{s.cx>=0?`${String((r as unknown[])[s.cx])} · `:""}{ cols[ni]}</p>
          <p className="text-xl font-bold text-indigo-300">{fmt(toN((r as unknown[])[ni]))}</p>
        </div>
      )))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
const LABELS: Record<CT,string> = { bar:"Bar Chart", bar_h:"Horizontal Bar", grouped_bar:"Grouped Bar", line:"Line Chart", area:"Area Chart", scatter:"Scatter Plot", donut:"Donut Chart", heatmap:"Heatmap", stat:"Key Metrics" };

const TYPE_ICONS: Record<CT, string> = {
  bar:"Bar", bar_h:"H-Bar", grouped_bar:"Grouped", line:"Line", area:"Area",
  scatter:"Scatter", donut:"Donut", heatmap:"Heat", stat:"Stat"
};
const COMPATIBLE: CT[] = ["bar","bar_h","line","area","donut","scatter","grouped_bar","stat"];

export default function SqlChart({ cols, rows, overrideType = null, onOverrideChange }: {
  cols: string[]; rows: unknown[][];
  overrideType?: CT | null;
  onOverrideChange?: (t: CT | null) => void;
}) {
  const spec = useMemo(()=>detectViz(cols,rows),[cols,rows]);
  const [open, setOpen] = useState(true);
  const activeType = overrideType ?? spec?.type ?? null;
  const activeSpec = spec && activeType ? { ...spec, type: activeType } : spec;
  const setOverrideType = (t: CT | null) => onOverrideChange?.(t);

  if (!spec || !activeSpec) return null;
  const isOverridden = overrideType !== null && overrideType !== spec.type;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-glass)] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="1" y="6" width="2" height="5" rx="0.5" fill="#6366f1"/><rect x="5" y="3" width="2" height="8" rx="0.5" fill="#8b5cf6"/><rect x="9" y="1" width="2" height="10" rx="0.5" fill="#06b6d4"/></svg>
          <span className="text-[10px] font-semibold text-[var(--text2)] uppercase tracking-wide">{LABELS[activeSpec.type]}</span>
          <span className="text-[9px] text-[var(--text3)]">{rows.length} rows · {isOverridden ? "manual" : "auto"}</span>
          {isOverridden && (
            <button onClick={()=>setOverrideType(null)} className="text-[9px] text-indigo-400/60 hover:text-indigo-300 transition-colors">reset</button>
          )}
        </div>
        <button onClick={()=>setOpen(o=>!o)} className="text-[10px] text-[var(--text3)] hover:text-[var(--text2)] transition-colors">{open?"Hide":"Show"}</button>
      </div>
      {open && (
        <>
          <div className="flex items-center gap-1 px-3 pt-2 pb-0 flex-wrap">
            {COMPATIBLE.map(t => (
              <button key={t} onClick={()=>setOverrideType(t===spec.type ? null : t)}
                className={`text-[9px] px-2 py-0.5 rounded border transition-all ${
                  activeSpec.type===t
                    ? "border-indigo-500/50 bg-indigo-500/15 text-indigo-300"
                    : "border-[var(--border)] text-[var(--text3)] hover:text-[var(--text2)] hover:border-[var(--border2)]"
                }`}>
                {TYPE_ICONS[t]}
              </button>
            ))}
          </div>
          <div className="p-3">
            {activeSpec.type==="bar"         && <Bar         cols={cols} rows={rows} s={activeSpec}/>}
            {activeSpec.type==="bar_h"       && <BarH        cols={cols} rows={rows} s={activeSpec}/>}
            {activeSpec.type==="grouped_bar" && <GroupedBar  cols={cols} rows={rows} s={activeSpec}/>}
            {(activeSpec.type==="line"||activeSpec.type==="area") && <LineArea cols={cols} rows={rows} s={activeSpec}/>}
            {activeSpec.type==="scatter"     && <Scatter     cols={cols} rows={rows} s={activeSpec}/>}
            {activeSpec.type==="heatmap"     && <Heatmap     cols={cols} rows={rows} s={activeSpec}/>}
            {activeSpec.type==="donut"       && <Donut       cols={cols} rows={rows} s={activeSpec}/>}
            {activeSpec.type==="stat"        && <Stat        cols={cols} rows={rows} s={activeSpec}/>}
          </div>
        </>
      )}
    </div>
  );
}