import { ELO_PRESETS } from '../lib/difficulty';

export function DifficultySelector({ value, onChange, disabled }) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-300">
      <span className="whitespace-nowrap">רמת קושי:</span>
      <select
        value={value === null ? 'max' : String(value)}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value === 'max' ? null : Number(e.target.value))}
        className="rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-slate-100 disabled:opacity-50"
      >
        {ELO_PRESETS.map((preset) => (
          <option key={preset.label} value={preset.elo === null ? 'max' : preset.elo}>
            {preset.label}
          </option>
        ))}
      </select>
    </label>
  );
}
