"use client";

interface Props {
  running: boolean;
  retryMsg: string;
  hasSql: boolean;
  hasResults: boolean;
  hasExplanation: boolean;
}

const STAGES = [
  {
    label: "Schema",
    icon: (
      <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
        <rect x="1" y="1" width="10" height="3" rx="0.8" stroke="currentColor" strokeWidth="1.2" />
        <rect x="1" y="6" width="6" height="2" rx="0.8" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    ),
  },
  {
    label: "SQL",
    icon: (
      <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
        <path d="M3 4L1 6l2 2M9 4l2 2-2 2M5 9l2-6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: "Execute",
    icon: (
      <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
        <path d="M3 2l7 4-7 4V2z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    label: "Explain",
    icon: (
      <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
        <path d="M2 3h8M2 6h6M2 9h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
];

export default function PipelineStatus({ running, retryMsg, hasSql, hasResults, hasExplanation }: Props) {
  if (!running && !hasSql && !retryMsg) return null;

  const active = hasExplanation ? 3 : hasResults ? 2 : hasSql ? 1 : 0;
  const allDone = !running && hasExplanation;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-0.5">
        {STAGES.map((s, i) => {
          const isDone = i < active || (allDone && i === active);
          const isActive = i === active && (running || allDone) && !isDone;
          return (
            <div key={s.label} className="flex items-center">
              <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-all duration-300 ${
                isDone
                  ? "bg-indigo-500/20 text-indigo-300"
                  : isActive
                  ? "bg-indigo-500/25 text-indigo-200 ring-1 ring-indigo-500/50"
                  : "text-gray-600"
              }`}>
                {s.icon}
                <span>{s.label}</span>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                )}
                {isDone && (
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                    <path d="M1.5 4l2 2 3-3" stroke="#818cf8" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              {i < 3 && (
                <div className={`w-4 h-px mx-0.5 transition-colors duration-500 ${i < active ? "bg-indigo-500/40" : "bg-white/10"}`} />
              )}
            </div>
          );
        })}
      </div>
      {retryMsg && <p className="text-[11px] text-yellow-400">{retryMsg}</p>}
    </div>
  );
}