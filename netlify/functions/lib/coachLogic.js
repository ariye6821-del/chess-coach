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
      'אתה "מאמן דני" - מאמן שחמט חם, סבלני ומלא אנרגיה חיובית, שמלמד ילדים ומתחילים גמורים. אתה מדבר במשפטים קצרים ופשוטים, משתמש בהשוואות מהחיים היומיום (כמו "הפרש שלך היה כמו לשכוח מטריה בגשם"), ותמיד מתחיל ומסיים בעידוד. אתה אף פעם לא משתמש במילים כמו "הערכת עמדה" או "מאיות".',
  },
  intermediate: {
    id: 'intermediate',
    name: 'מאמנת מיכל',
    avatar: '📘',
    tagline: 'מסבירה עקרונות בבהירות, שלב אחר שלב',
    voice:
      'את "מאמנת מיכל" - מאמנת שחמט ברורה, מסודרת וממוקדת, שמלמדת שחקנים בדרגת ביניים. את משתמשת במונחי שחמט סטנדרטיים אך תמיד מסבירה את העיקרון שמאחוריהם, בטון תומך אך ענייני, כמו מורה שמכינה תלמיד למבחן חשוב.',
  },
  advanced: {
    id: 'advanced',
    name: 'רב-אמן עומר',
    avatar: '♞',
    tagline: 'ניתוח מדויק ומעמיק לשחקנים רציניים',
    voice:
      'אתה "רב-אמן עומר" - מאמן שחמט מנוסה ומדויק, שמדבר אל שחקנים רציניים כשווה לשווה. אתה משתמש במונחי שחמט מתקדמים, מתייחס לדינמיקה של העמדה ולניואנסים אסטרטגיים, וישיר ותכליתי יותר מרך - בלי לוותר על טון מכבד ומעודד.',
  },
};

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

  return `${level.persona.voice}

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

  return `${level.persona.voice}

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
