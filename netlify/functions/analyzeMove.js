import { buildMistakePrompt, localMistakeFallback, callChatApi, hasApiKey } from './lib/coachLogic.js';

/**
 * Netlify Function: analyzes a detected chess mistake and returns a 3-part Hebrew
 * explanation from the configured LLM. The LLM API key lives only in this server-side
 * environment (LLM_API_KEY) and is never sent to the browser.
 */
export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let params;
  try {
    params = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  if (!hasApiKey()) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(localMistakeFallback(params)),
    };
  }

  try {
    const parsed = await callChatApi(buildMistakePrompt(params), 700);
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
      body: JSON.stringify(localMistakeFallback(params)),
    };
  }
};
