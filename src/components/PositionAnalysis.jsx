import { useState } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { useBoardTheme } from '../hooks/useBoardTheme';
import { getPersonaForElo } from '../lib/coachPersona';
import { getCurrentRating } from '../lib/rating';
import { getPositionAnalysis } from '../lib/coachApi';

function parseInputToFen(input) {
  const trimmed = input.trim();
  if (!trimmed) return { error: 'הדביקו FEN או PGN לניתוח.' };

  // A FEN has exactly 6 space-separated fields; anything else we try as PGN.
  if (trimmed.split(/\s+/).length === 6) {
    try {
      const chess = new Chess(trimmed);
      return { fen: chess.fen() };
    } catch {
      return { error: 'ה-FEN שהודבק אינו תקין.' };
    }
  }

  try {
    const chess = new Chess();
    chess.loadPgn(trimmed, { strict: false });
    return { fen: chess.fen() };
  } catch {
    return { error: 'לא הצלחנו לפענח את הטקסט כ-FEN או כ-PGN תקין.' };
  }
}

export function PositionAnalysis() {
  const [theme] = useBoardTheme();
  const [input, setInput] = useState('');
  const [fen, setFen] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const persona = getPersonaForElo(getCurrentRating());

  const analyze = async () => {
    const parsed = parseInputToFen(input);
    if (parsed.error) {
      setError(parsed.error);
      setFen(null);
      setResult(null);
      return;
    }
    setError(null);
    setFen(parsed.fen);
    setResult(null);
    setLoading(true);
    try {
      const analysis = await getPositionAnalysis({ fen: parsed.fen, playerElo: getCurrentRating() });
      setResult(analysis);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div dir="rtl" className="mx-auto max-w-3xl space-y-5">
      <div className="text-center">
        <h2 className="text-xl font-bold text-slate-100">🔎 ניתוח עמדה חופשי</h2>
        <p className="mt-1 text-sm text-slate-400">
          הדביקו FEN או PGN של כל עמדה - לא חייבת להיות ממשחק שלכם - ו{persona.name} ינתח/תנתח אותה עבורכם.
        </p>
      </div>

      <div className="space-y-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={4}
          placeholder="לדוגמה: rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1&#10;או PGN מלא של משחק"
          className="w-full resize-none rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 font-mono text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none"
        />
        <button
          onClick={analyze}
          disabled={loading}
          className="w-full rounded-lg bg-gradient-to-r from-sky-500 to-indigo-500 px-4 py-2 font-bold text-white transition hover:from-sky-400 hover:to-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'מנתח...' : 'נתחו את העמדה'}
        </button>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>

      {fen && (
        <div className="flex flex-col items-center gap-4 sm:flex-row-reverse sm:items-start">
          <div className="w-full max-w-[320px]" dir="ltr">
            <Chessboard
              options={{
                position: fen,
                allowDragging: false,
                showAnimations: false,
                darkSquareStyle: { backgroundColor: theme.dark },
                lightSquareStyle: { backgroundColor: theme.light },
              }}
            />
          </div>

          <div className="flex-1 space-y-3">
            {loading && (
              <div className="flex items-center gap-2 rounded-lg bg-slate-800 p-3 text-sm text-slate-400">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-500 border-t-transparent" />
                {persona.name} בוחן/ת את העמדה...
              </div>
            )}
            {result && (
              <div className="space-y-3">
                <div className="rounded-lg border border-slate-700 bg-slate-800 p-3">
                  <p className="mb-1 text-xs font-bold text-slate-400">הערכה</p>
                  <p className="text-sm text-slate-200">{result.assessment}</p>
                </div>
                <div className="rounded-lg border border-slate-700 bg-slate-800 p-3">
                  <p className="mb-1 text-xs font-bold text-slate-400">רעיונות עיקריים</p>
                  <p className="text-sm text-slate-200">{result.keyIdeas}</p>
                </div>
                {result.planForWhite && (
                  <div className="rounded-lg border border-slate-700 bg-slate-800 p-3">
                    <p className="mb-1 text-xs font-bold text-slate-400">תוכנית ללבן</p>
                    <p className="text-sm text-slate-200">{result.planForWhite}</p>
                  </div>
                )}
                {result.planForBlack && (
                  <div className="rounded-lg border border-slate-700 bg-slate-800 p-3">
                    <p className="mb-1 text-xs font-bold text-slate-400">תוכנית לשחור</p>
                    <p className="text-sm text-slate-200">{result.planForBlack}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
