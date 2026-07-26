const MAX_CP = 800;

/**
 * evalCp is always in White's perspective. The board flips when the student plays
 * Black, so the bar's white/black segments swap top and bottom too, keeping the
 * segment nearest the student's own pieces (bottom of the flipped board) meaningful.
 */
export function EvalBar({ evalCp, perspective = 'w' }) {
  const clamped = Math.max(-MAX_CP, Math.min(MAX_CP, evalCp));
  const whitePercent = 50 + (clamped / MAX_CP) * 50;
  const label = evalCp >= 0 ? `+${(evalCp / 100).toFixed(1)}` : (evalCp / 100).toFixed(1);

  const whiteSegment = <div key="white" className="bg-slate-200 transition-all duration-500" style={{ height: `${whitePercent}%` }} />;
  const blackSegment = (
    <div key="black" className="bg-slate-950 transition-all duration-500" style={{ height: `${100 - whitePercent}%` }} />
  );

  return (
    <div className="flex h-full w-6 flex-col overflow-hidden rounded-full border border-slate-700 bg-slate-950 sm:w-8">
      {perspective === 'b' ? [whiteSegment, blackSegment] : [blackSegment, whiteSegment]}
      <span className="sr-only">{label}</span>
    </div>
  );
}
