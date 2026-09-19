"use client";

import ConstellationBackground from "@/components/ConstellationBackground";
import Navbar from "@/components/Navbar";
import QaWorldNav from "./QaWorldNav";

/** Chrome shared by every page in the Testwright world: the constellation
 *  ground, the global site navbar (so the world stays part of the site), and
 *  the in-world sub-nav. Each page supplies only its own content. */
export default function QaWorldShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ color: "var(--text)" }}>
      <ConstellationBackground />
      <Navbar />
      <div className="relative z-10" style={{ paddingTop: 60 }}>
        <QaWorldNav />
        <main>{children}</main>
      </div>
    </div>
  );
}
