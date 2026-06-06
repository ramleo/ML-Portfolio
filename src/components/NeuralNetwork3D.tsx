"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Points, PointMaterial } from "@react-three/drei";
import * as THREE from "three";

function NetworkNodes() {
  const pointsRef = useRef<THREE.Points>(null);
  const linesRef = useRef<THREE.LineSegments>(null);

  const { positions, linePositions } = useMemo(() => {
    const nodeCount = 120;
    const pos: number[] = [];
    const nodes: THREE.Vector3[] = [];

    for (let i = 0; i < nodeCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 1.2 + Math.random() * 0.8;
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);
      pos.push(x, y, z);
      nodes.push(new THREE.Vector3(x, y, z));
    }

    const linePts: number[] = [];
    const threshold = 1.1;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        if (nodes[i].distanceTo(nodes[j]) < threshold) {
          linePts.push(nodes[i].x, nodes[i].y, nodes[i].z);
          linePts.push(nodes[j].x, nodes[j].y, nodes[j].z);
        }
      }
    }

    return {
      positions: new Float32Array(pos),
      linePositions: new Float32Array(linePts),
    };
  }, []);

  useFrame((_, delta) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * 0.12;
      pointsRef.current.rotation.x += delta * 0.04;
    }
    if (linesRef.current) {
      linesRef.current.rotation.y += delta * 0.12;
      linesRef.current.rotation.x += delta * 0.04;
    }
  });

  const lineGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(linePositions, 3));
    return geo;
  }, [linePositions]);

  return (
    <>
      <lineSegments ref={linesRef} geometry={lineGeometry}>
        <lineBasicMaterial color="#6366f1" opacity={0.18} transparent />
      </lineSegments>
      <Points ref={pointsRef} positions={positions} stride={3} frustumCulled={false}>
        <PointMaterial
          transparent
          color="#818cf8"
          size={0.035}
          sizeAttenuation
          depthWrite={false}
        />
      </Points>
    </>
  );
}

function PulsingCore() {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (meshRef.current) {
      const s = 1 + 0.08 * Math.sin(clock.getElapsedTime() * 2);
      meshRef.current.scale.setScalar(s);
    }
  });
  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.18, 16, 16]} />
      <meshStandardMaterial
        color="#38bdf8"
        emissive="#38bdf8"
        emissiveIntensity={1.2}
        roughness={0.1}
        metalness={0.8}
      />
    </mesh>
  );
}

export default function NeuralNetwork3D() {
  return (
    <div style={{ width: "100%", height: "100%", position: "absolute", inset: 0, pointerEvents: "none" }}>
      <Canvas
        camera={{ position: [0, 0, 4], fov: 60 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.4} />
        <pointLight position={[3, 3, 3]} intensity={1.2} color="#818cf8" />
        <pointLight position={[-3, -3, -3]} intensity={0.6} color="#38bdf8" />
        <NetworkNodes />
        <PulsingCore />
      </Canvas>
    </div>
  );
}
