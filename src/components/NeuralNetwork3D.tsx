"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Points, PointMaterial } from "@react-three/drei";
import * as THREE from "three";
import { useIsDark } from "../hooks/useIsDark";

function NetworkNodes({ isDark }: { isDark: boolean }) {
  const pointsRef = useRef<THREE.Points>(null);
  const linesRef  = useRef<THREE.LineSegments>(null);
  const autoRot   = useRef({ x: 0, y: 0 });
  const currRot   = useRef({ x: 0, y: 0 });

  const { positions, linePositions } = useMemo(() => {
    const nodeCount = 120;
    const pos: number[] = [];
    const nodes: THREE.Vector3[] = [];

    for (let i = 0; i < nodeCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      const r     = 1.2 + Math.random() * 0.8;
      const x     = r * Math.sin(phi) * Math.cos(theta);
      const y     = r * Math.sin(phi) * Math.sin(theta);
      const z     = r * Math.cos(phi);
      pos.push(x, y, z);
      nodes.push(new THREE.Vector3(x, y, z));
    }

    const linePts: number[] = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        if (nodes[i].distanceTo(nodes[j]) < 1.1) {
          linePts.push(nodes[i].x, nodes[i].y, nodes[i].z,
                       nodes[j].x, nodes[j].y, nodes[j].z);
        }
      }
    }

    return {
      positions:     new Float32Array(pos),
      linePositions: new Float32Array(linePts),
    };
  }, []);

  const lineGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(linePositions, 3));
    return geo;
  }, [linePositions]);

  useFrame((state, delta) => {
    // Advance base auto-rotation
    autoRot.current.y += delta * 0.09;
    autoRot.current.x += delta * 0.03;

    // Target = auto + mouse offset (pointer is normalized -1..1)
    const targetY = autoRot.current.y + state.pointer.x * 0.8;
    const targetX = autoRot.current.x - state.pointer.y * 0.5;

    // Smooth lerp toward target
    currRot.current.y += (targetY - currRot.current.y) * 0.05;
    currRot.current.x += (targetX - currRot.current.x) * 0.05;

    if (pointsRef.current) {
      pointsRef.current.rotation.y = currRot.current.y;
      pointsRef.current.rotation.x = currRot.current.x;
    }
    if (linesRef.current) {
      linesRef.current.rotation.y = currRot.current.y;
      linesRef.current.rotation.x = currRot.current.x;
    }
  });

  return (
    <>
      <lineSegments ref={linesRef} geometry={lineGeometry}>
        <lineBasicMaterial
          color={isDark ? "#6366f1" : "#4f46e5"}
          opacity={isDark ? 0.18 : 0.22}
          transparent
        />
      </lineSegments>
      <Points ref={pointsRef} positions={positions} stride={3} frustumCulled={false}>
        <PointMaterial
          transparent
          color={isDark ? "#818cf8" : "#6366f1"}
          size={isDark ? 0.035 : 0.044}
          sizeAttenuation
          depthWrite={false}
          opacity={isDark ? 1 : 0.9}
        />
      </Points>
    </>
  );
}

function PulsingCore({ isDark }: { isDark: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (meshRef.current) {
      const s = 1 + 0.08 * Math.sin(clock.getElapsedTime() * 2);
      meshRef.current.scale.setScalar(s);
    }
  });
  // Sits at the exact centre of the hero, directly behind the headline and
  // sub-paragraph. As a fully opaque sphere it rendered as a hard disc over
  // that text (and over the stat row on mobile), badly hurting contrast in
  // both themes. Kept as the network's "core" but made translucent and
  // smaller so it reads as a soft glow the text stays legible against.
  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.13, 16, 16]} />
      <meshStandardMaterial
        color="#38bdf8"
        emissive="#38bdf8"
        emissiveIntensity={isDark ? 1.2 : 0.4}
        roughness={0.1}
        metalness={0.8}
        transparent
        opacity={isDark ? 0.4 : 0.28}
        depthWrite={false}
      />
    </mesh>
  );
}

export default function NeuralNetwork3D() {
  const isDark = useIsDark();

  return (
    <div style={{ width: "100%", height: "100%", position: "absolute", inset: 0, pointerEvents: "none" }}>
      <Canvas
        camera={{ position: [0, 0, 4], fov: 60 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={isDark ? 0.4 : 0.8} />
        <pointLight position={[3, 3, 3]}   intensity={isDark ? 1.2 : 0.6} color="#818cf8" />
        <pointLight position={[-3, -3, -3]} intensity={isDark ? 0.6 : 0.3} color="#38bdf8" />
        <NetworkNodes isDark={isDark} />
        <PulsingCore  isDark={isDark} />
      </Canvas>
    </div>
  );
}
