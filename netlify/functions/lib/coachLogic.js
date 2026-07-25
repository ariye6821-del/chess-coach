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

const CLASSIFICATION_LABELS = {
  best: 'מהלך מיטבי',
  good: 'מהלך טוב',
  inaccuracy: 'לא מדויק',
  mistake: 'טעות',
  blunder: 'טעות חמורה',
};

/**
 * Builds a prompt asking the coach to comment on a single move, in a tone that
 * matches how good or bad the move actually was - a full "what went wrong and
 * what happens next" breakdown for mistakes/blunders, gentle guidance for
 * inaccuracies, and positive reinforcement for good/best moves.
 */
export function buildMovePrompt({
  fenBefore,
  san,
  bestMoveSan,
  evalBeforeStr,
  evalAfterStr,
  moveNumber,
  continuationSans,
  moverColor,
  classification,
}) {
  const colorLabel = moverColor === 'b' ? 'שחור' : 'לבן';
  const isBad = classification === 'mistake' || classification === 'blunder';
  const isMinor = classification === 'inaccuracy';
  const classificationLabel = CLASSIFICATION_LABELS[classification] || 'מהלך';

  const continuationText = continuationSans?.length
    ? `רצף ההמשך שהמנוע רואה כענישה הצפויה של היריב (מהלך אחר מהלך, החל מתגובת היריב למהלך): ${continuationSans.join(', ')}.`
    : null;

  const toneInstruction = isBad
    ? 'המהלך הזה היה טעות משמעותית. הסבר בבירור, אך בטון תומך ולא מבייש, מה השתבש ולאן זה מוביל.'
    : isMinor
      ? 'המהלך הזה לא היה מדויק לגמרי, אך לא חמור. הסבר בעדינות מה אפשר היה לשפר.'
      : 'המהלך הזה היה טוב או מיטבי. חזק את השחקן בחיוב והסבר בקצרה מה עשה נכון ולמה.';

  return `אתה מאמן שחמט מומחה ומעודד, שנותן פרשנות קצרה בעברית פשוטה על כל מהלך במשחק של שחקן מתחיל-בינוני - לא רק על טעויות.

נתוני המהלך:
- מספר מהלך: ${moveNumber} (${colorLabel})
- מצב הלוח לפני המהלך (FEN): ${fenBefore}
- המהלך ששוחק בפועל: ${san}
- סיווג המהלך על ידי מנוע השחמט: ${classificationLabel}
${bestMoveSan && bestMoveSan !== san ? `- המהלך המומלץ במקום היה: ${bestMoveSan}` : '- זהו היה המהלך הטוב ביותר (או קרוב לכך) בעמדה'}
- הערכת העמדה לפני המהלך: ${evalBeforeStr}
- הערכת העמדה אחרי המהלך: ${evalAfterStr}
${continuationText ? `- ${continuationText}` : ''}

${toneInstruction} כתוב בעברית בלבד, בשלושה חלקים קצרים. השתמש בשמות משבצות (כמו e4, Nf3) בלטינית בתוך הטקסט העברי.
${isBad ? 'בחלק הראשון חובה לפרט קונקרטית מה עלול לקרות בהמשך לפי רצף ההמשך שסופק - תאר זאת כסיפור קצר וברור.' : ''}

החזר אך ורק אובייקט JSON תקין (ללא טקסט נוסף לפניו או אחריו) במבנה הבא:
{
  "mistake": "2-3 משפטים: מה קרה פיזית על הלוח כתוצאה מהמהלך (בין אם טוב או רע)${isBad ? ', כולל תיאור קונקרטי של ההמשך הצפוי ולאן זה מוביל' : ', ומה זה משיג עבור השחקן'}",
  "strategy": "1-2 משפטים על העיקרון האסטרטגי הקשור למהלך (למשל בטיחות המלך, פיתוח כלים, שליטה במרכז, מבנה רגלים וכו')",
  "howToThink": "טיפ מעשי של 1-2 משפטים לאיך לחשוב במצבים דומים בעתיד"
}`;
}

export function localMoveFallback({ san, bestMoveSan, evalBeforeStr, evalAfterStr, continuationSans, classification }) {
  const isGood = classification === 'best' || classification === 'good';
  const isMinor = classification === 'inaccuracy';
  const continuationText = continuationSans?.length
    ? ` המנוע צופה שהיריב ימשיך עם: ${continuationSans.join(', ')} - המשך שממחיש כמה העמדה נעשתה קשה יותר.`
    : '';

  if (isGood) {
    return {
      mistake: `המהלך ${san} היה ${classification === 'best' ? 'מהלך מיטבי' : 'מהלך טוב'} — ההערכה נשארה יציבה או השתפרה (${evalBeforeStr} ← ${evalAfterStr}).`,
      strategy: 'המהלך שומר על עקרונות טובים - כמו התפתחות כלים, בטיחות המלך ושליטה במרכז הלוח.',
      howToThink: 'המשך לחפש מהלכים שמפתחים כלים, שולטים במרכז ושומרים על בטיחות המלך, בדיוק כמו במהלך הזה.',
      isFallback: true,
    };
  }
  if (isMinor) {
    return {
      mistake: `המהלך ${san} לא היה מדויק לחלוטין — ההערכה ירדה במעט (${evalBeforeStr} ← ${evalAfterStr}).${
        bestMoveSan ? ` המהלך ${bestMoveSan} היה מדויק יותר.` : ''
      }`,
      strategy: 'לעיתים יש מהלך מעט טוב יותר שמנצל את העמדה בצורה חדה או בטוחה יותר.',
      howToThink: 'לפני שתחליט, בדוק גם מהלכים חדים או מדויקים יותר, לא רק את הראשון שעולה לך בראש.',
      isFallback: true,
    };
  }
  return {
    mistake: `המהלך ${san} הרע את העמדה שלך באופן משמעותי — ההערכה ירדה מ-${evalBeforeStr} ל-${evalAfterStr}. המהלך המומלץ במקום היה ${bestMoveSan}.${continuationText}`,
    strategy:
      'ייתכן שהמהלך הזניח עיקרון אסטרטגי חשוב — כמו בטיחות המלך, שליטה במרכז, פיתוח כלים, או השארת כלי לא מוגן. כדאי לבדוק שוב את הלוח לפני שממשיכים.',
    howToThink:
      'לפני כל מהלך, שאל את עצמך: האם המהלך הזה חושף את המלך שלי? האם הוא משאיר כלי בסכנה? האם יש מהלך שמפתח כלי או שולט במרכז בצורה טובה יותר?',
    isFallback: true,
  };
}

export function buildWeaknessPrompt({ gamesAnalyzed, counts, avgCpLoss, byPhase, sampleMistakes }) {
  const samplesText = sampleMistakes?.length
    ? `\n\nדוגמאות קונקרטיות לטעויות מתוך המשחקים (מהלך, סיווג, שלב במשחק, ומהלך מומלץ שהוחמץ):\n${sampleMistakes
        .map(
          (m) =>
            `- מהלך ${m.moveNumber} (${m.phase}): שיחק ${m.san} (${CLASSIFICATION_LABELS[m.classification] || m.classification}, אובדן ${Math.round(m.cpLoss)} מאיות)${m.bestMoveSan ? `, במקום ${m.bestMoveSan}` : ''}`
        )
        .join('\n')}`
    : '';

  return `אתה מאמן שחמט שמנתח נתונים ממספר משחקים של תלמיד, כדי לזהות דפוס חולשה חוזר וממשי - לא רק סטטיסטיקה יבשה.

נתונים מצטברים מ-${gamesAnalyzed} משחקים (רק המהלכים של התלמיד):
- מהלכים מיטביים: ${counts.best}, טובים: ${counts.good}, לא מדויקים: ${counts.inaccuracy}, טעויות: ${counts.mistake}, טעויות חמורות: ${counts.blunder}
- אובדן מאיות ממוצע למהלך: ${Math.round(avgCpLoss)}
- טעויות (mistake+blunder) לפי שלב משחק: פתיחה=${byPhase.opening.count}, אמצע משחק=${byPhase.middlegame.count}, סיום=${byPhase.endgame.count}${samplesText}

בהתבסס על הדוגמאות הקונקרטיות למעלה (אם סופקו), נסה לזהות דפוס חוזר וממשי - למשל: השארת כלים לא מוגנים, חולשה בבטיחות המלך, טעויות בזמן לחץ בסיום, החמצת מהלכים טקטיים חדים, פיתוח איטי מדי בפתיחה וכו'. אל תסתפק בלחזור על המספרים - תן אבחנה איכותית.

כתוב בעברית 2-4 משפטי סיכום שמזהים את נקודת התורפה העיקרית והממשית, ו-2-3 המלצות תרגול קונקרטיות וממוקדות בהתאם.

החזר אך ורק אובייקט JSON תקין במבנה:
{
  "summary": "2-4 משפטי סיכום על דפוס החולשה העיקרי, מבוסס על הדוגמאות בפועל",
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
