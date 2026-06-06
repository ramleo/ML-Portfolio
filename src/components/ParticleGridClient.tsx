"use client";

import dynamic from "next/dynamic";

const ParticleGrid = dynamic(() => import("./ParticleGrid"), { ssr: false });

export default function ParticleGridClient() {
  return <ParticleGrid />;
}
