"use client";

import { useEffect, useRef, useState } from "react";
import { RowBars } from "./AnalyticsBars";

/** Visitors by Country — two views the user can switch between:
 *  - Bars (default): the shared row-fill ranked bars, matching the rest of the dash.
 *  - Map: a real equirectangular world map (lazy-loaded from /world-equirect.svg,
 *    Natural Earth 50m, themed via our own CSS) with a bubble per country, sized by
 *    visitors and placed at the country's lat/lon.
 * The map SVG is ~540KB, so it is fetched only the first time Map is selected. */

type Country = { country: string; count: number };

const REGION = (() => { try { return new Intl.DisplayNames(["en"], { type: "region" }); } catch { return null; } })();
const name = (code: string) => { try { return (REGION && REGION.of(code)) || code; } catch { return code; } };
const fmt = (n: number) => (n >= 1000 ? (n / 1000).toFixed(1) + "k" : String(n));

// country -> [lat, lon] for bubble placement (ISO-3166 alpha-2)
const CENTROIDS: Record<string, [number, number]> = {
  US: [37, -95], IN: [20, 78], CN: [35, 104], GB: [54, -2], DE: [51, 10], FR: [46, 2], JP: [36, 138],
  BR: [-10, -52], AU: [-25, 133], CA: [56, -106], RU: [61, 90], KR: [36, 128], IT: [42, 13],
  ES: [40, -4], MX: [23, -102], ID: [-2, 118], NL: [52, 5], SA: [24, 45], TR: [39, 35], PL: [52, 19],
  SE: [62, 17], SG: [1, 104], ZA: [-29, 24], PK: [30, 70], NG: [9, 8], AR: [-34, -64], UA: [49, 32],
  BD: [24, 90], EG: [27, 30], TH: [15, 101], VN: [16, 108], MY: [4, 102], RO: [46, 25], CZ: [50, 15],
  PT: [39, -8], GR: [39, 22], HU: [47, 20], AT: [47, 14], CH: [47, 8], BE: [50, 4], FI: [64, 26],
  NO: [62, 10], DK: [56, 10], IL: [31, 35], PH: [13, 122], NZ: [-42, 173], HK: [22, 114], TW: [24, 121],
  CL: [-33, -71], CO: [4, -73], PE: [-10, -76], AE: [24, 54], IE: [53, -8], IR: [32, 53],
};

function project(lat: number, lon: number): [number, number] {
  return [((lon + 180) / 360) * 1104, ((90 - lat) / 180) * 551];
}

export default function AnalyticsGeoPanel({ data, rangeLabel }: { data: Country[]; rangeLabel: string }) {
  const [view, setView] = useState<"bars" | "map">("bars");
  const [svg, setSvg] = useState<string | null>(null);
  const [loadErr, setLoadErr] = useState(false);
  const fetched = useRef(false);

  // lazy-load the map SVG the first time Map is selected
  useEffect(() => {
    if (view !== "map" || fetched.current) return;
    fetched.current = true;
    fetch("/world-equirect.svg")
      .then(r => (r.ok ? r.text() : Promise.reject()))
      .then(t => setSvg(t))
      .catch(() => setLoadErr(true));
  }, [view]);

  const max = Math.max(...data.map(d => d.count), 1);
  const placed = data.filter(d => CENTROIDS[d.country]);

  const Tab = ({ id, label }: { id: "bars" | "map"; label: string }) => (
    <button onClick={() => setView(id)}
      className="text-[11px] font-semibold rounded-full px-2.5 py-1 border transition-colors"
      style={{ borderColor: view === id ? "var(--border2)" : "var(--border)",
        color: view === id ? "var(--text)" : "var(--text3)",
        background: view === id ? "var(--border)" : "transparent" }}>
      {label}
    </button>
  );

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-glass)] backdrop-blur-[14px] p-5">
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <p className="text-[11px] font-bold font-mono text-[var(--text2)] uppercase tracking-[0.12em]">Visitors by Country — {rangeLabel}</p>
        <div className="flex items-center gap-1.5">
          <Tab id="bars" label="Bars" />
          <Tab id="map" label="Map" />
        </div>
      </div>

      {view === "bars" ? (
        <RowBars empty="No geo data yet"
          data={data.map(d => ({ label: name(d.country), value: d.count, display: fmt(d.count), title: d.country }))} />
      ) : (
        <div className="geo-map relative w-full" style={{ aspectRatio: "1104 / 551" }}>
          <style>{`
            .geo-map .mapwrap svg { width: 100%; height: 100%; display: block; }
            .geo-map .mapwrap path { fill: transparent; }
            .geo-map .mapwrap .region { fill: var(--border2); }
          `}</style>
          {loadErr ? (
            <div className="absolute inset-0 grid place-items-center text-[12px]" style={{ color: "var(--text3)" }}>Map unavailable — switch to Bars.</div>
          ) : !svg ? (
            <div className="absolute inset-0 grid place-items-center text-[12px]" style={{ color: "var(--text3)" }}>Loading map…</div>
          ) : (
            <>
              <div className="mapwrap absolute inset-0" dangerouslySetInnerHTML={{ __html: svg }} />
              <svg viewBox="0 0 1104 551" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid meet">
                {placed.map(d => {
                  const [x, y] = project(...CENTROIDS[d.country]);
                  const r = 5 + (d.count / max) * 18;
                  return (
                    <g key={d.country}>
                      <circle cx={x} cy={y} r={r} fill="#818cf8" fillOpacity="0.55" stroke="#818cf8" strokeWidth="1" />
                      <title>{name(d.country)} · {d.count}</title>
                    </g>
                  );
                })}
              </svg>
            </>
          )}
          {placed.length === 0 && svg && (
            <div className="absolute inset-0 grid place-items-center text-[12px]" style={{ color: "var(--text3)" }}>No mappable geo data yet</div>
          )}
        </div>
      )}
      <p className="text-[9.5px] mt-3 font-mono" style={{ color: "var(--text3)" }}>
        {view === "map" ? "Bubble size = visitors; placed by country centroid. Map: Natural Earth 50m, equirectangular." : "Ranked by visitors. Switch to Map for a geographic view."}
      </p>
    </div>
  );
}
