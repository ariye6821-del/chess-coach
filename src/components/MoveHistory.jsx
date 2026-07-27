export function MoveHistory({ moves, onSelectPly, selectedPly }) {
  const pairs = [];
  for (let i = 0; i < moves.length; i += 2) {
    pairs.push({ number: i / 2 + 1, white: { ply: i, san: moves[i] }, black: moves[i + 1] ? { ply: i + 1, san: moves[i + 1] } : null });
  }

  const clickable = !!onSelectPly;

  return (
    <div className="w-full rounded-xl border border-slate-700 bg-slate-900/80 p-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-300">היסטוריית מהלכים</h3>
        {clickable && selectedPly != null && (
          <button onClick={() => onSelectPly(null)} className="text-xs font-bold text-sky-400 hover:text-sky-300">
            חזרה לעמדה הנוכחית
          </button>
        )}
      </div>
      {pairs.length === 0 ? (
        <p className="text-sm text-slate-500">עדיין לא בוצעו מהלכים.</p>
      ) : (
        <ol className="grid max-h-32 grid-cols-2 gap-x-3 gap-y-1 overflow-y-auto text-sm text-slate-300 sm:grid-cols-3">
          {pairs.map((pair) => (
            <li key={pair.number} className="font-mono">
              <span className="text-slate-500">{pair.number}.</span>{' '}
              <span
                onClick={clickable ? () => onSelectPly(pair.white.ply === selectedPly ? null : pair.white.ply) : undefined}
                className={clickable ? `cursor-pointer rounded px-0.5 hover:bg-slate-800 ${selectedPly === pair.white.ply ? 'bg-sky-700 text-white' : ''}` : ''}
              >
                {pair.white.san}
              </span>{' '}
              {pair.black && (
                <span
                  onClick={clickable ? () => onSelectPly(pair.black.ply === selectedPly ? null : pair.black.ply) : undefined}
                  className={clickable ? `cursor-pointer rounded px-0.5 hover:bg-slate-800 ${selectedPly === pair.black.ply ? 'bg-sky-700 text-white' : ''}` : ''}
                >
                  {pair.black.san}
                </span>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
