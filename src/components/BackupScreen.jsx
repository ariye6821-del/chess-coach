import { useRef, useState } from 'react';
import { downloadBackup, readBackupFile, restoreBackup } from '../lib/backup';

export function BackupScreen() {
  const fileInputRef = useRef(null);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [pendingBackup, setPendingBackup] = useState(null);

  const handleFileChosen = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);
    setMessage(null);
    try {
      const backup = await readBackupFile(file);
      setPendingBackup(backup);
    } catch (err) {
      setError(err.message);
    }
  };

  const confirmRestore = () => {
    try {
      const count = restoreBackup(pendingBackup);
      setMessage(`שוחזרו ${count} פריטי נתונים בהצלחה. טוענים מחדש...`);
      setPendingBackup(null);
      setTimeout(() => window.location.reload(), 1200);
    } catch (err) {
      setError(err.message);
      setPendingBackup(null);
    }
  };

  return (
    <div dir="rtl" className="mx-auto max-w-2xl space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold text-slate-100">💾 גיבוי ושחזור נתונים</h2>
        <p className="mt-1 text-sm text-slate-400">
          כל הנתונים שלכם (דירוג, חידות, הישגים, רצף ימים, תוכנית אימונים) נשמרים רק בדפדפן הזה. הורידו גיבוי לפני
          שמנקים את הדפדפן או עוברים מכשיר, ושחזרו אותו במכשיר החדש.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-sm ring-1 ring-white/5 p-4">
        <h3 className="mb-2 text-sm font-bold text-slate-300">⬇️ הורדת גיבוי</h3>
        <p className="mb-3 text-sm text-slate-400">מוריד קובץ JSON עם כל הנתונים שלכם באפליקציה.</p>
        <button
          onClick={downloadBackup}
          className="w-full rounded-lg bg-gradient-to-r from-sky-500 to-indigo-500 px-4 py-2 font-bold text-white transition hover:from-sky-400 hover:to-indigo-400"
        >
          הורידו קובץ גיבוי
        </button>
      </div>

      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-sm ring-1 ring-white/5 p-4">
        <h3 className="mb-2 text-sm font-bold text-slate-300">⬆️ שחזור מגיבוי</h3>
        <p className="mb-3 text-sm text-amber-400">
          ⚠️ שחזור יחליף את כל הנתונים הקיימים באפליקציה הזו בנתונים מהקובץ המגובה.
        </p>
        <input ref={fileInputRef} type="file" accept="application/json" onChange={handleFileChosen} className="hidden" />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full rounded-lg border border-slate-600 px-4 py-2 font-medium text-slate-300 transition hover:bg-slate-800"
        >
          בחרו קובץ גיבוי לשחזור
        </button>

        {pendingBackup && (
          <div className="mt-3 space-y-2 rounded-lg border border-amber-600 bg-amber-950/30 p-3 text-center">
            <p className="text-sm text-amber-300">בטוחים? הפעולה תחליף את כל הנתונים הנוכחיים.</p>
            <div className="flex gap-2">
              <button
                onClick={confirmRestore}
                className="flex-1 rounded-md bg-amber-600 px-3 py-2 text-sm font-bold text-white hover:bg-amber-500"
              >
                כן, שחזרו
              </button>
              <button
                onClick={() => setPendingBackup(null)}
                className="flex-1 rounded-md border border-slate-600 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
              >
                ביטול
              </button>
            </div>
          </div>
        )}

        {message && <p className="mt-3 text-sm text-emerald-400">{message}</p>}
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      </div>
    </div>
  );
}
