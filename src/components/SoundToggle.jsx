import { useState } from 'react';
import { isSoundEnabled, setSoundEnabled } from '../lib/sounds';

export function SoundToggle() {
  const [enabled, setEnabled] = useState(isSoundEnabled);

  const toggle = () => {
    const next = !enabled;
    setSoundEnabled(next);
    setEnabled(next);
  };

  return (
    <button
      onClick={toggle}
      className="min-h-9 rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-xs font-bold text-slate-300 hover:bg-slate-700"
      title={enabled ? 'השתק צלילים' : 'הפעל צלילים'}
      aria-label={enabled ? 'השתק צלילים' : 'הפעל צלילים'}
      aria-pressed={enabled}
    >
      {enabled ? '🔊' : '🔇'}
    </button>
  );
}
