import { buildPositionExplanationPrompt, localPositionFallback, callChatApi, hasApiKey } from './lib/coachLogic.js';

/**
 * Netlify Function: explains an arbitrary chess position (pasted FEN/PGN, not
 * necessarily from the student's own game) - who stands better and what the
 * plans are for each side.
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
    fen: body.fen,
    playerElo: body.playerElo ?? null,
  };

  if (!params.fen) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing fen' }) };
  }

  if (!hasApiKey()) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(localPositionFallback(params)),
    };
  }

  try {
    const parsed = await callChatApi(buildPositionExplanationPrompt(params), 500);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assessment: parsed.assessment,
        keyIdeas: parsed.keyIdeas,
        planForWhite: parsed.planForWhite,
        planForBlack: parsed.planForBlack,
        isFallback: false,
      }),
    };
  } catch (err) {
    console.error('positionAnalysis LLM call failed, using local fallback:', err);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(localPositionFallback(params)),
    };
  }
};
