export function PlayerColorSelector({ value, onChange, disabled }) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-300">
      <span className="whitespace-nowrap">שחקו בתור:</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-slate-100 disabled:opacity-50"
      >
        <option value="w">⚪ לבן</option>
        <option value="b">⚫ שחור</option>
      </select>
    </label>
  );
}
