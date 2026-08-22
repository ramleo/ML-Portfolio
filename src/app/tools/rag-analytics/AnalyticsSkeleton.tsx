"use client";

function Block({ className = "" }: { className?: string }) {
  return <div className={`rounded-2xl animate-pulse ${className}`} style={{ background: "var(--bg-glass)" }} />;
}

export default function AnalyticsSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map(i => <Block key={i} className="h-24" />)}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Block className="h-48" />
        <Block className="h-48" />
      </div>
    </div>
  );
}