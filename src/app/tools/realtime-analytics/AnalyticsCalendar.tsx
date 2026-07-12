"use client";
import { useState } from "react";

interface Props {
  onSelect: (start: string, end: string) => void;
}

export default function AnalyticsCalendar({ onSelect }: Props) {
  const now = new Date();
  const [viewYear, setViewYear]   = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selecting, setSelecting] = useState<string | null>(null);
  const [hovered, setHovered]     = useState<string | null>(null);

  const today = now.toISOString().slice(0, 10);

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }

  function getDays(): (string | null)[] {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const total    = new Date(viewYear, viewMonth + 1, 0).getDate();
    const days: (string | null)[] = Array(firstDay).fill(null);
    for (let d = 1; d <= total; d++)
      days.push(`${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
    return days;
  }

  function clickDay(day: string) {
    if (day > today) return;
    if (!selecting) { setSelecting(day); return; }
    const [s, e] = day < selecting ? [day, selecting] : [selecting, day];
    onSelect(s, e);
    setSelecting(null);
    setHovered(null);
  }

  function inRange(day: string) {
    if (!selecting || !hovered) return false;
    const lo = selecting < hovered ? selecting : hovered;
    const hi = selecting < hovered ? hovered   : selecting;
    return day >= lo && day <= hi;
  }

  const days      = getDays();
  const monthLabel = new Date(viewYear, viewMonth).toLocaleString("default", { month: "long", year: "numeric" });

  return (
    <div className="absolute top-full left-0 mt-1 z-50 rounded-xl border border-white/10 bg-[#0d1626] p-4 shadow-2xl w-60"
      onMouseLeave={() => setHovered(null)}>
      <div className="flex items-center justify-between mb-3">
        <button onClick={prevMonth} className="text-gray-500 hover:text-white px-1 text-base leading-none">‹</button>
        <span className="text-[10px] text-gray-400 font-medium">{monthLabel}</span>
        <button onClick={nextMonth} className="text-gray-500 hover:text-white px-1 text-base leading-none">›</button>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => (
          <span key={d} className="text-center text-[8px] text-gray-600">{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day, i) => {
          if (!day) return <span key={i}/>;
          const isFuture  = day > today;
          const isSelected = day === selecting;
          const isInRange  = inRange(day);
          return (
            <button key={day} disabled={isFuture}
              onClick={() => clickDay(day)}
              onMouseEnter={() => selecting && setHovered(day)}
              className="text-center text-[10px] py-1 rounded transition-colors"
              style={isSelected
                ? { background: "#10b981", color: "white" }
                : isInRange
                ? { background: "rgba(16,185,129,0.2)", color: "#10b981" }
                : isFuture
                ? { color: "#1f2937" }
                : { color: "#9ca3af" }}>
              {parseInt(day.slice(8))}
            </button>
          );
        })}
      </div>
      <p className="text-[8px] text-gray-600 mt-2 text-center">
        {selecting ? "Click another date for a range" : "Click a date, or two dates for a range"}
      </p>
    </div>
  );
}