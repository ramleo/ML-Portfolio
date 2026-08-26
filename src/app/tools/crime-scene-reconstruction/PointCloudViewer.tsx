"use client";

import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

export type ReconstructedPoint = [number, number, number, number, number, number];
export type CameraPose = { position: [number, number, number]; image_index: number };

function Cloud({ points }: { points: ReconstructedPoint[] }) {
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(points.length * 3);
    const colors = new Float32Array(points.length * 3);
    points.forEach((p, i) => {
      positions[i * 3] = p[0];
      positions[i * 3 + 1] = p[1];
      positions[i * 3 + 2] = p[2];
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
      <pointsMaterial size={0.035} vertexColors sizeAttenuation />
    </points>
  );
}

function CameraMarkers({ poses, accent }: { poses: CameraPose[]; accent: string }) {
  return (
    <>
      {poses.map(cp => (
        <mesh key={cp.image_index} position={cp.position}>
          <coneGeometry args={[0.05, 0.12, 8]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.6} />
        </mesh>
      ))}
    </>
  );
}

export default function PointCloudViewer({ points, cameraPoses, accent }: {
  points: ReconstructedPoint[]; cameraPoses: CameraPose[]; accent: string;
}) {
  if (points.length === 0) return null;

  return (
    <div style={{ width: "100%", height: 420, borderRadius: 12, overflow: "hidden", background: "var(--bg)", border: "1px solid var(--border)" }}>
      <Canvas camera={{ position: [0, 0, 3], fov: 60 }} gl={{ antialias: true }}>
        <ambientLight intensity={0.9} />
        <pointLight position={[3, 3, 3]} intensity={0.6} />
        <Cloud points={points} />
        <CameraMarkers poses={cameraPoses} accent={accent} />
        <OrbitControls enableDamping dampingFactor={0.1} />
      </Canvas>
    </div>
  );
}
