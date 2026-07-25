const TABS = [
  { key: 'coached', label: 'עם מאמן' },
  { key: 'free', label: 'משחק חופשי' },
  { key: 'import', label: 'ייבוא מ-Chess.com' },
];

export function ModeTabs({ active, onChange }) {
  return (
    <div className="mx-auto mb-6 flex w-fit gap-1 rounded-lg border border-slate-700 bg-slate-900/80 p-1">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`rounded-md px-4 py-1.5 text-sm font-bold transition ${
            active === tab.key ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
