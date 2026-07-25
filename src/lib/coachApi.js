const FUNCTIONS_BASE = '/.netlify/functions';

async function callFunction(name, payload) {
  const response = await fetch(`${FUNCTIONS_BASE}/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`Function ${name} error: ${response.status}`);
  }
  return response.json();
}

function localMoveFallback({ badMoveSan, bestMoveSan, evalBeforeStr, evalAfterStr, continuationSans, classification }) {
  const isGood = classification === 'best' || classification === 'good';
  const isMinor = classification === 'inaccuracy';
  const continuationText = continuationSans?.length
    ? ` המנוע צופה שהיריב ימשיך עם: ${continuationSans.join(', ')} - המשך שממחיש כמה העמדה שלך נעשתה קשה יותר.`
    : '';

  if (isGood) {
    return {
      mistake: `המהלך ${badMoveSan} היה ${classification === 'best' ? 'מהלך מיטבי' : 'מהלך טוב'} — ההערכה נשארה יציבה או השתפרה (${evalBeforeStr} ← ${evalAfterStr}).`,
      strategy: 'המהלך שומר על עקרונות טובים - כמו התפתחות כלים, בטיחות המלך ושליטה במרכז הלוח.',
      howToThink: 'המשך לחפש מהלכים שמפתחים כלים, שולטים במרכז ושומרים על בטיחות המלך, בדיוק כמו במהלך הזה.',
      isFallback: true,
    };
  }
  if (isMinor) {
    return {
      mistake: `המהלך ${badMoveSan} לא היה מדויק לחלוטין — ההערכה ירדה במעט (${evalBeforeStr} ← ${evalAfterStr}).${
        bestMoveSan ? ` המהלך ${bestMoveSan} היה מדויק יותר.` : ''
      }`,
      strategy: 'לעיתים יש מהלך מעט טוב יותר שמנצל את העמדה בצורה חדה או בטוחה יותר.',
      howToThink: 'לפני שתחליט, בדוק גם מהלכים חדים או מדויקים יותר, לא רק את הראשון שעולה לך בראש.',
      isFallback: true,
    };
  }
  return {
    mistake: `המהלך ${badMoveSan} הרע את העמדה שלך באופן משמעותי — ההערכה ירדה מ-${evalBeforeStr} ל-${evalAfterStr}. המהלך המומלץ במקום היה ${bestMoveSan}.${continuationText}`,
    strategy:
      'ייתכן שהמהלך הזניח עיקרון אסטרטגי חשוב — כמו בטיחות המלך, שליטה במרכז, פיתוח כלים, או השארת כלי לא מוגן. כדאי לבדוק שוב את הלוח לפני שממשיכים.',
    howToThink:
      'לפני כל מהלך, שאל את עצמך: האם המהלך הזה חושף את המלך שלי? האם הוא משאיר כלי בסכנה? האם יש מהלך שמפתח כלי או שולט במרכז בצורה טובה יותר?',
    isFallback: true,
  };
}

function localWeaknessFallback({ counts, byPhase }) {
  const worstPhase = Object.entries(byPhase).sort((a, b) => b[1].count - a[1].count)[0];
  const phaseNames = { opening: 'בפתיחה', middlegame: 'באמצע המשחק', endgame: 'בסיום' };
  return {
    summary: `סה"כ נספרו ${counts.mistake + counts.blunder} טעויות משמעותיות, כאשר הריכוז הגבוה ביותר הוא ${phaseNames[worstPhase[0]]}. כדאי להתמקד בשלב הזה בתרגול הבא.`,
    recommendations: [
      'תרגלו פתרון תרגילי טקטיקה יומיים כדי לצמצם טעויות חומר.',
      `הקדישו זמן ללימוד עקרונות ${phaseNames[worstPhase[0]]} באופן ממוקד.`,
      'לאחר כל משחק, עברו על 2-3 המהלכים המסומנים כטעות וחשבו מה הייתם עושים אחרת.',
    ],
    isFallback: true,
  };
}

/**
 * Requests a 3-part Hebrew explanation for a detected mistake. The actual LLM call
 * (and its API key) lives server-side in netlify/functions/analyzeMove.js - this
 * client only ever talks to our own Netlify Function. Falls back to a local
 * template-based explanation only if that function itself can't be reached
 * (e.g. offline), so the app stays usable without a network round-trip.
 */
export async function getCoachExplanation(params) {
  try {
    return await callFunction('analyzeMove', params);
  } catch (err) {
    console.error('analyzeMove request failed, using local fallback:', err);
    return localMoveFallback(params);
  }
}

/**
 * Requests a Hebrew weakness-profile summary for aggregated multi-game stats.
 * See netlify/functions/weaknessSummary.js for the server-side LLM call.
 */
export async function getWeaknessSummary(stats) {
  try {
    return await callFunction('weaknessSummary', stats);
  } catch (err) {
    console.error('weaknessSummary request failed, using local fallback:', err);
    return localWeaknessFallback(stats);
  }
}
