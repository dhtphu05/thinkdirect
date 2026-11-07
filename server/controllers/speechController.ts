import { Response } from 'express';
import { AiRequest, ApiError } from '../middleware/aiMiddleware.ts';
import {
  transcribeSpokenAudio,
  synthesizeGeminiSpeech,
} from '../services/speechService.ts';

export async function handleTranscribeAudio(
  req: AiRequest,
  res: Response
): Promise<void> {
  const {
    audioBase64,
    mimeType = 'audio/webm',
    sceneContext = '',
    hintVocabulary = [],
  } = req.body || {};

  if (!audioBase64 || typeof audioBase64 !== 'string') {
    throw new ApiError(400, 'MISSING_AUDIO', 'Recorded audio data is required.');
  }

  if (!req.geminiClient) {
    throw new ApiError(
      401,
      'MISSING_API_KEY',
      'Gemini API key is required for Gemini speech transcription.'
    );
  }

  const { transcript } = await transcribeSpokenAudio({
    ai: req.geminiClient,
    audioBase64,
    mimeType,
    sceneContext,
    hintVocabulary: Array.isArray(hintVocabulary) ? hintVocabulary : [],
  });

  res.json({
    transcript,
    hasApiKey: true,
  });
}

export async function handleSynthesizeSpeech(
  req: AiRequest,
  res: Response
): Promise<void> {
  const { text } = req.body || {};
  if (!text || typeof text !== 'string' || !text.trim()) {
    throw new ApiError(400, 'MISSING_TEXT', 'Text is required for TTS.');
  }

  if (!req.geminiClient) {
    throw new ApiError(
      401,
      'MISSING_API_KEY',
      'Gemini API key is required for Gemini TTS.'
    );
  }

  const audio = await synthesizeGeminiSpeech(req.geminiClient, text);
  res.json(audio);
}
