const MAX_CP = 800;

export function EvalBar({ evalCp }) {
  const clamped = Math.max(-MAX_CP, Math.min(MAX_CP, evalCp));
  const whitePercent = 50 + (clamped / MAX_CP) * 50;
  const label = evalCp >= 0 ? `+${(evalCp / 100).toFixed(1)}` : (evalCp / 100).toFixed(1);

  return (
    <div className="flex h-full w-6 flex-col overflow-hidden rounded-full border border-slate-700 bg-slate-950 sm:w-8">
      <div className="bg-slate-950 transition-all duration-500" style={{ height: `${100 - whitePercent}%` }} />
      <div className="bg-slate-200 transition-all duration-500" style={{ height: `${whitePercent}%` }} />
      <span className="sr-only">{label}</span>
    </div>
  );
}
