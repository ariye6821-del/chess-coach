const PRESETS = [
  { key: 'none', label: 'ללא הגבלת זמן', initialMs: null },
  { key: 'bullet3', label: 'בליץ 3 דקות', initialMs: 3 * 60 * 1000 },
  { key: 'blitz5', label: 'בליץ 5 דקות', initialMs: 5 * 60 * 1000 },
  { key: 'rapid10', label: 'רפיד 10 דקות', initialMs: 10 * 60 * 1000 },
];

export function TimeControlSelector({ value, onChange, disabled }) {
  const current = PRESETS.find((p) => p.initialMs === value?.initialMs) ?? PRESETS[0];
  return (
    <label className="flex items-center gap-2 text-sm text-slate-300">
      <span className="whitespace-nowrap">שעון:</span>
      <select
        value={current.key}
        disabled={disabled}
        onChange={(e) => {
          const preset = PRESETS.find((p) => p.key === e.target.value);
          onChange(preset.initialMs == null ? null : { initialMs: preset.initialMs });
        }}
        className="rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-slate-100 disabled:opacity-50"
      >
        {PRESETS.map((p) => (
          <option key={p.key} value={p.key}>
            {p.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function formatClock(ms) {
  if (ms == null) return null;
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
