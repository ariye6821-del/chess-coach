const TABS = [
  { key: 'coached', label: 'עם מאמן' },
  { key: 'free', label: 'משחק חופשי' },
  { key: 'import', label: 'ייבוא מ-Chess.com' },
];

export function ModeTabs({ active, onChange }) {
  return (
    <div className="mx-auto mb-6 flex w-full max-w-xl gap-1 rounded-lg border border-slate-700 bg-slate-900/80 p-1 sm:w-fit">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`min-h-11 flex-1 whitespace-nowrap rounded-md px-2 py-2 text-xs font-bold transition sm:flex-none sm:px-4 sm:text-sm ${
            active === tab.key ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
