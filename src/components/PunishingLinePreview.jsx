import { useEffect, useRef, useState } from 'react';

// A short, plain-language caption for one punishment-line move, derived straight
// from its SAN suffix ('x' = capture, '+' = check, '#' = mate) - no extra data
// needed, just enough to narrate what's actually happening at each step instead
// of leaving the student to read raw move notation on their own.
function stepCaption(san) {
  if (san.includes('#')) return `${san} — וזה מט. מכאן המשחק נגמר.`;
  if (san.includes('x') && san.includes('+')) return `${san} — תפיסת כלי, ועם שח למלך.`;
  if (san.includes('x')) return `${san} — תפיסת כלי.`;
  if (san.includes('+')) return `${san} — שח למלך.`;
  return `${san} — ממשיכים בקו הזה.`;
}

export function PunishingLinePreview({ punishingLine, onPreviewFen, persona }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(-1); // -1 = position right after the mistake, before the punishment
  const [playing, setPlaying] = useState(false);
  const intervalRef = useRef(null);

  const total = punishingLine.fens.length;

  useEffect(() => {
    if (!open) return;
    onPreviewFen(step === -1 ? punishingLine.startFen : punishingLine.fens[step]);
  }, [open, step, punishingLine, onPreviewFen]);

  useEffect(() => {
    if (!playing) return;
    intervalRef.current = setInterval(() => {
      setStep((s) => {
        if (s + 1 >= total) {
          setPlaying(false);
          return s;
        }
        return s + 1;
      });
    }, 900);
    return () => clearInterval(intervalRef.current);
  }, [playing, total]);

  // Reset whenever a different mistake's continuation is shown, clearing any
  // board override left by the previous one.
  useEffect(() => {
    setOpen(false);
    setPlaying(false);
    setStep(-1);
    onPreviewFen(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [punishingLine]);

  // This component only exists while a mistake is being explained (its parent
  // stops rendering it as soon as the student retries/starts a new game/the
  // game ends) - if a preview was left open when that happens, nothing else
  // would ever clear the board override, permanently disabling the board.
  useEffect(() => {
    return () => onPreviewFen(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!punishingLine.sans.length) return null;

  const close = () => {
    setOpen(false);
    setPlaying(false);
    setStep(-1);
    onPreviewFen(null);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-sky-700 bg-sky-950/40 px-3 py-2 text-sm font-bold text-sky-300 transition hover:bg-sky-900/50"
      >
        {persona && <span className="text-base leading-none">{persona.avatar}</span>}
        🎬 {persona ? `${persona.name} מראה/ה לי מה יקרה` : 'הראה לי את ההמשך הצפוי על הלוח'}
      </button>
    );
  }

  const currentCaption = step === -1 ? null : stepCaption(punishingLine.sans[step]);

  return (
    <div className="space-y-2 rounded-lg border border-sky-700 bg-sky-950/30 p-3">
      <p className="flex items-center gap-1.5 text-sm font-bold text-sky-300">
        {persona && <span className="text-base leading-none">{persona.avatar}</span>}
        {persona ? `${persona.name} מראה/ה:` : 'ההמשך הצפוי:'}
      </p>
      <div className="flex flex-wrap gap-1 text-sm">
        {punishingLine.sans.map((san, i) => (
          <span key={i} className={`rounded px-1.5 py-0.5 font-mono ${i === step ? 'bg-sky-600 text-white' : 'text-slate-400'}`}>
            {san}
          </span>
        ))}
      </div>
      <p className="min-h-[1.5rem] text-sm text-slate-300">
        {currentCaption ?? 'זו העמדה מיד אחרי המהלך שלכם - לחצו "הבא" כדי לראות מה קורה.'}
      </p>
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => setStep((s) => Math.max(-1, s - 1))}
          disabled={step <= -1}
          className="min-h-11 rounded-md bg-slate-700 px-2 py-2 text-xs text-slate-200 disabled:opacity-30 sm:text-sm"
        >
          ⏮ הקודם
        </button>
        <button
          onClick={() => setPlaying((p) => !p)}
          className="min-h-11 rounded-md bg-sky-600 px-2 py-2 text-xs font-bold text-white sm:text-sm"
        >
          {playing ? '⏸ עצור' : '▶ הפעל'}
        </button>
        <button
          onClick={() => setStep((s) => Math.min(total - 1, s + 1))}
          disabled={step >= total - 1}
          className="min-h-11 rounded-md bg-slate-700 px-2 py-2 text-xs text-slate-200 disabled:opacity-30 sm:text-sm"
        >
          הבא ⏭
        </button>
      </div>
      <button
        onClick={close}
        className="min-h-11 w-full rounded-md border border-slate-600 px-2 py-2 text-xs text-slate-400 hover:bg-slate-800 sm:text-sm"
      >
        סגור תצוגה
      </button>
    </div>
  );
}
