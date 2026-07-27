import { buildGameSummaryPrompt, localGameSummaryFallback, callChatApi, hasApiKey } from './lib/coachLogic.js';

/**
 * Netlify Function: summarizes a single just-finished game (free-play/pass-and-play,
 * no live coach) into a Hebrew "what went well / what to improve" recap via the LLM.
 */
export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let stats;
  try {
    stats = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  if (!hasApiKey()) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(localGameSummaryFallback(stats)),
    };
  }

  try {
    const parsed = await callChatApi(buildGameSummaryPrompt(stats), 500);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        overallSummary: parsed.overallSummary,
        strengths: parsed.strengths,
        improvements: parsed.improvements,
        isFallback: false,
      }),
    };
  } catch (err) {
    console.error('gameSummary LLM call failed, using local fallback:', err);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(localGameSummaryFallback(stats)),
    };
  }
};
