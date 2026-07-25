import { buildWeaknessPrompt, localWeaknessFallback, callChatApi, hasApiKey } from './lib/coachLogic.js';

/**
 * Netlify Function: summarizes aggregated multi-game mistake statistics into a
 * Hebrew weakness profile via the configured LLM. Same key-hiding rationale as
 * analyzeMove.js - this was the second place the app called the LLM directly.
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
      body: JSON.stringify(localWeaknessFallback(stats)),
    };
  }

  try {
    const parsed = await callChatApi(buildWeaknessPrompt(stats), 500);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ summary: parsed.summary, recommendations: parsed.recommendations, isFallback: false }),
    };
  } catch (err) {
    console.error('weaknessSummary LLM call failed, using local fallback:', err);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(localWeaknessFallback(stats)),
    };
  }
};
