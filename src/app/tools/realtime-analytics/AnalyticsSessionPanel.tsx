"use client";

export interface SessionEvent {
  id: number;
  created_at: string;
  type: string;
  path: string;
  duration_ms: number;
  meta: Record<string, unknown>;
}

interface EventGroup { events: SessionEvent[]; type: string; path: string; }

function groupEvents(events: SessionEvent[]): EventGroup[] {
  const groups: EventGroup[] = [];
  for (const ev of events) {
    const last = groups[groups.length - 1];
    if (last && last.type === ev.type && last.path === ev.path) last.events.push(ev);
    else groups.push({ events: [ev], type: ev.type, path: ev.path });
  }
  return groups;
}

const TYPE_DOT: Record<string, string> = {
  page_view: "#6366f1", tool_open: "#10b981", query_run: "#f59e0b",
  tool_close: "#8b5cf6", custom: "#6b7280",
};

const Arrow = () => (
  <svg width="16" height="10" viewBox="0 0 16 10" fill="none" className="shrink-0 self-center mb-4">
    <path d="M1 5h12M10 2l3 3-3 3" stroke="#374151" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

interface Props {
  selectedSid: string;
  sessionEvs: SessionEvent[];
  sessLoading: boolean;
  sessError: string | null;
  expandedGroups: Set<number>;
  onClose: () => void;
  onToggleGroup: (gi: number) => void;
}

export default function SessionPathPanel({
  selectedSid, sessionEvs, sessLoading, sessError, expandedGroups, onClose, onToggleGroup,
}: Props) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-emerald-500/20 bg-[#080f1e]/95 backdrop-blur-md p-4 shadow-2xl">
      <div className="max-w-7xl mx-auto flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Session Path</p>
          <code className="text-[9px] text-emerald-400/60">{selectedSid.slice(0, 16)}…</code>
          <button onClick={onClose} className="ml-auto text-gray-600 hover:text-gray-400 text-[10px]">&#x2715; close</button>
        </div>
        {sessLoading && <p className="text-xs text-gray-600">Loading…</p>}
        {!sessLoading && sessError && <p className="text-xs text-red-400">Error: {sessError}</p>}
        {!sessLoading && !sessError && (
          <div className="flex items-start gap-1 overflow-x-auto pb-1">
            {sessionEvs.length === 0 && <p className="text-xs text-gray-600">No events found for this session.</p>}
            {groupEvents(sessionEvs).map((group, gi, groups) => {
              const color = TYPE_DOT[group.type] ?? "#6b7280";
              const isMulti = group.events.length > 1;
              const isExpanded = expandedGroups.has(gi);
              const isLast = gi === groups.length - 1;

              const SingleCard = ({ ev, showTs }: { ev: SessionEvent; showTs: boolean }) => (
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <div className="px-2 py-1.5 rounded-lg border text-center w-[82px]"
                    style={{ borderColor: `${color}40`, background: `${color}10` }}>
                    <p className="text-[9px] font-semibold truncate" style={{ color }}>{ev.type}</p>
                    <p className="text-[8px] text-gray-500 truncate">{ev.path || "/"}</p>
                    {ev.duration_ms > 0 && <p className="text-[8px] text-gray-600">{ev.duration_ms}ms</p>}
                  </div>
                  {showTs && <p className="text-[8px] text-gray-700">{new Date(ev.created_at).toTimeString().slice(0, 8)}</p>}
                </div>
              );

              return (
                <div key={gi} className="flex items-start gap-1 shrink-0">
                  {isMulti && !isExpanded && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => onToggleGroup(gi)} className="flex flex-col items-center gap-1 shrink-0 group">
                        <div className="px-2 py-1.5 rounded-lg border text-center w-[82px] cursor-pointer transition-colors"
                          style={{ borderColor: `${color}60`, background: `${color}15` }}>
                          <p className="text-[9px] font-semibold truncate" style={{ color }}>{group.type}</p>
                          <p className="text-[8px] text-gray-500 truncate">{group.path || "/"}</p>
                          <p className="text-[8px] mt-0.5 font-mono" style={{ color }}>×{group.events.length}</p>
                        </div>
                        <p className="text-[8px] text-gray-700 group-hover:text-gray-500">expand</p>
                      </button>
                      {!isLast && <Arrow />}
                    </div>
                  )}
                  {(isExpanded || !isMulti) && (
                    <div className="flex items-start gap-1 shrink-0">
                      {group.events.map((ev, ei) => (
                        <div key={ev.id} className="flex items-start gap-1 shrink-0">
                          <div onClick={isMulti ? () => onToggleGroup(gi) : undefined} className={isMulti ? "cursor-pointer" : ""}>
                            <SingleCard ev={ev} showTs />
                          </div>
                          {ei < group.events.length - 1 && <Arrow />}
                        </div>
                      ))}
                      {!isLast && <Arrow />}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}