"use client";

import dynamic from "next/dynamic";

/**
 * The three sections below the tool grid — architecture diagram, pipeline
 * showcase, news — are all framer-motion client components well below the fold.
 * On the home page they were hydrating on first load alongside the hero, which
 * is what pushed the (text) LCP to ~4s and the total blocking time to ~860ms.
 *
 * Loading them after hydration (ssr:false) keeps their JS off the first paint.
 * They sit below the initial viewport, so populating them a beat later doesn't
 * shift anything on screen (CLS stays ~0). The primary content — hero and the
 * tool grid above — is untouched and still server-rendered for SEO.
 */
const ArchitectureDiagram = dynamic(() => import("./ArchitectureDiagram"), { ssr: false });
const PipelineShowcase = dynamic(() => import("./PipelineShowcase"), { ssr: false });
const NewsSection = dynamic(() => import("./NewsSection"), { ssr: false });

export default function HomeBelowFold() {
  return (
    <>
      <ArchitectureDiagram />
      <PipelineShowcase />
      <NewsSection />
    </>
  );
}
