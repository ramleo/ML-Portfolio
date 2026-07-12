"use client";

const ACCENT = "#6366f1";

interface Props { onClose: () => void; }

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-[13px] font-bold text-white mb-3 flex items-center gap-2">
        <div className="w-1 h-4 rounded-full" style={{ background: ACCENT }} />
        {title}
      </h2>
      {children}
    </section>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex gap-3 mb-3">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
        style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.2)" }}>
        <span style={{ color: ACCENT }}>{icon}</span>
      </div>
      <div>
        <p className="text-[12px] font-semibold text-white/90 mb-0.5">{title}</p>
        <p className="text-[11px] text-gray-400 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

function KbdRow({ keys, desc }: { keys: string[]; desc: string }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
      <div className="flex gap-1 shrink-0">
        {keys.map(k => (
          <kbd key={k} className="text-[10px] px-1.5 py-0.5 rounded font-mono"
            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "#c7d2fe" }}>
            {k}
          </kbd>
        ))}
      </div>
      <span className="text-[11px] text-gray-400">{desc}</span>
    </div>
  );
}

function Tag({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wide"
      style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}>
      {label}
    </span>
  );
}

export default function UserGuideModal({ onClose }: Props) {
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto py-8 px-4"
      style={{ background: "rgba(0,0,0,0.75)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-2xl rounded-2xl border border-white/10 shadow-2xl"
        style={{ background: "#0d0d1a" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8 sticky top-0 rounded-t-2xl z-10"
          style={{ background: "#0d0d1a" }}>
          <div>
            <div className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 1C4.13 1 1 4.13 1 8s3.13 7 7 7 7-3.13 7-7-3.13-7-7-7z" stroke={ACCENT} strokeWidth="1.3"/>
                <path d="M8 11V7.5M8 5.5v-.5" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <h1 className="text-[15px] font-bold text-white">Text-to-SQL User Guide</h1>
            </div>
            <p className="text-[11px] text-gray-500 mt-0.5 ml-6">Everything you need to query data with natural language</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white p-1.5 rounded-lg hover:bg-white/8 transition-all">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6">

          {/* Intro */}
          <div className="mb-6 p-4 rounded-xl border border-indigo-500/20"
            style={{ background: "rgba(99,102,241,0.06)" }}>
            <p className="text-[12px] text-gray-300 leading-relaxed">
              <span className="text-white font-semibold">Text-to-SQL Agent</span> converts your plain English questions into SQL queries, runs them against your database, and returns results with charts, pagination, AI explanation, and export — no SQL knowledge required.
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] text-gray-500">Natural language</span>
              <svg width="20" height="8" viewBox="0 0 20 8" fill="none"><path d="M1 4h16M14 1l3 3-3 3" stroke={ACCENT} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <span className="text-[10px] text-gray-500">SQL</span>
              <svg width="20" height="8" viewBox="0 0 20 8" fill="none"><path d="M1 4h16M14 1l3 3-3 3" stroke={ACCENT} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <span className="text-[10px] text-gray-500">Results</span>
              <svg width="20" height="8" viewBox="0 0 20 8" fill="none"><path d="M1 4h16M14 1l3 3-3 3" stroke={ACCENT} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <span className="text-[10px] text-gray-500">Explanation</span>
            </div>
          </div>

          {/* Getting Started */}
          <Section title="Getting Started">
            <Feature
              icon={<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3"/><path d="M7 4.5v3l2 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>}
              title="Guided Walkthrough"
              desc="On your first visit a 6-step spotlight tour walks through every panel. Click 'Next' to progress or 'Skip tour' to dismiss. Restart it by clearing localStorage (ml_sql_walked key)."
            />
            <Feature
              icon={<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><rect x="1" y="3" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M4 7h6M7 5v4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>}
              title="Type a Question"
              desc="Type any question in plain English in the main input box — e.g. 'Show the top 10 customers by total spending'. Press Enter or click Ask to run."
            />
            <Feature
              icon={<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M2 4l5 5 5-5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              title="Surprise Me"
              desc="Click 'Surprise me' to pick a random sample question and run it immediately — great for exploring a new database."
            />
          </Section>

          {/* Connecting Data */}
          <Section title="Connecting Your Data">
            <div className="space-y-2 text-[11px] text-gray-400 leading-relaxed">
              <div className="flex gap-2 items-start p-3 rounded-lg border border-white/6" style={{ background: "rgba(255,255,255,0.02)" }}>
                <Tag color="#6366f1" label="Demo" />
                <p><span className="text-white/80 font-medium">Chinook Demo</span> — the built-in music store database (11 tables, 15k+ rows). No setup needed. Includes artists, albums, tracks, invoices, customers.</p>
              </div>
              <div className="flex gap-2 items-start p-3 rounded-lg border border-white/6" style={{ background: "rgba(255,255,255,0.02)" }}>
                <Tag color="#10b981" label="Upload" />
                <p><span className="text-white/80 font-medium">Upload File</span> — drag or choose a <code className="text-indigo-300 text-[10px]">.db</code>, <code className="text-indigo-300 text-[10px]">.sqlite</code>, <code className="text-indigo-300 text-[10px]">.duckdb</code>, <code className="text-indigo-300 text-[10px]">.parquet</code>, or <code className="text-indigo-300 text-[10px]">.csv</code> file. The backend loads it into an in-memory session. CSV files are auto-converted.</p>
              </div>
              <div className="flex gap-2 items-start p-3 rounded-lg border border-white/6" style={{ background: "rgba(255,255,255,0.02)" }}>
                <Tag color="#38bdf8" label="Remote" />
                <p><span className="text-white/80 font-medium">PostgreSQL / MySQL / SQL Server</span> — paste a connection string and click Connect. The schema is loaded automatically. All queries run on your database.</p>
              </div>
            </div>
          </Section>

          {/* AI Providers */}
          <Section title="AI Providers">
            <div className="grid grid-cols-3 gap-2 text-[11px]">
              {[
                { name: "Groq", color: "#f59e0b", note: "Fastest — best for quick iteration" },
                { name: "Gemini", color: "#10b981", note: "Google — good for complex joins" },
                { name: "Cohere", color: "#6366f1", note: "Fallback if others hit rate limits" },
              ].map(p => (
                <div key={p.name} className="p-3 rounded-xl border border-white/8 text-center" style={{ background: "rgba(255,255,255,0.02)" }}>
                  <div className="w-2 h-2 rounded-full mx-auto mb-1.5" style={{ background: p.color }} />
                  <p className="font-semibold text-white/80 mb-1">{p.name}</p>
                  <p className="text-gray-500 text-[10px] leading-snug">{p.note}</p>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-gray-600 mt-2">Switch provider from the dropdown next to the Ask button. If you hit a rate limit, switch and retry.</p>
          </Section>

          {/* Working with Results */}
          <Section title="Working with Results">
            <Feature
              icon={<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="12" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M1 5h12M5 5v8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>}
              title="Results Table"
              desc="Results load in a paginated table (50 rows per page). Click any column header to sort ascending/descending — an arrow indicator shows the active sort."
            />
            <Feature
              icon={<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3"/><path d="M4 7h6M7 4v6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>}
              title="Pagination"
              desc="For large result sets, use the page controls at the bottom. The total row count is shown. For PostgreSQL / MySQL / SQL Server, pagination uses a COUNT(*) subquery."
            />
            <Feature
              icon={<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M1 7h12M1 3.5h12M1 10.5h8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>}
              title="Natural Language Filter"
              desc="Type a plain-English filter in the filter box (e.g. 'only customers from USA') and press Enter. The LLM translates it to a WHERE clause and re-runs the query."
            />
            <Feature
              icon={<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M2 10l3-3 2 2 3-4 2 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              title="Auto Charts"
              desc="Charts are auto-detected from your result columns — bar, line, scatter, pie, key metrics. Use the type pills to override. Your choice is saved per tab and survives tab switches."
            />
            <Feature
              icon={<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M3 7l2.5 2.5L11 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              title="Export"
              desc="Click the download icon to export results as a Markdown (.md) file with the SQL query, result table, and metadata included."
            />
          </Section>

          {/* Auto-Insights */}
          <Section title="Auto-Insights">
            <div className="mb-3 p-3 rounded-xl border border-emerald-500/20" style={{ background: "rgba(16,185,129,0.05)" }}>
              <p className="text-[11px] text-gray-300 leading-relaxed">
                After every query, the <span className="text-emerald-400 font-semibold">Auto-Insights</span> panel automatically scans the result rows and surfaces patterns — no extra click needed. It appears between the results table and the chart, collapsed or expanded.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {[
                { label: "Nulls", color: "#f59e0b", desc: "Columns with >5% null values. Warning badge if >30% null." },
                { label: "Outliers", color: "#f59e0b", desc: "Numeric values more than 2.5 standard deviations from the mean." },
                { label: "Dominant value", color: "#818cf8", desc: "A single value appears in >40% of non-null rows." },
                { label: "Unique key", color: "#818cf8", desc: "100% distinct values — column is likely a primary key." },
                { label: "Constant column", color: "#94a3b8", desc: "Every row has the same value — column adds no information." },
                { label: "Skew", color: "#818cf8", desc: "Numeric range spans more than 100× (e.g. min=1, max=450)." },
              ].map(({ label, color, desc }) => (
                <div key={label} className="p-2.5 rounded-lg border border-white/6" style={{ background: "rgba(255,255,255,0.02)" }}>
                  <span className="inline-block text-[9px] font-semibold rounded px-1.5 py-0.5 mb-1 font-mono"
                    style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}>
                    {label}
                  </span>
                  <p className="text-[10px] text-gray-500 leading-snug">{desc}</p>
                </div>
              ))}
            </div>
            <div className="flex items-start gap-2 p-2.5 rounded-lg border border-amber-500/25 mt-1" style={{ background: "rgba(245,158,11,0.06)" }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="shrink-0 mt-0.5 text-amber-400">
                <path d="M6 1l5 9H1L6 1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                <path d="M6 5v2.5M6 9v.3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
              <p className="text-[10px] text-amber-300/80 leading-relaxed"><span className="font-semibold">Requires at least 4 result rows</span> — queries returning 2–3 rows won&apos;t show insights (too few data points for meaningful statistics).</p>
            </div>
            <p className="text-[10px] text-gray-600 leading-relaxed mt-2">Up to 8 insights shown, ranked by interestingness. Amber = warning (act on it), indigo = informational. Click the panel header to collapse/expand.</p>
          </Section>

          {/* Multi-Tab */}
          <Section title="Multi-Tab Workflow">
            <p className="text-[11px] text-gray-400 leading-relaxed mb-3">
              Every query opens in its own tab. Up to 5 tabs are kept at once (pinned tabs never auto-close). Each tab has its own SQL, results, filter, page, and chart override — completely isolated.
            </p>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              {[
                ["Pin a tab", "Click the pin icon to prevent a tab from being auto-closed when the 5-tab limit is reached."],
                ["Close a tab", "Click × on any tab. The tab to the left becomes active."],
                ["Tab persistence", "All open tabs (including SQL, results, and chart overrides) are saved in sessionStorage and restored on page reload."],
                ["Question sync", "Switching tabs updates the question input to show that tab's original question."],
              ].map(([title, desc]) => (
                <div key={title as string} className="p-3 rounded-lg border border-white/6" style={{ background: "rgba(255,255,255,0.02)" }}>
                  <p className="text-white/80 font-semibold mb-1">{title}</p>
                  <p className="text-gray-500 text-[10px] leading-snug">{desc}</p>
                </div>
              ))}
            </div>
          </Section>

          {/* SQL Panel */}
          <Section title="SQL Panel">
            <Feature
              icon={<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M3 5l2-2 2 2M5 3v8M9 9l2 2-2 2M11 11H3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              title="View & Copy Generated SQL"
              desc="The SQL panel shows the exact query that was generated and executed. Click the copy icon to copy it to the clipboard."
            />
            <Feature
              icon={<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              title="Edit & Re-run SQL"
              desc="Click 'Edit SQL' to open the query in an editable textarea. Modify it and click Run to execute your custom SQL directly — bypassing the LLM entirely."
            />
          </Section>

          {/* AI Explanation */}
          <Section title="AI Explanation">
            <p className="text-[11px] text-gray-400 leading-relaxed mb-3">
              After results load, click <span className="text-white/70 font-mono text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.06)" }}>Explain</span> at the bottom of the result panel. The AI streams a plain-English explanation of the SQL logic and what the results mean.
            </p>
            <Feature
              icon={<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M7 1v2M7 11v2M1 7h2M11 7h2M3.22 3.22l1.41 1.41M9.37 9.37l1.41 1.41M3.22 10.78l1.41-1.41M9.37 4.63l1.41-1.41" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>}
              title="You Might Also Ask"
              desc="After the explanation, 3 follow-up question suggestions appear. Click any to prefill the question box and run the next query — building a conversation with your data."
            />
          </Section>

          {/* Schema & Glossary */}
          <Section title="Schema Explorer & Glossary">
            <Feature
              icon={<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="5" height="4" rx="1" stroke="currentColor" strokeWidth="1.3"/><rect x="8" y="1" width="5" height="4" rx="1" stroke="currentColor" strokeWidth="1.3"/><rect x="1" y="9" width="5" height="4" rx="1" stroke="currentColor" strokeWidth="1.3"/><path d="M6 3h2M8.5 5v4h-2" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></svg>}
              title="Schema Panel"
              desc="Browse all tables and columns in the left sidebar. Click a table to expand its columns and row count. Type in the search box to filter by name."
            />
            <Feature
              icon={<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="5" height="4" rx="1" stroke="currentColor" strokeWidth="1.3"/><rect x="8" y="1" width="5" height="4" rx="1" stroke="currentColor" strokeWidth="1.3"/><path d="M3.5 9l3.5 4 3.5-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              title="ER Diagram / Column Profile"
              desc="Click 'View ER Diagram' to open an interactive schema diagram — drag tables, zoom, and click a table to highlight its relationships. For single-table uploads (CSV), a Column Profile view shows instead, with type-colored column list and type distribution."
            />
            <Feature
              icon={<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M2 4h10M2 7h7M2 10h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>}
              title="Glossary"
              desc="Define domain-specific terms (one per line, format: 'term: definition'). These are injected into every SQL prompt so the LLM understands your business vocabulary. The glossary clears automatically when you switch databases."
            />
          </Section>

          {/* History & Saved */}
          <Section title="Query History & Saved Queries">
            <Feature
              icon={<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3"/><path d="M7 4v3.5L9.5 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>}
              title="Query History"
              desc="Every successful query is added to the history panel (below the question input). Click any entry to re-run that question. History persists for the current session only."
            />
            <Feature
              icon={<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M2 2h10v10H2zM5 6l2 2 4-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              title="Saved Queries"
              desc="In the sidebar, save the current query (question + SQL) with a name. Saved queries persist in localStorage and can be loaded in future sessions."
            />
          </Section>

          {/* Keyboard Shortcuts */}
          <Section title="Keyboard Shortcuts">
            <div className="rounded-xl border border-white/8 overflow-hidden" style={{ background: "rgba(255,255,255,0.02)" }}>
              <div className="px-4 py-2">
                <KbdRow keys={["⌘", "Enter"]} desc="Run the current query" />
                <KbdRow keys={["⌘", "K"]} desc="Focus the question input and select all text" />
                <KbdRow keys={["Enter"]} desc="Run query (when question input is focused)" />
                <KbdRow keys={["Esc"]} desc="Close any open modal (diagram, user guide)" />
              </div>
            </div>
          </Section>

          {/* Tips */}
          <Section title="Tips & Tricks">
            <div className="space-y-2">
              {[
                { tip: "Be specific with column names", detail: "Include column names from the schema for better accuracy, e.g. 'show BillingCountry and sum of Total from Invoice'." },
                { tip: "Use the Glossary for abbreviations", detail: "If your schema uses codes or abbreviations (e.g. 'cust_ltv'), define them in the Glossary so the LLM maps them correctly." },
                { tip: "Switch providers on rate limits", detail: "Groq free tier allows ~30 queries/minute. If you see a rate limit error, switch to Gemini or Cohere and try again." },
                { tip: "Pin tabs for reference queries", detail: "Pin a tab whose results you want to keep as reference while exploring other questions in new tabs." },
                { tip: "Share queries (Chinook only)", detail: "Click the Share button to copy a URL that pre-fills the question box. Useful for sharing interesting findings." },
                { tip: "Try Ask a follow-up", detail: "After results load, scroll down and click 'Ask a follow-up' — previous query context is retained so you can drill down without re-explaining the schema." },
              ].map(({ tip, detail }) => (
                <div key={tip} className="flex gap-2.5 p-3 rounded-lg border border-white/5" style={{ background: "rgba(255,255,255,0.02)" }}>
                  <div className="w-1 h-1 rounded-full mt-2 shrink-0" style={{ background: ACCENT }} />
                  <div>
                    <p className="text-[11px] font-semibold text-white/80">{tip}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5 leading-relaxed">{detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </Section>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/8 rounded-b-2xl flex items-center justify-between"
          style={{ background: "rgba(0,0,0,0.2)" }}>
          <span className="text-[10px] text-gray-600">Text-to-SQL Agent — ML Portfolio</span>
          <button onClick={onClose}
            className="text-[11px] px-3 py-1.5 rounded-lg font-medium text-white transition-all hover:brightness-110"
            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}