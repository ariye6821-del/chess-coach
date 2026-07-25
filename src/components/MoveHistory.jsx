export function MoveHistory({ moves }) {
  const pairs = [];
  for (let i = 0; i < moves.length; i += 2) {
    pairs.push({ number: i / 2 + 1, white: moves[i], black: moves[i + 1] });
  }

  return (
    <div className="w-full rounded-xl border border-slate-700 bg-slate-900/80 p-3">
      <h3 className="mb-2 text-sm font-bold text-slate-300">היסטוריית מהלכים</h3>
      {pairs.length === 0 ? (
        <p className="text-sm text-slate-500">עדיין לא בוצעו מהלכים.</p>
      ) : (
        <ol className="grid max-h-32 grid-cols-2 gap-x-3 gap-y-1 overflow-y-auto text-sm text-slate-300 sm:grid-cols-3">
          {pairs.map((pair) => (
            <li key={pair.number} className="font-mono">
              <span className="text-slate-500">{pair.number}.</span> {pair.white} {pair.black || ''}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
