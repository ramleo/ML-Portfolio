"use client";

import ConstellationBackground from "@/components/ConstellationBackground";
import Navbar from "@/components/Navbar";

/** Chrome shared by every platform-world page (Testwright /qa, Text-to-SQL
 *  /sql): the constellation ground, the global site navbar (so the world stays
 *  part of the site), and a world sub-nav supplied by the caller. */
export default function WorldShell({ nav, children }: { nav: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ color: "var(--text)" }}>
      <ConstellationBackground />
      <Navbar />
      <div className="relative z-10" style={{ paddingTop: 60 }}>
        {nav}
        <main>{children}</main>
      </div>
    </div>
  );
}
