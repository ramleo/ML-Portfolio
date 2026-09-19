"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { STAGES, STATUS_COLOR, QA_ACCENT, QA_ACCENT2 } from "./theme";

/** The in-world sub-navigation, persistent across every /qa/* page. Sits
 *  directly under the global site navbar and gives the platform its own header,
 *  the way a product hub carries its own product nav. */
export default function QaWorldNav() {
  const pathname = usePathname();

  return (
    <div
      className="sticky z-40 border-b backdrop-blur"
      style={{ top: 60, background: "var(--bg-nav)", borderColor: "var(--border)" }}
    >
      <div className="max-w-6xl mx-auto px-4 h-12 flex items-center justify-between gap-3">
        <Link href="/qa" className="flex items-center gap-2 shrink-0" style={{ textDecoration: "none" }}>
          <span
            className="w-5 h-5 rounded-md grid place-items-center shrink-0"
            style={{ background: `linear-gradient(135deg, ${QA_ACCENT}, ${QA_ACCENT2})` }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2">
              <path d="M9 3h6M10 3v5.5L5.5 17a2 2 0 0 0 1.8 3h9.4a2 2 0 0 0 1.8-3L14 8.5V3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="font-bold text-sm tracking-tight" style={{ color: "var(--text)" }}>Testwright</span>
        </Link>

        <nav className="flex items-center gap-1 overflow-x-auto">
          {STAGES.map((s) => {
            const active = pathname === s.href;
            return (
              <Link
                key={s.key}
                href={s.href}
                className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg whitespace-nowrap transition-colors"
                style={{
                  color: active ? "var(--text)" : "var(--text3)",
                  background: active ? "rgba(var(--fg-rgb),0.06)" : "transparent",
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: STATUS_COLOR[s.status] }} />
                {s.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
