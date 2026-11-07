import { Router } from 'express';
import {
  asyncHandler,
  requireGeminiClient,
} from '../middleware/aiMiddleware.ts';
import {
  handleAnalyzeScene,
  handleGenerateUseCase,
} from '../controllers/sceneController.ts';

export const sceneRouter = Router();

sceneRouter.post(
  '/analyze-scene',
  requireGeminiClient,
  asyncHandler(handleAnalyzeScene)
);

sceneRouter.post(
  '/generate-usecase',
  requireGeminiClient,
  asyncHandler(handleGenerateUseCase)
);
