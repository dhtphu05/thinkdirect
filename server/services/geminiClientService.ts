import { GoogleGenAI, ThinkingConfig, ThinkingLevel } from '@google/genai';
import { ENV_CONFIG } from '../config/env.ts';
import { withTimeout } from '../utils/mediaUtils.ts';

const clientCache = new Map<string, GoogleGenAI>();

export type ThinkingMode = 'instant' | 'balanced';

/**
 * Builds model-safe thinking configuration across Gemini 2.5 and Gemini 3 families:
 * - `gemini-2.5-flash*`: uses `thinkingBudget` (0 for sub-second coach/STT, 256 for Vision curriculum).
 * - `gemini-2.5-pro*`: uses minimum valid `thinkingBudget` (128 / 512).
 * - `gemini-3*`: uses `thinkingLevel` (MINIMAL / LOW).
 * - Other models: returns `undefined` to avoid HTTP 400 INVALID_ARGUMENT.
 */
export function buildThinkingConfig(
  modelName: string,
  mode: ThinkingMode = 'instant'
): ThinkingConfig | undefined {
  const normalized = (modelName || '').trim().toLowerCase();
  if (!normalized) return undefined;

  if (normalized.startsWith('gemini-2.5-pro')) {
    return { thinkingBudget: mode === 'instant' ? 128 : 512 };
  }

  if (normalized.startsWith('gemini-2.5')) {
    return { thinkingBudget: mode === 'instant' ? 0 : 256 };
  }

  if (normalized.startsWith('gemini-3')) {
    return {
      thinkingLevel:
        mode === 'instant' ? ThinkingLevel.MINIMAL : ThinkingLevel.LOW,
    };
  }

  return undefined;
}

/**
 * Retries transient 5xx / network blips once with a short backoff while never
 * retrying 4xx auth, quota, schema, or explicit timeout errors.
 */
export async function withGeminiRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 1
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await operation();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const isTransient =
        /500|502|503|504|UNAVAILABLE|INTERNAL|ECONNRESET|fetch failed/i.test(
          msg
        ) && !/timed out|400|401|403|429/i.test(msg);

      if (!isTransient || attempt >= maxRetries) {
        throw err;
      }
      attempt += 1;
      await new Promise((resolve) => setTimeout(resolve, 450 * attempt));
    }
  }
}

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

    const thinkingConfig = buildThinkingConfig(ENV_CONFIG.coachModel, 'instant');

    await withTimeout(
      client.models.generateContent({
        model: ENV_CONFIG.coachModel,
        contents: 'Reply with OK',
        config: {
          ...(thinkingConfig ? { thinkingConfig } : {}),
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
