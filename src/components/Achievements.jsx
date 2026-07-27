import { useEffect, useState } from 'react';
import { getAchievementsStatus } from '../lib/achievements';

export function Achievements() {
  const [achievements, setAchievements] = useState([]);

  useEffect(() => {
    setAchievements(getAchievementsStatus());
  }, []);

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <div dir="rtl" className="mx-auto max-w-3xl space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold text-slate-100">🎖️ הישגים</h2>
        <p className="mt-1 text-sm text-slate-400">
          {unlockedCount} מתוך {achievements.length} הישגים הושגו
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {achievements.map((a) => (
          <div
            key={a.id}
            className={`flex items-start gap-3 rounded-xl border p-4 shadow-lg transition ${
              a.unlocked ? 'border-amber-600/60 bg-amber-950/30' : 'border-slate-700 bg-slate-900/60'
            }`}
          >
            <span className={`text-3xl ${a.unlocked ? '' : 'opacity-30 grayscale'}`}>{a.icon}</span>
            <div>
              <p className={`font-bold ${a.unlocked ? 'text-amber-300' : 'text-slate-400'}`}>
                {a.name} {a.unlocked && <span className="mr-1 text-xs text-emerald-400">✓ הושג</span>}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">{a.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
