import { Response } from 'express';
import { AiRequest, ApiError } from '../middleware/aiMiddleware.ts';
import {
  analyzeScenePhoto,
  generateUseCaseScene,
} from '../services/visionService.ts';

export async function handleAnalyzeScene(
  req: AiRequest,
  res: Response
): Promise<void> {
  const {
    imageBase64,
    mimeType = 'image/jpeg',
    userGoal = '',
    userLevel = 'B1',
  } = req.body || {};

  if (!imageBase64 || typeof imageBase64 !== 'string') {
    throw new ApiError(
      400,
      'MISSING_IMAGE',
      'A captured camera frame or uploaded photo is required.'
    );
  }

  if (!req.geminiClient) {
    throw new ApiError(
      401,
      'MISSING_API_KEY',
      'Gemini API key is required to analyze photos. Open AI Settings to add your key.'
    );
  }

  const result = await analyzeScenePhoto({
    ai: req.geminiClient,
    imageBase64,
    mimeType,
    userGoal,
    userLevel,
  });

  res.json(result);
}

export async function handleGenerateUseCase(
  req: AiRequest,
  res: Response
): Promise<void> {
  const { situation = '', userLevel = 'B1' } = req.body || {};

  if (!situation || typeof situation !== 'string' || !situation.trim()) {
    throw new ApiError(
      400,
      'MISSING_SITUATION',
      'Please enter a real-life topic or situation to practice.'
    );
  }

  if (!req.geminiClient) {
    throw new ApiError(
      401,
      'MISSING_API_KEY',
      'Gemini API key is required to generate a custom use-case. Open AI Settings to add your key.'
    );
  }

  const result = await generateUseCaseScene({
    ai: req.geminiClient,
    situation,
    userLevel,
  });

  res.json(result);
}
