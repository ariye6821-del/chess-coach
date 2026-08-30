import { buildMovePrompt, localMoveFallback, callChatApi, hasApiKey } from './lib/coachLogic.js';

/**
 * Netlify Function: analyzes a single chess move (any classification, not just
 * mistakes) and returns a 3-part Hebrew commentary from the configured LLM. The
 * LLM API key lives only in this server-side environment (LLM_API_KEY) and is
 * never sent to the browser.
 */
export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const params = {
    fenBefore: body.fenBefore,
    fenAfter: body.fenAfter,
    san: body.badMoveSan ?? body.san,
    bestMoveSan: body.bestMoveSan,
    opponentLastMoveSan: body.opponentLastMoveSan ?? null,
    evalBeforeStr: body.evalBeforeStr,
    evalAfterStr: body.evalAfterStr,
    mateBefore: body.mateBefore ?? null,
    mateAfter: body.mateAfter ?? null,
    moveNumber: body.moveNumber,
    continuationSans: body.continuationSans,
    moverColor: body.moverColor,
    classification: body.classification ?? 'mistake',
    playerElo: body.playerElo ?? null,
  };

  if (!hasApiKey()) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(localMoveFallback(params)),
    };
  }

  try {
    const parsed = await callChatApi(buildMovePrompt(params), 700);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mistake: parsed.mistake,
        strategy: parsed.strategy,
        howToThink: parsed.howToThink,
        isFallback: false,
      }),
    };
  } catch (err) {
    console.error('analyzeMove LLM call failed, using local fallback:', err);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(localMoveFallback(params)),
    };
  }
};
