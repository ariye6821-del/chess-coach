import { PunishingLinePreview } from './PunishingLinePreview';
import { ExplanationBlock } from './ExplanationBlock';

export function CoachExplanationBox({
  headerText = '⚠️ נראה שזו הייתה טעות',
  badMoveSan,
  bestMoveSan,
  punishingLine,
  loadingExplanation,
  explanation,
  onPreviewFen,
}) {
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-amber-600/50 bg-amber-950/40 p-3">
        <p className="text-sm font-bold text-amber-400">{headerText}</p>
        <p className="mt-1 text-sm text-slate-300">
          שיחקת <span className="font-mono font-bold text-amber-300">{badMoveSan}</span>, וזה הרע את העמדה.
        </p>
        {bestMoveSan && (
          <p className="mt-1 text-sm text-slate-400">
            המהלך המומלץ היה: <span className="font-mono font-bold text-emerald-400">{bestMoveSan}</span>
          </p>
        )}
      </div>

      {punishingLine && <PunishingLinePreview punishingLine={punishingLine} onPreviewFen={onPreviewFen} />}

      {loadingExplanation && (
        <div className="flex items-center gap-2 rounded-lg bg-slate-800 p-3 text-sm text-slate-400">
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-500 border-t-transparent" />
          המאמן מכין הסבר...
        </div>
      )}

      {explanation && (
        <>
          <ExplanationBlock title="1. מה קרה על הלוח (ולאן זה מוביל)" text={explanation.mistake} accent="text-amber-400" />
          <ExplanationBlock title="2. העיקרון האסטרטגי" text={explanation.strategy} accent="text-sky-400" />
          <ExplanationBlock title="3. איך לחשוב להבא" text={explanation.howToThink} accent="text-emerald-400" />
          {explanation.isFallback && (
            <p className="text-center text-xs text-slate-500">
              (הסבר מקומי בסיסי - הגדר מפתח API לקבלת הסברים מותאמים אישית)
            </p>
          )}
        </>
      )}
    </div>
  );
}
