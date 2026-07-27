import { useState } from 'react';
import { Chessboard } from 'react-chessboard';
import { MOVE_CLASSES } from '../lib/gameAnalysis';
import { useBoardTheme } from '../hooks/useBoardTheme';

const PHASE_LABELS = { opening: 'פתיחה', middlegame: 'אמצע משחק', endgame: 'סיום' };
const MAX_EXAMPLE_SLIDES = 3;

function TitleSlide({ gamesAnalyzed, avgCpLoss, counts }) {
  const totalMistakes = counts.mistake + counts.blunder;
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
      <span className="text-5xl">🎓</span>
      <h3 className="text-2xl font-extrabold text-slate-100">מצגת: ניתוח דפוסי הטעויות שלך</h3>
      <p className="max-w-md text-slate-400">
        סקרנו {gamesAnalyzed} מהמשחקים האחרונים שלך מ-Chess.com, ומצאנו {totalMistakes} טעויות משמעותיות שכדאי ללמוד
        מהן.
      </p>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        {Object.values(MOVE_CLASSES).map((cls) => (
          <span key={cls.key} className={`rounded-full px-3 py-1 text-xs font-bold ${cls.badge}`}>
            {cls.label}: {counts[cls.key]}
          </span>
        ))}
      </div>
      <p className="text-sm text-slate-500">אובדן מאיות ממוצע למהלך: {Math.round(avgCpLoss)}</p>
    </div>
  );
}

function PhaseSlide({ byPhase, counts }) {
  const totalMistakes = Math.max(1, counts.mistake + counts.blunder);
  const worstPhase = Object.entries(byPhase).sort((a, b) => b[1].count - a[1].count)[0];
  return (
    <div className="flex h-full flex-col justify-center gap-5">
      <h3 className="text-center text-xl font-bold text-slate-100">איפה קורות רוב הטעויות?</h3>
      <div className="space-y-3">
        {Object.entries(byPhase).map(([phase, data]) => (
          <div key={phase} className="flex items-center gap-3">
            <span className="w-24 text-sm text-slate-400">{PHASE_LABELS[phase]}</span>
            <div className="h-4 flex-1 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full bg-orange-500"
                style={{ width: `${Math.min(100, (data.count / totalMistakes) * 100)}%` }}
              />
            </div>
            <span className="w-10 text-left text-sm text-slate-400">{data.count}</span>
          </div>
        ))}
      </div>
      {worstPhase && worstPhase[1].count > 0 && (
        <p className="text-center text-sm text-slate-400">
          הריכוז הגבוה ביותר של טעויות הוא ב<span className="font-bold text-orange-400">{PHASE_LABELS[worstPhase[0]]}</span> -
          כדאי להתמקד שם באימון הבא.
        </p>
      )}
    </div>
  );
}

function PatternSlide({ llmSummary }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
      <span className="text-4xl">🔍</span>
      <h3 className="text-xl font-bold text-slate-100">הדפוס העיקרי שזוהה</h3>
      <p className="max-w-lg text-lg leading-relaxed text-slate-200">{llmSummary.summary}</p>
      {llmSummary.isFallback && (
        <p className="text-xs text-slate-500">(הסבר מקומי בסיסי - הגדר מפתח API לקבלת ניתוח מותאם אישית)</p>
      )}
    </div>
  );
}

function ExampleSlide({ mistake, index, total, theme }) {
  const classInfo = MOVE_CLASSES[mistake.classification] || MOVE_CLASSES.mistake;
  const boardOrientation = mistake.mover === 'b' ? 'black' : 'white';
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3">
      <h3 className="text-center text-lg font-bold text-slate-100">
        דוגמה {index + 1} מתוך {total} מהמשחקים שלך
      </h3>
      <div className="w-full max-w-[260px]" dir="ltr">
        <Chessboard
          options={{
            position: mistake.fenBefore,
            allowDragging: false,
            boardOrientation,
            showAnimations: false,
            darkSquareStyle: { backgroundColor: theme.dark },
            lightSquareStyle: { backgroundColor: theme.light },
          }}
        />
      </div>
      <div className="text-center text-sm">
        <p className={`font-bold ${classInfo.color}`}>
          מהלך {mistake.moveNumber} ({mistake.phase}) · {classInfo.label}
        </p>
        <p className="mt-1 text-slate-300">
          שיחקת <span className="font-mono font-bold text-red-400">{mistake.san}</span>
          {mistake.bestMoveSan && (
            <>
              {' '}
              במקום <span className="font-mono font-bold text-emerald-400">{mistake.bestMoveSan}</span>
            </>
          )}
        </p>
        <p className="mt-1 text-xs text-slate-500">אובדן: {Math.round(mistake.cpLoss)} מאיות · {mistake.gameTitle}</p>
      </div>
    </div>
  );
}

function RecommendationsSlide({ llmSummary }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
      <span className="text-4xl">✅</span>
      <h3 className="text-xl font-bold text-slate-100">איך להימנע מזה בפעם הבאה</h3>
      <ul className="w-full max-w-md space-y-2 text-right">
        {llmSummary.recommendations.map((rec, i) => (
          <li key={i} className="rounded-lg bg-slate-800/80 px-4 py-3 text-sm text-slate-200">
            <span className="ml-2 font-bold text-emerald-400">{i + 1}.</span>
            {rec}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function WeaknessProfile({ profile, onClose }) {
  const { counts, byPhase, avgCpLoss, gamesAnalyzed, llmSummary, topMistakes = [] } = profile;
  const [theme] = useBoardTheme();
  const [slideIndex, setSlideIndex] = useState(0);

  const examples = topMistakes.filter((m) => m.fenBefore).slice(0, MAX_EXAMPLE_SLIDES);

  const slides = [
    { key: 'title', render: () => <TitleSlide gamesAnalyzed={gamesAnalyzed} avgCpLoss={avgCpLoss} counts={counts} /> },
    { key: 'phase', render: () => <PhaseSlide byPhase={byPhase} counts={counts} /> },
    { key: 'pattern', render: () => <PatternSlide llmSummary={llmSummary} /> },
    ...examples.map((mistake, i) => ({
      key: `example-${i}`,
      render: () => <ExampleSlide mistake={mistake} index={i} total={examples.length} theme={theme} />,
    })),
    { key: 'recommendations', render: () => <RecommendationsSlide llmSummary={llmSummary} /> },
  ];

  const total = slides.length;
  const goTo = (i) => setSlideIndex(Math.max(0, Math.min(total - 1, i)));

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-100">🎬 מצגת ניתוח הטעויות</h2>
        <button
          onClick={onClose}
          className="min-h-11 rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
        >
          חזרה
        </button>
      </div>

      <div className="min-h-[420px] rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-sm ring-1 ring-white/5 p-6">{slides[slideIndex].render()}</div>

      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => goTo(slideIndex - 1)}
          disabled={slideIndex === 0}
          className="min-h-11 rounded-md bg-slate-700 px-4 py-2 text-sm font-bold text-slate-200 disabled:opacity-30"
        >
          ◀ הקודם
        </button>

        <div className="flex items-center gap-1.5">
          {slides.map((s, i) => (
            <button
              key={s.key}
              onClick={() => goTo(i)}
              aria-label={`שקופית ${i + 1}`}
              className={`h-2.5 w-2.5 rounded-full transition ${i === slideIndex ? 'bg-sky-500' : 'bg-slate-700 hover:bg-slate-600'}`}
            />
          ))}
        </div>

        <button
          onClick={() => goTo(slideIndex + 1)}
          disabled={slideIndex === total - 1}
          className="min-h-11 rounded-md bg-gradient-to-r from-sky-500 to-indigo-500 px-4 py-2 text-sm font-bold text-white disabled:opacity-30"
        >
          הבא ▶
        </button>
      </div>
      <p className="text-center text-xs text-slate-500">
        שקופית {slideIndex + 1} מתוך {total}
      </p>
    </div>
  );
}
