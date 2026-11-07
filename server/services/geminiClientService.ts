import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { ENV_CONFIG } from '../config/env.ts';
import { withTimeout } from '../utils/mediaUtils.ts';

const clientCache = new Map<string, GoogleGenAI>();

export function getGeminiClient(apiKey?: string): GoogleGenAI | null {
  if (!apiKey) return null;
  const existing = clientCache.get(apiKey);
  if (existing) return existing;

  const client = new GoogleGenAI({ apiKey });
  if (clientCache.size > 8) {
    const oldestKey = clientCache.keys().next().value;
    if (oldestKey) clientCache.delete(oldestKey);
  }
  clientCache.set(apiKey, client);
  return client;
}

export async function verifyGeminiApiKey(candidateKey: string): Promise<{
  valid: boolean;
  error?: string;
}> {
  const trimmed = (candidateKey || '').trim();
  if (!trimmed || trimmed.length < 16) {
    return {
      valid: false,
      error: 'API key is too short. Paste a valid Google AI Studio Gemini API key.',
    };
  }

  try {
    const client = getGeminiClient(trimmed);
    if (!client) {
      return { valid: false, error: 'Could not initialize Gemini client.' };
    }

    await withTimeout(
      client.models.generateContent({
        model: ENV_CONFIG.coachModel,
        contents: 'Reply with OK',
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          maxOutputTokens: 8,
        },
      }),
      10000
    );

    return { valid: true };
  } catch (err: unknown) {
    const rawMsg = err instanceof Error ? err.message : String(err);
    const isAuthError =
      /API_KEY_INVALID|invalid api key|401|403|permission_denied/i.test(rawMsg);
    return {
      valid: false,
      error: isAuthError
        ? 'Invalid Gemini API key. Check your key from Google AI Studio.'
        : `Could not reach Gemini API: ${rawMsg.slice(0, 140)}`,
    };
  }
}
