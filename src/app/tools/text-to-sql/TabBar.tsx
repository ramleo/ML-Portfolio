"use client";

interface ResultTab {
  id: string;
  question: string;
  results: { count: number } | null;
  pinned?: boolean;
}

interface Props {
  tabs: ResultTab[];
  activeTabId: string | null;
  onSelect: (id: string) => void;
  onPin: (id: string) => void;
  onClose: (id: string) => void;
}

export default function TabBar({ tabs, activeTabId, onSelect, onPin, onClose }: Props) {
  if (!tabs.length) return null;
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
      {tabs.map((tab, i) => (
        <div key={tab.id} onClick={() => onSelect(tab.id)}
          className={`group flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] shrink-0 cursor-pointer transition-all ${
            tab.id === activeTabId
              ? "bg-indigo-500/15 border-indigo-500/30 text-indigo-300"
              : "border-[var(--border)] text-[var(--text3)] hover:text-[var(--text2)] hover:border-[var(--border2)]"
          }`}>
          <span className="text-[9px] text-[var(--text3)]">{i + 1}</span>
          {tab.pinned && <span className="text-[9px] text-amber-400/70">●</span>}
          <span className="max-w-[120px] truncate">{tab.question || "Query"}</span>
          {tab.results && <span className="text-[9px] text-[var(--text3)] ml-0.5">{tab.results.count}r</span>}
          <button onClick={e => { e.stopPropagation(); onPin(tab.id); }}
            title={tab.pinned ? "Unpin" : "Pin"}
            className={`ml-0.5 transition-opacity ${tab.pinned ? "opacity-70 text-amber-400" : "opacity-0 group-hover:opacity-40 hover:!opacity-100"}`}>
            <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
              <path d="M5 1l1.2 3h3L6.9 6l.8 3L5 7.5 3.3 9l.8-3L1.8 4h3z" fill="currentColor"/>
            </svg>
          </button>
          <button onClick={e => { e.stopPropagation(); onClose(tab.id); }}
            className="opacity-0 group-hover:opacity-40 hover:!opacity-100 transition-opacity">
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
              <path d="M1 1l6 6M7 1L1 7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}