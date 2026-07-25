const API_URL = process.env.LLM_API_URL || 'https://api.openai.com/v1/chat/completions';
const MODEL = process.env.LLM_MODEL || 'gpt-4o-mini';

export function hasApiKey() {
  return !!process.env.LLM_API_KEY;
}

function extractJson(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON found in response');
  return JSON.parse(match[0]);
}

export async function callChatApi(prompt, maxTokens = 700) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.LLM_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content ?? '';
  return extractJson(text);
}

export function buildMistakePrompt({
  fenBefore,
  badMoveSan,
  bestMoveSan,
  evalBeforeStr,
  evalAfterStr,
  moveNumber,
  continuationSans,
  moverColor,
}) {
  const continuationText = continuationSans?.length
    ? `רצף ההמשך שהמנוע רואה כענישה הצפויה של היריב (מהלך אחר מהלך, החל מתגובת היריב למהלך השגוי): ${continuationSans.join(', ')}.`
    : 'אין נתוני המשך זמינים.';
  const colorLabel = moverColor === 'b' ? 'שחור' : 'לבן';

  return `אתה מאמן שחמט מומחה ומעודד, שמסביר טעויות בעברית פשוטה וברורה לשחקן מתחיל-בינוני.

נתוני העמדה:
- מספר מהלך: ${moveNumber} (${colorLabel})
- מצב הלוח לפני המהלך (FEN): ${fenBefore}
- המהלך שהשחקן שיחק (וטעה בו): ${badMoveSan}
- המהלך הנכון/המומלץ במקום זאת: ${bestMoveSan}
- הערכת העמדה לפני המהלך: ${evalBeforeStr}
- הערכת העמדה אחרי המהלך השגוי: ${evalAfterStr}
- ${continuationText}

כתוב הסבר בשלושה חלקים, בעברית בלבד, בטון תומך ולא מבייש. השתמש בשמות המשבצות (כמו e4, Nf3) בלטינית בתוך הטקסט העברי.
בחלק הראשון חובה לפרט קונקרטית מה עלול לקרות בכמה המהלכים הבאים לפי רצף ההמשך שסופק - תאר את זה כסיפור קצר וברור ("אם תשחק X, היריב יכול לענות ב-Y, ואז...") ולא רק לתאר את המהלך הבודד עצמו.

החזר אך ורק אובייקט JSON תקין (ללא טקסט נוסף לפניו או אחריו) במבנה הבא:
{
  "mistake": "2-4 משפטים: מה קרה פיזית על הלוח כתוצאה מהמהלך השגוי, וכולל תיאור קונקרטי של ההמשך הצפוי (כמה מהלכים קדימה) ולאן זה מוביל",
  "strategy": "הסבר של 1-2 משפטים על העיקרון האסטרטגי שהופר (למשל בטיחות המלך, פיתוח כלים, שליטה במרכז, מבנה רגלים וכו')",
  "howToThink": "טיפ מעשי של 1-2 משפטים לאיך לחשוב במצבים דומים בעתיד"
}`;
}

export function localMistakeFallback({ badMoveSan, bestMoveSan, evalBeforeStr, evalAfterStr, continuationSans }) {
  const continuationText = continuationSans?.length
    ? ` המנוע צופה שהיריב ימשיך עם: ${continuationSans.join(', ')} - המשך שממחיש כמה העמדה שלך נעשתה קשה יותר.`
    : '';
  return {
    mistake: `המהלך ${badMoveSan} הרע את העמדה שלך באופן משמעותי — ההערכה ירדה מ-${evalBeforeStr} ל-${evalAfterStr}. המהלך המומלץ במקום היה ${bestMoveSan}.${continuationText}`,
    strategy:
      'ייתכן שהמהלך הזניח עיקרון אסטרטגי חשוב — כמו בטיחות המלך, שליטה במרכז, פיתוח כלים, או השארת כלי לא מוגן. כדאי לבדוק שוב את הלוח לפני שממשיכים.',
    howToThink:
      'לפני כל מהלך, שאל את עצמך: האם המהלך הזה חושף את המלך שלי? האם הוא משאיר כלי בסכנה? האם יש מהלך שמפתח כלי או שולט במרכז בצורה טובה יותר?',
    isFallback: true,
  };
}

export function buildWeaknessPrompt({ gamesAnalyzed, counts, avgCpLoss, byPhase }) {
  return `אתה מאמן שחמט שמנתח נתונים סטטיסטיים ממספר משחקים של תלמיד, כדי לזהות דפוסי חולשה חוזרים.

נתונים מצטברים מ-${gamesAnalyzed} משחקים (רק המהלכים של התלמיד):
- מהלכים מיטביים: ${counts.best}, טובים: ${counts.good}, לא מדויקים: ${counts.inaccuracy}, טעויות: ${counts.mistake}, טעויות חמורות: ${counts.blunder}
- אובדן מאיות ממוצע למהלך: ${Math.round(avgCpLoss)}
- טעויות (mistake+blunder) לפי שלב משחק: פתיחה=${byPhase.opening.count}, אמצע משחק=${byPhase.middlegame.count}, סיום=${byPhase.endgame.count}

כתוב בעברית 2-4 משפטי סיכום שמזהים את נקודת התורפה העיקרית (למשל: הרבה טעויות בסיום, או בעיקר בפתיחה, או אובדן חומר תדיר), ו-2-3 המלצות תרגול קונקרטיות וממוקדות.

החזר אך ורק אובייקט JSON תקין במבנה:
{
  "summary": "2-4 משפטי סיכום על דפוס החולשה העיקרי",
  "recommendations": ["המלצה 1", "המלצה 2", "המלצה 3"]
}`;
}

export function localWeaknessFallback({ counts, byPhase }) {
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
