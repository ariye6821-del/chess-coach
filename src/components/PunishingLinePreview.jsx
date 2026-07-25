import { useEffect, useRef, useState } from 'react';

export function PunishingLinePreview({ punishingLine, onPreviewFen }) {
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
        className="w-full rounded-lg border border-sky-700 bg-sky-950/40 px-3 py-2 text-sm font-bold text-sky-300 transition hover:bg-sky-900/50"
      >
        🎬 הראה לי מה היה קורה על הלוח
      </button>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border border-sky-700 bg-sky-950/30 p-3">
      <p className="text-sm font-bold text-sky-300">ההמשך הצפוי:</p>
      <div className="flex flex-wrap gap-1 text-sm">
        {punishingLine.sans.map((san, i) => (
          <span key={i} className={`rounded px-1.5 py-0.5 font-mono ${i === step ? 'bg-sky-600 text-white' : 'text-slate-400'}`}>
            {san}
          </span>
        ))}
      </div>
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={() => setStep((s) => Math.max(-1, s - 1))}
          disabled={step <= -1}
          className="rounded-md bg-slate-700 px-2 py-1 text-xs text-slate-200 disabled:opacity-30"
        >
          ⏮ הקודם
        </button>
        <button onClick={() => setPlaying((p) => !p)} className="rounded-md bg-sky-600 px-3 py-1 text-xs font-bold text-white">
          {playing ? '⏸ עצור' : '▶ הפעל'}
        </button>
        <button
          onClick={() => setStep((s) => Math.min(total - 1, s + 1))}
          disabled={step >= total - 1}
          className="rounded-md bg-slate-700 px-2 py-1 text-xs text-slate-200 disabled:opacity-30"
        >
          הבא ⏭
        </button>
      </div>
      <button onClick={close} className="w-full rounded-md border border-slate-600 px-2 py-1 text-xs text-slate-400 hover:bg-slate-800">
        סגור תצוגה
      </button>
    </div>
  );
}
