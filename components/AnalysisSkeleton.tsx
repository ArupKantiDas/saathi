'use client';

export default function AnalysisSkeleton() {
  return (
    <div
      className="flex flex-col gap-4"
      aria-busy="true"
      aria-label="Loading analysis"
      role="status"
    >
      {/* Message block */}
      <div className="card flex flex-col gap-3">
        <div className="skeleton h-4 w-3/4" />
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-4 w-5/6" />
        <div className="skeleton h-4 w-1/3 mt-1" />
      </div>
      {/* Chips */}
      <div className="flex gap-2">
        <div className="skeleton h-7 w-24 rounded-full" />
        <div className="skeleton h-7 w-20 rounded-full" />
        <div className="skeleton h-7 w-28 rounded-full" />
      </div>
      {/* Technique */}
      <div className="card flex flex-col gap-3" style={{ background: 'var(--bg-muted)' }}>
        <div className="skeleton h-3 w-24" />
        <div className="skeleton h-5 w-40" />
        <div className="skeleton h-3 w-full" />
        <div className="skeleton h-3 w-5/6" />
        <div className="skeleton h-3 w-3/4" />
        <div className="skeleton h-3 w-4/5" />
      </div>
    </div>
  );
}
