const GROUPS = [
  {
    label: 'שחקו',
    tabs: [
      { key: 'daily', label: '🗓️ חידת היום' },
      { key: 'coached', label: 'עם מאמן' },
      { key: 'free', label: 'משחק חופשי' },
      { key: 'friend', label: '🧑‍🤝‍🧑 מול חבר' },
      { key: 'online', label: '🌐 מקוון' },
    ],
  },
  {
    label: 'תרגלו',
    tabs: [
      { key: 'endgames', label: '🏁 סיומים' },
      { key: 'repertoire', label: '📖 אימון פתיחות' },
      { key: 'puzzles', label: '🧩 תרגילים' },
      { key: 'rush', label: '⚡ Puzzle Rush' },
      { key: 'analysis', label: '🔎 ניתוח עמדה' },
    ],
  },
  {
    label: 'התקדמות',
    tabs: [
      { key: 'rating', label: '📈 דירוג' },
      { key: 'achievements', label: '🎖️ הישגים' },
      { key: 'plan', label: '📋 תוכנית אימונים' },
      { key: 'import', label: 'ייבוא משחקים' },
      { key: 'backup', label: '💾 גיבוי' },
    ],
  },
];

export function ModeTabs({ active, onChange }) {
  return (
    <div className="mx-auto mb-6 w-full max-w-4xl space-y-2.5">
      {GROUPS.map((group) => (
        <div key={group.label} className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
          <p className="shrink-0 text-[11px] font-bold uppercase tracking-wider text-slate-500 sm:w-20 sm:text-left">
            {group.label}
          </p>
          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:pb-0">
            {group.tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => onChange(tab.key)}
                aria-current={active === tab.key ? 'page' : undefined}
                className={`min-h-10 shrink-0 whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-bold transition sm:text-sm ${
                  active === tab.key
                    ? 'bg-gradient-to-r from-sky-500 to-indigo-500 text-white shadow-md shadow-sky-900/30'
                    : 'border border-slate-700/80 bg-slate-900/50 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
