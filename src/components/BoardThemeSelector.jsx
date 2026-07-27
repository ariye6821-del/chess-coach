import { useEffect, useRef, useState } from 'react';
import { useBoardTheme } from '../hooks/useBoardTheme';
import { BOARD_THEME_PRESETS } from '../lib/boardTheme';

export function BoardThemeSelector() {
  const [theme, setTheme] = useBoardTheme();
  const [open, setOpen] = useState(false);
  const popoverRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  const selectPreset = (preset) => setTheme(preset);
  const setCustomColor = (key, value) => setTheme({ ...theme, id: 'custom', name: 'מותאם אישית', [key]: value });

  return (
    <div ref={popoverRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-9 items-center gap-1.5 rounded-md border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-slate-700"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="בחירת צבעי לוח"
      >
        <span
          className="inline-block h-3.5 w-3.5 rounded-sm border border-slate-500"
          style={{
            background: `linear-gradient(135deg, ${theme.light} 50%, ${theme.dark} 50%)`,
          }}
        />
        <span className="hidden sm:inline">צבעי לוח</span>
      </button>

      {open && (
        <div className="absolute left-0 z-30 mt-2 w-64 rounded-xl border border-slate-700 bg-slate-900 p-3 shadow-xl">
          <p className="mb-2 text-xs font-bold text-slate-400">ערכות מוכנות</p>
          <div className="grid grid-cols-3 gap-2">
            {BOARD_THEME_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => selectPreset(preset)}
                className={`flex flex-col items-center gap-1 rounded-md border p-1.5 text-[10px] text-slate-300 hover:bg-slate-800 ${
                  theme.id === preset.id ? 'border-sky-500 bg-slate-800' : 'border-slate-700'
                }`}
              >
                <span className="flex h-6 w-full overflow-hidden rounded">
                  <span className="w-1/2" style={{ backgroundColor: preset.light }} />
                  <span className="w-1/2" style={{ backgroundColor: preset.dark }} />
                </span>
                {preset.name}
              </button>
            ))}
          </div>

          <p className="mb-2 mt-3 text-xs font-bold text-slate-400">התאמה אישית</p>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-xs text-slate-300">
              ריבוע בהיר
              <input
                type="color"
                value={theme.light}
                onChange={(e) => setCustomColor('light', e.target.value)}
                className="h-7 w-9 cursor-pointer rounded border border-slate-600 bg-transparent"
              />
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-300">
              ריבוע כהה
              <input
                type="color"
                value={theme.dark}
                onChange={(e) => setCustomColor('dark', e.target.value)}
                className="h-7 w-9 cursor-pointer rounded border border-slate-600 bg-transparent"
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
