"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type WorldNavItem = { label: string; href: string; dot?: string; external?: boolean };

/** The in-world sub-nav, persistent under the global navbar on every page of a
 *  platform world. Config-driven so each world (Testwright, Text-to-SQL) gets
 *  the same header treatment with its own wordmark, accent and links. */
export default function WorldNav({
  wordmark, wordmarkHref, icon, accent, accent2, items,
}: {
  wordmark: string;
  wordmarkHref: string;
  icon: React.ReactNode;
  accent: string;
  accent2: string;
  items: WorldNavItem[];
}) {
  const pathname = usePathname();

  return (
    <div className="sticky z-40 border-b backdrop-blur" style={{ top: 60, background: "var(--bg-nav)", borderColor: "var(--border)" }}>
      <div className="max-w-6xl mx-auto px-4 h-12 flex items-center justify-between gap-3">
        <Link href={wordmarkHref} className="flex items-center gap-2 shrink-0" style={{ textDecoration: "none" }}>
          <span className="w-5 h-5 rounded-md grid place-items-center shrink-0"
            style={{ background: `linear-gradient(135deg, ${accent}, ${accent2})` }}>
            {icon}
          </span>
          <span className="font-bold text-sm tracking-tight" style={{ color: "var(--text)" }}>{wordmark}</span>
        </Link>

        <nav className="flex items-center gap-1 overflow-x-auto">
          {items.map((it) => {
            const active = pathname === it.href;
            const cls = "flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg whitespace-nowrap transition-colors";
            const st = { color: active ? "var(--text)" : "var(--text3)", background: active ? "rgba(var(--fg-rgb),0.06)" : "transparent" };
            const inner = <>{it.dot && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: it.dot }} />}{it.label}</>;
            return it.external ? (
              <a key={it.href} href={it.href} target="_blank" rel="noopener noreferrer" className={cls} style={st}>{inner}</a>
            ) : (
              <Link key={it.href} href={it.href} className={cls} style={st}>{inner}</Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
