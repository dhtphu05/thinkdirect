import { Response } from 'express';
import {
  ENV_CONFIG,
  maskApiKey,
  setRuntimeGeminiApiKey,
} from '../config/env.ts';
import { verifyGeminiApiKey } from '../services/geminiClientService.ts';
import { AiRequest, ApiError } from '../middleware/aiMiddleware.ts';

export async function getHealthStatus(
  req: AiRequest,
  res: Response
): Promise<void> {
  res.json({
    status: 'ok',
    hasApiKey: Boolean(req.geminiApiKey),
    keySource: req.geminiKeySource || 'none',
    maskedKey: maskApiKey(req.geminiApiKey),
    models: {
      vision: ENV_CONFIG.visionModel,
      stt: ENV_CONFIG.sttModel,
      coach: ENV_CONFIG.coachModel,
      tts: ENV_CONFIG.ttsModel,
    },
    timestamp: Date.now(),
  });
}

export async function saveAndVerifyApiKey(
  req: AiRequest,
  res: Response
): Promise<void> {
  const { apiKey = '', persistToEnv = true } = req.body || {};
  const trimmed = String(apiKey).trim();

  if (!trimmed) {
    throw new ApiError(
      400,
      'EMPTY_API_KEY',
      'Please paste a valid Gemini API key from Google AI Studio.'
    );
  }

  const verification = await verifyGeminiApiKey(trimmed);
  if (!verification.valid) {
    throw new ApiError(
      401,
      'INVALID_API_KEY',
      verification.error || 'Gemini API key verification failed.'
    );
  }

  setRuntimeGeminiApiKey(trimmed, Boolean(persistToEnv));

  res.json({
    status: 'ok',
    valid: true,
    hasApiKey: true,
    keySource: persistToEnv ? 'env' : 'runtime',
    maskedKey: maskApiKey(trimmed),
    models: {
      vision: ENV_CONFIG.visionModel,
      stt: ENV_CONFIG.sttModel,
      coach: ENV_CONFIG.coachModel,
      tts: ENV_CONFIG.ttsModel,
    },
  });
}

export async function clearApiKey(
  _req: AiRequest,
  res: Response
): Promise<void> {
  setRuntimeGeminiApiKey(null, true);
  res.json({
    status: 'ok',
    hasApiKey: false,
    keySource: 'none',
  });
}
