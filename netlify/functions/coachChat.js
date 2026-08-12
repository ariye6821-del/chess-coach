import { buildChatPrompt, localChatFallback, callChatApi, hasApiKey } from './lib/coachLogic.js';

/**
 * Netlify Function: answers a free-form question the student asks the coach
 * mid-game, grounded in the live board position rather than a fixed template.
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
    moveHistorySan: body.moveHistorySan ?? [],
    studentColor: body.studentColor ?? 'w',
    playerElo: body.playerElo ?? null,
    question: body.question ?? '',
    conversationHistory: body.conversationHistory ?? [],
    continuationSans: body.continuationSans ?? [],
  };

  if (!params.question.trim()) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing question' }) };
  }

  if (!hasApiKey()) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(localChatFallback(params)),
    };
  }

  try {
    const parsed = await callChatApi(buildChatPrompt(params), 400);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reply: parsed.reply, isFallback: false }),
    };
  } catch (err) {
    console.error('coachChat LLM call failed, using local fallback:', err);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(localChatFallback(params)),
    };
  }
};
