"use client";

import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

export type ReconstructedPoint = [number, number, number, number, number, number];
export type CameraPose = { position: [number, number, number]; image_index: number };

/** The backend's camera-0 convention (OpenCV: camera looks down +Z) puts
 * every reconstructed point at positive Z, which sits BEHIND a default
 * Three.js camera (which looks down -Z from a positive-Z position) —
 * negating Z here reconciles the two conventions so the cloud renders in
 * front of the viewer instead of silently rendering nothing. */
function toSceneSpace(p: [number, number, number]): [number, number, number] {
  return [p[0], p[1], -p[2]];
}

function Cloud({ points, pointSize }: { points: ReconstructedPoint[]; pointSize: number }) {
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(points.length * 3);
    const colors = new Float32Array(points.length * 3);
    points.forEach((p, i) => {
      const [x, y, z] = toSceneSpace([p[0], p[1], p[2]]);
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      colors[i * 3] = p[3] / 255;
      colors[i * 3 + 1] = p[4] / 255;
      colors[i * 3 + 2] = p[5] / 255;
    });
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return geo;
  }, [points]);

  return (
    <points geometry={geometry}>
      <pointsMaterial size={pointSize} vertexColors sizeAttenuation={false} />
    </points>
  );
}

function CameraMarkers({ poses, accent, markerSize }: { poses: CameraPose[]; accent: string; markerSize: number }) {
  return (
    <>
      {poses.map(cp => (
        <mesh key={cp.image_index} position={toSceneSpace(cp.position)}>
          <coneGeometry args={[markerSize, markerSize * 2.4, 8]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.6} />
        </mesh>
      ))}
    </>
  );
}

export default function PointCloudViewer({ points, cameraPoses, accent }: {
  points: ReconstructedPoint[]; cameraPoses: CameraPose[]; accent: string;
}) {
  const framing = useMemo(() => {
    if (points.length === 0) return null;
    const scenePts = points.map(p => toSceneSpace([p[0], p[1], p[2]]));
    const centroid: [number, number, number] = [0, 0, 0];
    scenePts.forEach(p => { centroid[0] += p[0]; centroid[1] += p[1]; centroid[2] += p[2]; });
    centroid[0] /= scenePts.length; centroid[1] /= scenePts.length; centroid[2] /= scenePts.length;
    let radius = 0.01;
    scenePts.forEach(p => {
      const d = Math.hypot(p[0] - centroid[0], p[1] - centroid[1], p[2] - centroid[2]);
      if (d > radius) radius = d;
    });
    return { centroid, radius };
  }, [points]);

  if (points.length === 0 || !framing) return null;

  const cameraDistance = framing.radius * 2.5;
  const cameraPosition: [number, number, number] = [
    framing.centroid[0], framing.centroid[1], framing.centroid[2] + cameraDistance,
  ];

  return (
    <div style={{ width: "100%", height: 420, borderRadius: 12, overflow: "hidden", background: "var(--bg)", border: "1px solid var(--border)" }}>
      <Canvas camera={{ position: cameraPosition, fov: 60, near: cameraDistance / 100, far: cameraDistance * 20 }} gl={{ antialias: true }}>
        <ambientLight intensity={0.9} />
        <pointLight position={[cameraPosition[0] + framing.radius, cameraPosition[1] + framing.radius, cameraPosition[2]]} intensity={0.6} />
        <Cloud points={points} pointSize={3} />
        <CameraMarkers poses={cameraPoses} accent={accent} markerSize={framing.radius * 0.04} />
        <OrbitControls enableDamping dampingFactor={0.1} target={framing.centroid} />
      </Canvas>
    </div>
  );
}
