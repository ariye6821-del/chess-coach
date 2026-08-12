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

// Applied across every prompt below - regardless of skill tier, the coach
// should read like a real person talking, not a textbook or a lecture, and
// every point made should be about what's actually happening on the board in
// front of the student, never a generic "wisdom" line that could apply to any
// game.
const CONVERSATIONAL_TONE_RULE =
  'דבר כמו בן אדם רגיל בשיחה טבעית - לא כמו פרופסור, לא כמו ספר לימוד, ולא במשפטים מנופחים או "חכמים" באופן כללי. אל תשתמש בקלישאות שחמט גנריות ("בשחמט חשוב תמיד...", "כל שחקן טוב יודע ש..."). כל דבר שאתה אומר צריך להתייחס קונקרטית למה שבאמת קרה בעמדה הזו או במהלך הזה - לא למשפט חוכמה שיכול להתאים לכל משחק.';

// Applied across every prompt below, on top of CONVERSATIONAL_TONE_RULE - these
// are hard constraints meant to stop the three failure modes that make an LLM
// chess coach feel useless: generic slogans, vague hand-waving about "the board"
// instead of naming actual pieces/squares, and repeating the same sentence when
// pushed with a follow-up "why". Rule 3 is conditional on a concrete engine line
// actually being supplied by the caller (see buildChatPrompt/buildMovePrompt).
const UNIVERSAL_IRON_RULES = `חוקי ברזל שחובה עליך לשמור עליהם תמיד, בכל תשובה, בלי יוצא מן הכלל:
1. לעולם אל תשתמש בסיסמאות או במשפטים מעגליים (למשל: "זה מהלך רע כי הוא מונע פיתוח") - כל טענה חייבת להיות מגובה בעובדה קונקרטית מהעמדה הנוכחית, לא בכלל אצבע כללי.
2. חובה לנתח את הלוח בצורה קונקרטית: ציין תמיד שמות כלים אמיתיים וקואורדינטות (משבצות) מדויקות - ישירות מתוך ה-FEN/העמדה שסופקה לך למטה (למשל "הפרש שלך ב-e4", "המלכה השחורה ב-c7"). אסור להמציא כלים או משבצות שלא באמת נמצאים בעמדה.
3. אם התלמיד שואל "למה?" (או חוזר על שאלה דומה לשאלה קודמת), אסור בהחלט לחזור על משפט שכבר אמרת קודם בשיחה. אתה חייב להעמיק ולהציג רצף מהלכים עתידי קונקרטי - אם רצף כזה (מהמנוע) סופק לך למטה, תאר אותו צעד-צעד: "אם היית משחק כך, היריב היה עונה ב-X למשבצת Y, ואז היית מאבד/נחשף ל-Z". אם לא סופק רצף כזה, נמק לפחות בעזרת עובדה חדשה ומדויקת מהעמדה שעדיין לא הזכרת - לעולם לא בניסוח מחדש של אותו משפט.`;

const CLASSIFICATION_LABELS = {
  best: 'מהלך מיטבי',
  good: 'מהלך טוב',
  inaccuracy: 'לא מדויק',
  mistake: 'טעות',
  blunder: 'טעות חמורה',
};

/**
 * Three named coach personas, one per broad skill tier. Each has its own name,
 * avatar and speaking voice so the same underlying LLM call feels like talking
 * to a different, level-appropriate coach - not just "the same coach using
 * simpler words". Exported so the frontend can show a matching name/avatar.
 */
export const COACH_PERSONAS = {
  beginner: {
    id: 'beginner',
    name: 'מאמן דני',
    avatar: '🐥',
    tagline: 'מסביר הכל צעד-צעד, בלי מילים קשות',
    voice:
      'אתה דני, מאמן סבלני וחם למתחילים. תפקידך לתרגם את המנוע לשפה פשוטה מאוד. אל תעמיס ברצף של 5 מהלכים קדימה. תסביר את הבעיה המיידית על הלוח: כלי שנשאר בלי הגנה, מלך בסכנה, או חסימה של כלי.',
    examples: [
      {
        q: 'למה המהלך שעשיתי רע?',
        a: 'שים לב לפרש שלך בערוגה e4. כשהזזת את הרגלי ל-h3, בעצם השארת את הפרש בלי שום הגנה. בתור הבא, המלכה השחורה תוכל פשוט לקחת אותו בחינם. המנוע הציע להזיז את הפרש ל-f2 קודם כדי לשמור עליו.',
      },
      {
        q: 'איך אני מפתח את הכלים פה?',
        a: 'הרץ שלך ב-c1 תקוע לגמרי כי הרגלי שלך ב-d2 חוסם אותו. כדאי קודם לקדם את הרגלי ל-d4, וזה יפתח לרץ אלכסון שלם עד ל-g5!',
      },
    ],
  },
  intermediate: {
    id: 'intermediate',
    name: 'מאמנת מיכל',
    avatar: '📘',
    tagline: 'מסבירה עקרונות בבהירות, שלב אחר שלב',
    voice:
      'את מיכל, מאמנת פרקטית לשחקנים בינוניים. את מתמקדת בטקטיקות (ריתוק, מזלג, התקפה כפולה) ומבנה רגלים. את מדברת בגובה העיניים, מקצועית ומעודדת, ומסבירה תכנונים של 2-3 צעדים קדימה.',
    examples: [
      {
        q: 'לא הבנתי למה Stockfish אומר שזו טעות. הרי איימתי לו על המלכה.',
        a: 'זה נכון שאיימת על המלכה, אבל החמצת כאן הזדמנות פז למזלג טקטי. אם היית שם את הפרש ב-d5 במקום ב-b5, היית מאיים בו-זמנית גם על המלכה שלו ב-c7 וגם על הצריח ב-e6. המהלך שעשית נותן ליריב זמן להזיז את המלכה ולצאת מהסכנה.',
      },
      {
        q: 'למה אי אפשר לקחת את הרגלי ב-e5?',
        a: 'כי הרגלי הזה מוגן על ידי ריתוק! הרץ השחור ב-c5 מרתק את הרגלי שלך ב-f2 למלך. אם תיקח את e5, אתה תפתח את האלכסון ותכניס את עצמך לשח. אתה חייב לשבור את הריתוק קודם, למשל על ידי הזזת המלך ל-h1.',
      },
    ],
  },
  advanced: {
    id: 'advanced',
    name: 'רב-אמן עומר',
    avatar: '♞',
    tagline: 'ניתוח מדויק ומעמיק לשחקנים רציניים',
    voice:
      'אתה רב-אמן (GM) עומר. אתה מאמן קפדני, חד, ולא עושה הנחות. אתה מנתח לעומק: יתרונות עמדתיים, חולשות בשרשרת הרגלים, טמפו ושליטה בערוגות מפתח. אתה משתמש במונחי שחמט מקצועיים ומצפה מהשחקן להבין דינמיקה עמוקה.',
    examples: [
      {
        q: 'המנוע אומר ש-c4 זה חוסר דיוק. זה נראה לי מהלך טבעי לגמרי.',
        a: 'זה "נראה" טבעי רק לשחקנים חובבים. קידום הרגלי ל-c4 מחליש באופן קריטי את המשבצת d4 ומפקיר אותה לחלוטין. Stockfish מראה בבירור שאחרי 1... Nf5, השחור ישתלט על d4 עם הפרש שלו בעוד שני מסעים, ואין לך שום רגלי שיוכל לגרש אותו משם. איבדת את השליטה במרכז.',
      },
      {
        q: 'איך אני אמור לשבור את ההגנה שלו פה?',
        a: 'אין טעם לתקוף באגף המלך עכשיו כי אין לך יתרון של טמפו. המנוע מזהה חולשה כרונית ברגלי המבודד שלו ב-d5. התוכנית הנכונה היא לתמרן את הצריח מ-a1 ל-d1, לרכז לחץ על d5, ולאלץ אותו להיכנס לעמדת התגוננות פסיבית לקראת סיום המשחק.',
      },
    ],
  },
};

/**
 * Renders a persona's two example Q&A exchanges as few-shot grounding for the
 * LLM prompt - not text the coach should ever quote verbatim, but a concrete
 * calibration of voice, specificity (real pieces/squares) and depth for that
 * skill tier, since a plain adjective-based voice description alone tends to
 * drift toward generic, hedge-y answers.
 */
function personaExamplesText(persona) {
  if (!persona.examples?.length) return '';
  const rendered = persona.examples
    .map((ex, i) => `דוגמה ${i + 1}:\nתלמיד: "${ex.q}"\n${persona.name}: "${ex.a}"`)
    .join('\n\n');
  return `\n\nדוגמאות לסגנון הדיבור והרמת הפירוט הנכונה שלך (אלו הדגמות בלבד להבנת הטון והרמה - אל תצטט אותן מילה במילה, אלא הגב תמיד לעמדה האמיתית שסופקה לך):\n${rendered}`;
}

function personaForElo(playerElo) {
  if (playerElo != null && playerElo <= 900) return COACH_PERSONAS.beginner;
  if (playerElo != null && playerElo <= 1400) return COACH_PERSONAS.intermediate;
  return COACH_PERSONAS.advanced;
}

/**
 * Maps a player's ELO tier to instructions for how the coach should speak to them -
 * a 400-rated beginner needs concrete "this piece is hanging" language with zero
 * jargon (no "evaluation", no centipawns), while a strong player can handle full
 * strategic/numeric detail. Used both by the LLM prompt and the offline fallback.
 */
export function levelProfile(playerElo) {
  const persona = personaForElo(playerElo);
  if (playerElo != null && playerElo <= 500) {
    return {
      simple: true,
      persona,
      audienceLabel: 'שחקן מתחיל לגמרי (סביבות 400 בדירוג אלו) שרק התחיל ללמוד שחמט',
      promptRules:
        'דבר אך ורק במונחים קונקרטיים על מה שקורה פיזית על הלוח - אילו כלים בסכנה, מה היריב יכול "לאכול" בחינם, מה מאיים על מה. אסור להשתמש במילים כמו "הערכת עמדה", "מאיות", "יתרון", "אבדן חומרי" או בכל מספר הערכה. כתוב במשפטים קצרים ופשוטים מאוד, בדיוק כמו שמסבירים למישהו שרק למד את חוקי המשחק.',
    };
  }
  if (playerElo != null && playerElo <= 900) {
    return {
      simple: true,
      persona,
      audienceLabel: 'שחקן מתחיל (סביבות 600-800 בדירוג אלו)',
      promptRules:
        'הימנע לגמרי ממספרי הערכה או מהמילה "מאיות". אפשר להשתמש במונחים בסיסיים כמו "פיתוח כלים" או "בטיחות המלך", אך הסבר בקצרה כל מונח כזה בפעם הראשונה שהוא מופיע, ותמיד תאר גם מה זה אומר בפועל על הלוח.',
    };
  }
  if (playerElo != null && playerElo <= 1400) {
    return {
      simple: false,
      persona,
      audienceLabel: 'שחקן בדרגת ביניים (סביבות 1000-1400 בדירוג אלו)',
      promptRules:
        'אפשר להשתמש במונחי שחמט סטנדרטיים (התפתחות, מרכז, מבנה רגלים, קו פתוח וכו׳), אך העדף תיאור מילולי של מידת היתרון/חיסרון על פני מספרי הערכה גולמיים.',
    };
  }
  return {
    simple: false,
    persona,
    audienceLabel:
      playerElo != null ? `שחקן מנוסה (סביבות ${playerElo} בדירוג אלו)` : 'שחקן מתקדם, או ללא רמת קושי מוגדרת',
    promptRules: 'אפשר להשתמש במונחי שחמט מתקדמים ובניתוח מדויק, כולל התייחסות לדינמיקה של העמדה ולמספרי הערכה כשרלוונטי.',
  };
}

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
  playerElo,
}) {
  const colorLabel = moverColor === 'b' ? 'שחור' : 'לבן';
  const isBad = classification === 'mistake' || classification === 'blunder';
  const isMinor = classification === 'inaccuracy';
  const classificationLabel = CLASSIFICATION_LABELS[classification] || 'מהלך';
  const level = levelProfile(playerElo);

  const continuationText = continuationSans?.length
    ? `רצף ההמשך שהמנוע רואה כענישה הצפויה של היריב (מהלך אחר מהלך, החל מתגובת היריב למהלך): ${continuationSans.join(', ')}.`
    : null;

  const toneInstruction = isBad
    ? 'המהלך הזה היה טעות משמעותית. הסבר בבירור, אך בטון תומך ולא מבייש, מה השתבש ולאן זה מוביל.'
    : isMinor
      ? 'המהלך הזה לא היה מדויק לגמרי, אך לא חמור. הסבר בעדינות מה אפשר היה לשפר.'
      : 'המהלך הזה היה טוב או מיטבי. חזק את השחקן בחיוב והסבר בקצרה מה עשה נכון ולמה.';

  return `${level.persona.voice}${personaExamplesText(level.persona)}

${CONVERSATIONAL_TONE_RULE}

${UNIVERSAL_IRON_RULES}

מי התלמיד: ${level.audienceLabel}.
איך לדבר אליו: ${level.promptRules}

נתוני המהלך (מידע פנימי בשבילך בלבד - אל תצטט מספרי הערכה גולמיים אם ההנחיה למעלה אוסרת זאת):
- מספר מהלך: ${moveNumber} (${colorLabel})
- מצב הלוח לפני המהלך (FEN): ${fenBefore}
- המהלך ששוחק בפועל: ${san}
- סיווג המהלך על ידי מנוע השחמט: ${classificationLabel}
${bestMoveSan && bestMoveSan !== san ? `- המהלך המומלץ במקום היה: ${bestMoveSan}` : '- זהו היה המהלך הטוב ביותר (או קרוב לכך) בעמדה'}
- הערכת העמדה לפני המהלך: ${evalBeforeStr}
- הערכת העמדה אחרי המהלך: ${evalAfterStr}
${continuationText ? `- ${continuationText}` : ''}

${toneInstruction} כתוב בעברית בלבד, בשלושה חלקים מפורטים (לא תמציתיים מדי - תן הסבר מוחשי ומלא, לא רק משפט אחד כללי). השתמש בשמות משבצות (כמו e4, Nf3) בלטינית בתוך הטקסט העברי.
${isBad ? 'בחלק הראשון חובה לפרט קונקרטית מה עלול לקרות בהמשך לפי רצף ההמשך שסופק - תאר זאת כסיפור קצר וברור, צעד-צעד, כולל איזה כלי נלקח או איזו מתקפה קורית.' : ''}

החזר אך ורק אובייקט JSON תקין (ללא טקסט נוסף לפניו או אחריו) במבנה הבא:
{
  "mistake": "3-5 משפטים: מה קרה פיזית על הלוח כתוצאה מהמהלך (בין אם טוב או רע)${isBad ? ', כולל תיאור קונקרטי וצעד-אחר-צעד של ההמשך הצפוי ולאן זה מוביל' : ', ומה זה משיג עבור השחקן'}",
  "strategy": "2-3 משפטים על העיקרון האסטרטגי הקשור למהלך (למשל בטיחות המלך, פיתוח כלים, שליטה במרכז, מבנה רגלים וכו'), מוסבר ברמה המתאימה לתלמיד",
  "howToThink": "טיפ מעשי ומפורט של 2-3 משפטים לאיך לחשוב במצבים דומים בעתיד"
}`;
}

export function localMoveFallback({
  san,
  bestMoveSan,
  evalBeforeStr,
  evalAfterStr,
  continuationSans,
  classification,
  playerElo,
}) {
  const isGood = classification === 'best' || classification === 'good';
  const isMinor = classification === 'inaccuracy';
  const level = levelProfile(playerElo);
  const continuationText = continuationSans?.length
    ? level.simple
      ? ` היריב צפוי להמשיך עם: ${continuationSans.join(', ')} - רצף שממחיש איך זה מסבך את המצב שלך.`
      : ` המנוע צופה שהיריב ימשיך עם: ${continuationSans.join(', ')} - המשך שממחיש כמה העמדה נעשתה קשה יותר.`
    : '';

  if (isGood) {
    return {
      mistake: level.simple
        ? `המהלך ${san} היה ${classification === 'best' ? 'מהלך מצוין' : 'מהלך טוב'}! לא נתת ליריב שום הזדמנות לתפוס כלי או ליצור בעיה, והעמדה שלך נשארה טובה.`
        : `המהלך ${san} היה ${classification === 'best' ? 'מהלך מיטבי' : 'מהלך טוב'} — ההערכה נשארה יציבה או השתפרה (${evalBeforeStr} ← ${evalAfterStr}).`,
      strategy: 'המהלך שומר על עקרונות טובים - כמו התפתחות כלים, בטיחות המלך ושליטה במרכז הלוח.',
      howToThink: 'המשך לחפש מהלכים שמפתחים כלים, שולטים במרכז ושומרים על בטיחות המלך, בדיוק כמו במהלך הזה.',
      isFallback: true,
    };
  }
  if (isMinor) {
    return {
      mistake: level.simple
        ? `המהלך ${san} לא היה הכי טוב, אבל זו לא טעות גדולה.${bestMoveSan ? ` המהלך ${bestMoveSan} היה נותן לך עמדה קצת יותר טובה.` : ''}`
        : `המהלך ${san} לא היה מדויק לחלוטין — ההערכה ירדה במעט (${evalBeforeStr} ← ${evalAfterStr}).${
            bestMoveSan ? ` המהלך ${bestMoveSan} היה מדויק יותר.` : ''
          }`,
      strategy: 'לעיתים יש מהלך מעט טוב יותר שמנצל את העמדה בצורה חדה או בטוחה יותר.',
      howToThink: 'לפני שתחליט, בדוק גם מהלכים חדים או מדויקים יותר, לא רק את הראשון שעולה לך בראש.',
      isFallback: true,
    };
  }
  return {
    mistake: level.simple
      ? `המהלך ${san} הייתה טעות שנתנה ליריב הזדמנות טובה.${bestMoveSan ? ` במקום זה, המהלך ${bestMoveSan} היה הרבה יותר בטוח.` : ''}${continuationText}`
      : `המהלך ${san} הרע את העמדה שלך באופן משמעותי — ההערכה ירדה מ-${evalBeforeStr} ל-${evalAfterStr}. המהלך המומלץ במקום היה ${bestMoveSan}.${continuationText}`,
    strategy: level.simple
      ? 'לפני כל מהלך, כדאי לבדוק: האם יש כלי שלי שהיריב יכול לתפוס בחינם? האם המלך שלי בטוח?'
      : 'ייתכן שהמהלך הזניח עיקרון אסטרטגי חשוב — כמו בטיחות המלך, שליטה במרכז, פיתוח כלים, או השארת כלי לא מוגן. כדאי לבדוק שוב את הלוח לפני שממשיכים.',
    howToThink: level.simple
      ? 'לפני שאתה מזיז כלי, תסתכל טוב טוב: האם היריב יכול "לאכול" אותו אחר כך? האם יש כלי אחר שלך שנשאר לא שמור?'
      : 'לפני כל מהלך, שאל את עצמך: האם המהלך הזה חושף את המלך שלי? האם הוא משאיר כלי בסכנה? האם יש מהלך שמפתח כלי או שולט במרכז בצורה טובה יותר?',
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

${CONVERSATIONAL_TONE_RULE}

${UNIVERSAL_IRON_RULES}

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

/**
 * Builds a prompt for a post-game summary of a single just-finished game (free-play
 * or pass-and-play, i.e. without a live coach) - unlike buildWeaknessPrompt (which
 * hunts for one recurring weakness across many games), this asks explicitly for
 * both what the student did well AND what to improve, to close out one game on an
 * encouraging, actionable note.
 */
export function buildGameSummaryPrompt({ counts, avgCpLoss, byPhase, sampleMistakes, resultLabel, playerElo }) {
  const level = levelProfile(playerElo);
  const samplesText = sampleMistakes?.length
    ? `\n\nדוגמאות קונקרטיות לטעויות מהמשחק הזה (מהלך, שלב, וסיווג):\n${sampleMistakes
        .map(
          (m) =>
            `- מהלך ${m.moveNumber} (${m.phase}): שיחק ${m.san} (${CLASSIFICATION_LABELS[m.classification] || m.classification})${m.bestMoveSan ? `, במקום ${m.bestMoveSan}` : ''}`
        )
        .join('\n')}`
    : '';

  return `${level.persona.voice}${personaExamplesText(level.persona)}

${CONVERSATIONAL_TONE_RULE}

${UNIVERSAL_IRON_RULES}

מי התלמיד: ${level.audienceLabel}.
איך לדבר אליו: ${level.promptRules}

התלמיד סיים הרגע משחק שחמט (במצב משחק חופשי, בלי הכוונה חיה של מאמן במהלך המשחק). זו ההזדמנות שלך לסכם עבורו את המשחק - לחזק את מה שהוא עשה טוב, ולהצביע בעדינות על מה לשפר בפעם הבאה.

נתוני המשחק (רק המהלכים של התלמיד):
- מהלכים מיטביים: ${counts.best}, טובים: ${counts.good}, לא מדויקים: ${counts.inaccuracy}, טעויות: ${counts.mistake}, טעויות חמורות: ${counts.blunder}
- אובדן מאיות ממוצע למהלך: ${Math.round(avgCpLoss)}
- טעויות לפי שלב משחק: פתיחה=${byPhase.opening.count}, אמצע משחק=${byPhase.middlegame.count}, סיום=${byPhase.endgame.count}
- תוצאת המשחק: ${resultLabel || 'לא ידועה'}${samplesText}

כתוב בעברית משוב קצר, אישי ומעודד, המבוסס על הנתונים בפועל (לא כללי גנרי). החזר אך ורק אובייקט JSON תקין:
{
  "overallSummary": "משפט או שניים שמסכמים את המשחק בטון חם ומעודד",
  "strengths": ["נקודה טובה קונקרטית 1", "נקודה טובה קונקרטית 2"],
  "improvements": ["נקודה לשיפור קונקרטית 1", "נקודה לשיפור קונקרטית 2"]
}`;
}

/**
 * Builds a prompt for a free-form question the student asks mid-game (e.g. "why
 * is this move bad?", "what should I be planning here?"). Unlike buildMovePrompt
 * (triggered automatically after a specific move), this responds to whatever the
 * student actually typed, grounded in the live position and recent chat history.
 */
export function buildChatPrompt({
  fen,
  moveHistorySan,
  studentColor,
  playerElo,
  question,
  conversationHistory,
  continuationSans,
}) {
  const level = levelProfile(playerElo);
  const colorLabel = studentColor === 'b' ? 'שחור' : 'לבן';
  const movesText = moveHistorySan?.length ? moveHistorySan.join(' ') : '(עדיין לא בוצעו מהלכים במשחק)';
  const historyText = conversationHistory?.length
    ? `\n\nהשיחה עד כה בין התלמיד לבינך (אל תחזור על משפט שכבר נאמר כאן):\n${conversationHistory
        .map((m) => `${m.role === 'user' ? 'תלמיד' : 'מאמן'}: ${m.text}`)
        .join('\n')}`
    : '';
  const continuationText = continuationSans?.length
    ? `\n\nרצף המהלכים שהמנוע (Stockfish) רואה כהמשך הטוב ביותר מהעמדה הנוכחית, מהלך אחר מהלך: ${continuationSans.join(', ')}. אם התלמיד שואל "למה" או מבקש הסבר מעמיק יותר, בסס את התשובה על הרצף הקונקרטי הזה - תאר מה קורה צעד-צעד ולמה זה עוזר/מזיק.`
    : '';

  return `${level.persona.voice}${personaExamplesText(level.persona)}

${CONVERSATIONAL_TONE_RULE}

${UNIVERSAL_IRON_RULES}

מי התלמיד: ${level.audienceLabel}. הוא משחק בתור ${colorLabel}.
איך לדבר אליו: ${level.promptRules}

מצב הלוח הנוכחי (FEN): ${fen}
רשימת המהלכים עד כה במשחק: ${movesText}${continuationText}${historyText}

התלמיד שואל אותך עכשיו, באמצע המשחק: "${question}"

ענה לו ישירות, בקצרה (2-5 משפטים), בהתבסס על העמדה האמיתית על הלוח עכשיו - לא באופן כללי. אם השאלה כללית ולא קשורה לעמדה הספציפית, ענה עליה כשאלת שחמט כללית אך עדיין באישיות ובטון שלך. השתמש בשמות משבצות בלטינית (כמו e4, Nf3) בתוך הטקסט העברי כשרלוונטי.

החזר אך ורק אובייקט JSON תקין (ללא טקסט נוסף):
{
  "reply": "התשובה שלך לתלמיד, 2-5 משפטים"
}`;
}

export function localChatFallback() {
  return {
    reply: 'כרגע אין לי חיבור לניתוח חי, אז אני לא יכול לענות במדויק על זה. תסתכלו טוב על הלוח בינתיים - יש כלי בסכנה? המלך שלכם בטוח? זה כמעט תמיד השאלה הראשונה שכדאי לשאול.',
    isFallback: true,
  };
}

/**
 * Builds a prompt for a free-standing position analysis - the student pastes any
 * FEN (or a PGN the frontend has already reduced to a final FEN) that isn't
 * necessarily from one of their own games, and wants to understand the ideas in
 * it: who stands better, what each side's plan is, and why.
 */
export function buildPositionExplanationPrompt({ fen, playerElo }) {
  const level = levelProfile(playerElo);

  return `${level.persona.voice}${personaExamplesText(level.persona)}

${CONVERSATIONAL_TONE_RULE}

${UNIVERSAL_IRON_RULES}

מי התלמיד: ${level.audienceLabel}.
איך לדבר אליו: ${level.promptRules}

התלמיד הביא לך עמדת שחמט לניתוח (לא בהכרח ממשחק שלו) - FEN: ${fen}

נתח את העמדה הזו: מי בעמדה טובה יותר ולמה (באופן מוחשי, לא רק "לבן טוב יותר"), מהם הרעיונות האסטרטגיים או הטקטיים העיקריים שקיימים בעמדה הזו, ומה התוכנית הסבירה להמשך עבור כל צד. התבסס אך ורק על העמדה הנתונה בפועל.

החזר אך ורק אובייקט JSON תקין (ללא טקסט נוסף):
{
  "assessment": "1-2 משפטים על מי בעמדה טובה יותר ולמה, באופן קונקרטי",
  "keyIdeas": "2-4 משפטים על הרעיונות האסטרטגיים/טקטיים העיקריים בעמדה הספציפית הזו",
  "planForWhite": "1-2 משפטים על התוכנית הסבירה ביותר עבור לבן מכאן",
  "planForBlack": "1-2 משפטים על התוכנית הסבירה ביותר עבור שחור מכאן"
}`;
}

export function localPositionFallback() {
  return {
    assessment: 'כרגע אין לי חיבור לניתוח חי של העמדה הזו.',
    keyIdeas: 'נסו להסתכל בעצמכם על העמדה: מי שולט יותר במרכז? האם יש כלים לא מפותחים אצל מישהו? האם שני המלכים בטוחים?',
    planForWhite: '',
    planForBlack: '',
    isFallback: true,
  };
}

export function localGameSummaryFallback({ counts, byPhase }) {
  const totalGood = counts.best + counts.good;
  const totalBad = counts.mistake + counts.blunder;
  const worstPhase = Object.entries(byPhase).sort((a, b) => b[1].count - a[1].count)[0];
  const phaseNames = { opening: 'בפתיחה', middlegame: 'באמצע המשחק', endgame: 'בסיום' };
  return {
    overallSummary:
      totalBad === 0
        ? 'משחק נקי ויציב - כל הכבוד!'
        : `משחק עם כמה רגעים טובים וכמה מקומות לשיפור - ${phaseNames[worstPhase[0]]} היה השלב הכי מאתגר.`,
    strengths: [
      totalGood > 0 ? `שיחקת ${totalGood} מהלכים טובים או מיטביים.` : 'סיימת את המשחק - זה כבר תרגול חשוב.',
      'המשכת לשחק עד הסוף בלי לוותר על העמדה.',
    ],
    improvements: [
      totalBad > 0
        ? `נסה להתמקד ב${phaseNames[worstPhase[0]]} - שם קרו רוב הטעויות הפעם.`
        : 'המשך לתרגל כדי לשמור על הרמה הגבוהה הזו.',
      'לפני כל מהלך, בדוק אם יש כלי שלך שנשאר לא מוגן.',
    ],
    isFallback: true,
  };
}
