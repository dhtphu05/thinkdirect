import { Router } from 'express';
import {
  asyncHandler,
  requireGeminiClient,
} from '../middleware/aiMiddleware.ts';
import {
  handleTranscribeAudio,
  handleSynthesizeSpeech,
} from '../controllers/speechController.ts';

export const speechRouter = Router();

speechRouter.post(
  '/transcribe-audio',
  requireGeminiClient,
  asyncHandler(handleTranscribeAudio)
);

speechRouter.post(
  '/tts',
  requireGeminiClient,
  asyncHandler(handleSynthesizeSpeech)
);
