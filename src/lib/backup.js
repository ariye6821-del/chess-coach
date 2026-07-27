const PREFIX = 'chess-coach-';

/** Snapshots every localStorage key this app owns (and only those) into a plain object. */
export function collectBackupData() {
  const data = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(PREFIX)) {
      data[key] = localStorage.getItem(key);
    }
  }
  return {
    app: 'chess-coach',
    version: 1,
    exportedAt: new Date().toISOString(),
    data,
  };
}

export function downloadBackup() {
  const backup = collectBackupData();
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `chess-coach-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function readBackupFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(JSON.parse(reader.result));
      } catch {
        reject(new Error('הקובץ אינו JSON תקין.'));
      }
    };
    reader.onerror = () => reject(new Error('שגיאה בקריאת הקובץ.'));
    reader.readAsText(file);
  });
}

/** Restores a previously exported backup, overwriting current data. Never writes outside our own key namespace, even if the file was tampered with. */
export function restoreBackup(backupObject) {
  if (!backupObject || backupObject.app !== 'chess-coach' || typeof backupObject.data !== 'object' || !backupObject.data) {
    throw new Error('קובץ הגיבוי אינו בפורמט המצופה.');
  }
  let restoredCount = 0;
  for (const [key, value] of Object.entries(backupObject.data)) {
    if (!key.startsWith(PREFIX)) continue;
    localStorage.setItem(key, value);
    restoredCount++;
  }
  if (!restoredCount) throw new Error('לא נמצאו נתונים לשחזור בקובץ הזה.');
  return restoredCount;
}
