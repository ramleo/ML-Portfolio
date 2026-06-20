"use client";

import { useEffect, useRef } from "react";

interface UMAPResult {
  nComponents: number;
  points: number[][];
}

interface Props {
  umapResult: UMAPResult;
  accent?: string;
  labelValues?: string[];
}

// ── colour helpers ─────────────────────────────────────────────────────────────

const PALETTE = [
  "#fb923c", "#60a5fa", "#34d399", "#f472b6", "#a78bfa",
  "#fbbf24", "#4ade80", "#38bdf8", "#f87171", "#c084fc",
];

function buildColorMap(labels: string[]): Map<string, string> {
  const unique = [...new Set(labels)].sort();
  const map = new Map<string, string>();
  unique.forEach((u, i) => map.set(u, PALETTE[i % PALETTE.length]));
  return map;
}

// ── 2D SVG Scatter ─────────────────────────────────────────────────────────────

function Scatter2D({ umapResult, accent, labelValues }: Props) {
  const { points } = umapResult;
  if (points.length === 0) return null;

  const W = 480, H = 320, PAD = 24;

  const xs = points.map(p => p[0]);
  const ys = points.map(p => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const rangeX = maxX - minX || 1, rangeY = maxY - minY || 1;

  const toSvg = (x: number, y: number) => ({
    cx: PAD + ((x - minX) / rangeX) * (W - PAD * 2),
    cy: H - PAD - ((y - minY) / rangeY) * (H - PAD * 2),
  });

  const colorMap = labelValues ? buildColorMap(labelValues) : null;

  const dotColor = (i: number): string => {
    if (colorMap && labelValues) return colorMap.get(labelValues[i]) ?? accent ?? "#fb923c";
    return accent ?? "#fb923c";
  };

  const legendEntries = colorMap
    ? [...colorMap.entries()].slice(0, 10)
    : null;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
        {/* Grid guides */}
        {[0.25, 0.5, 0.75].map(t => (
          <g key={t}>
            <line
              x1={PAD + t * (W - PAD * 2)} y1={PAD}
              x2={PAD + t * (W - PAD * 2)} y2={H - PAD}
              stroke="rgba(255,255,255,0.04)" strokeWidth={1}
            />
            <line
              x1={PAD} y1={H - PAD - t * (H - PAD * 2)}
              x2={W - PAD} y2={H - PAD - t * (H - PAD * 2)}
              stroke="rgba(255,255,255,0.04)" strokeWidth={1}
            />
          </g>
        ))}

        {/* Points */}
        {points.map((p, i) => {
          const { cx, cy } = toSvg(p[0], p[1]);
          return (
            <circle
              key={i}
              cx={cx} cy={cy} r={3.5}
              fill={dotColor(i)}
              fillOpacity={0.75}
              stroke="rgba(0,0,0,0.3)"
              strokeWidth={0.5}
            />
          );
        })}

        {/* Axis labels */}
        <text x={W / 2} y={H - 2} textAnchor="middle" fontSize={9} fill="rgba(255,255,255,0.4)">UMAP-1</text>
        <text x={8} y={H / 2} textAnchor="middle" fontSize={9} fill="rgba(255,255,255,0.4)"
          transform={`rotate(-90, 8, ${H / 2})`}>UMAP-2</text>
      </svg>

      {legendEntries && legendEntries.length > 1 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem 1rem", marginTop: "0.5rem" }}>
          {legendEntries.map(([label, color]) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
              <div style={{ width: 8, height: 8, borderRadius: 9999, background: color, flexShrink: 0 }} />
              <span style={{ fontSize: "0.7rem", color: "var(--text3, #9ca3af)" }}>{label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── 3D Three.js Scatter ────────────────────────────────────────────────────────

function Scatter3D({ umapResult, accent, labelValues }: Props) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<unknown>(null);

  const { points } = umapResult;

  useEffect(() => {
    if (!canvasRef.current || points.length === 0) return;
    const container = canvasRef.current;

    let alive = true;
    let animId: number;

    (async () => {
      const THREE = await import("three");
      const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");

      if (!alive || !canvasRef.current) return;

      const W = container.clientWidth || 480;
      const H = 320;

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(W, H);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setClearColor(0x000000, 0);
      container.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(50, W / H, 0.01, 1000);
      camera.position.set(2.5, 2, 3);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.07;
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.8;

      // Normalise points to [-1, 1]
      const cols = [
        points.map(p => p[0]),
        points.map(p => p[1]),
        points.map(p => p[2] ?? 0),
      ];
      const ranges = cols.map(c => {
        const mn = Math.min(...c), mx = Math.max(...c);
        return { mn, range: mx - mn || 1 };
      });
      const norm = (v: number, dim: number) =>
        ((v - ranges[dim].mn) / ranges[dim].range) * 2 - 1;

      const colorMap = labelValues ? buildColorMap(labelValues) : null;

      const positions = new Float32Array(points.length * 3);
      const colors = new Float32Array(points.length * 3);

      points.forEach((p, i) => {
        positions[i * 3]     = norm(p[0], 0);
        positions[i * 3 + 1] = norm(p[1], 1);
        positions[i * 3 + 2] = norm(p[2] ?? 0, 2);

        const hexStr = colorMap && labelValues
          ? (colorMap.get(labelValues[i]) ?? accent ?? "#fb923c")
          : (accent ?? "#fb923c");
        const c = new THREE.Color(hexStr);
        colors[i * 3]     = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;
      });

      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

      const mat = new THREE.PointsMaterial({
        size: 0.06,
        vertexColors: true,
        transparent: true,
        opacity: 0.85,
        sizeAttenuation: true,
      });

      const pointCloud = new THREE.Points(geo, mat);
      scene.add(pointCloud);

      // Subtle axes
      const axMat = new THREE.LineBasicMaterial({ color: 0x334155, opacity: 0.4, transparent: true });
      [
        [[- 1.2, 0, 0], [1.2, 0, 0]],
        [[0, -1.2, 0], [0, 1.2, 0]],
        [[0, 0, -1.2], [0, 0, 1.2]],
      ].forEach(([a, b]) => {
        const g = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(...(a as [number, number, number])),
          new THREE.Vector3(...(b as [number, number, number])),
        ]);
        scene.add(new THREE.Line(g, axMat));
      });

      const animate = () => {
        if (!alive) return;
        animId = requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
      };
      animate();

      const onResize = () => {
        if (!container || !alive) return;
        const nw = container.clientWidth || 480;
        renderer.setSize(nw, H);
        camera.aspect = nw / H;
        camera.updateProjectionMatrix();
      };
      window.addEventListener("resize", onResize);

      return () => {
        window.removeEventListener("resize", onResize);
      };
    })();

    return () => {
      alive = false;
      cancelAnimationFrame(animId);
      const r = rendererRef.current as { dispose?: () => void; domElement?: HTMLElement } | null;
      if (r) {
        r.dispose?.();
        if (r.domElement && container.contains(r.domElement)) {
          container.removeChild(r.domElement);
        }
      }
      rendererRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const colorMap = labelValues ? buildColorMap(labelValues) : null;
  const legendEntries = colorMap ? [...colorMap.entries()].slice(0, 10) : null;

  return (
    <div>
      <div
        ref={canvasRef}
        style={{ width: "100%", height: 320, borderRadius: 8, overflow: "hidden", background: "rgba(255,255,255,0.02)" }}
      />
      <div style={{ fontSize: "0.7rem", color: "var(--text3, #9ca3af)", marginTop: "0.35rem" }}>
        Drag to rotate · Scroll to zoom · Right-drag to pan
      </div>

      {legendEntries && legendEntries.length > 1 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem 1rem", marginTop: "0.5rem" }}>
          {legendEntries.map(([label, color]) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
              <div style={{ width: 8, height: 8, borderRadius: 9999, background: color, flexShrink: 0 }} />
              <span style={{ fontSize: "0.7rem", color: "var(--text3, #9ca3af)" }}>{label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────────

export default function UMAPScatter({ umapResult, accent, labelValues }: Props) {
  if (!umapResult || umapResult.points.length === 0) return null;

  return umapResult.nComponents === 3
    ? <Scatter3D umapResult={umapResult} accent={accent} labelValues={labelValues} />
    : <Scatter2D umapResult={umapResult} accent={accent} labelValues={labelValues} />;
}