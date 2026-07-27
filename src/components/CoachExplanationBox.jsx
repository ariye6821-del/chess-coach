import { PunishingLinePreview } from './PunishingLinePreview';
import { ExplanationBlock } from './ExplanationBlock';

const INTRO_STYLES = {
  best: { box: 'border-emerald-600/50 bg-emerald-950/40', text: 'text-emerald-400' },
  good: { box: 'border-teal-600/50 bg-teal-950/40', text: 'text-teal-400' },
  inaccuracy: { box: 'border-yellow-600/50 bg-yellow-950/40', text: 'text-yellow-400' },
  mistake: { box: 'border-orange-600/50 bg-orange-950/40', text: 'text-orange-400' },
  blunder: { box: 'border-amber-600/50 bg-amber-950/40', text: 'text-amber-400' },
};

const INTRO_SUFFIX_BY_CLASS = {
  best: '',
  good: '',
  inaccuracy: ', שיכל להיות מדויק יותר',
  mistake: ', וזה הרע את העמדה',
  blunder: ', וזה הרע את העמדה באופן משמעותי',
};

export function CoachExplanationBox({
  headerText = '⚠️ נראה שזו הייתה טעות',
  classification = 'mistake',
  badMoveSan,
  bestMoveSan,
  punishingLine,
  loadingExplanation,
  explanation,
  onPreviewFen,
  persona,
}) {
  const style = INTRO_STYLES[classification] || INTRO_STYLES.mistake;
  const isBad = classification === 'mistake' || classification === 'blunder';

  return (
    <div className="space-y-3">
      <div className={`rounded-lg border p-3 ${style.box}`}>
        <p className={`text-sm font-bold ${style.text}`}>{headerText}</p>
        <p className="mt-1 text-sm text-slate-300">
          שיחקת <span className={`font-mono font-bold ${style.text}`}>{badMoveSan}</span>
          {INTRO_SUFFIX_BY_CLASS[classification] ?? ''}.
        </p>
        {bestMoveSan && isBad && (
          <p className="mt-1 text-sm text-slate-400">
            המהלך המומלץ היה: <span className="font-mono font-bold text-emerald-400">{bestMoveSan}</span>
          </p>
        )}
      </div>

      {punishingLine && <PunishingLinePreview punishingLine={punishingLine} onPreviewFen={onPreviewFen} persona={persona} />}

      {loadingExplanation && (
        <div className="flex items-center gap-2 rounded-lg bg-slate-800 p-3 text-sm text-slate-400">
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-500 border-t-transparent" />
          המאמן מכין הסבר...
        </div>
      )}

      {explanation && (
        <>
          <ExplanationBlock title="1. מה קרה על הלוח" text={explanation.mistake} accent="text-amber-400" />
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
