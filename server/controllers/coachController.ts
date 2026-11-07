import { Response } from 'express';
import { AiRequest, ApiError } from '../middleware/aiMiddleware.ts';
import {
  evaluateSpeakingStep,
  bridgeVietnameseConcept,
  evaluateCompletedSession,
} from '../services/coachService.ts';
import { IdeaQuestionKey } from '../../src/types.ts';

export async function handleCoachStep(
  req: AiRequest,
  res: Response
): Promise<void> {
  if (!req.geminiClient) {
    throw new ApiError(
      401,
      'MISSING_API_KEY',
      'Gemini API key is required for AI Speaking Coach.'
    );
  }

  const {
    stage = 'EXPANSION',
    sceneContext = 'Everyday Moment',
    sceneObjects = [],
    previousSentences = [],
    latestTranscript = '',
    stepNumber = 1,
    totalSteps = 3,
    questionKey = 'Why',
    priorTurnAnswer = '',
    beatStep,
    hintsUsed = false,
  } = req.body || {};

  const result = await evaluateSpeakingStep({
    ai: req.geminiClient,
    stage,
    sceneContext,
    sceneObjects: Array.isArray(sceneObjects) ? sceneObjects : [],
    previousSentences: Array.isArray(previousSentences)
      ? previousSentences
      : [],
    latestTranscript: String(latestTranscript),
    stepNumber: Number(stepNumber) || 1,
    totalSteps: Number(totalSteps) || 3,
    questionKey: questionKey as IdeaQuestionKey,
    priorTurnAnswer: String(priorTurnAnswer || ''),
    beatStep: typeof beatStep === 'number' ? beatStep : undefined,
    hintsUsed: Boolean(hintsUsed),
  });

  res.json(result);
}

export async function handleConceptBridge(
  req: AiRequest,
  res: Response
): Promise<void> {
  if (!req.geminiClient) {
    throw new ApiError(
      401,
      'MISSING_API_KEY',
      'Gemini API key is required for Concept Bridge.'
    );
  }

  const {
    vietnameseIdea = '',
    sceneContext = 'Everyday Moment',
    sceneObjects = [],
    currentStage = '',
    currentThought = '',
  } = req.body || {};
  const result = await bridgeVietnameseConcept(
    req.geminiClient,
    String(vietnameseIdea),
    String(sceneContext),
    {
      sceneObjects: Array.isArray(sceneObjects) ? sceneObjects : [],
      currentStage: String(currentStage || ''),
      currentThought: String(currentThought || ''),
    }
  );

  res.json(result);
}

export async function handleEvaluateSession(
  req: AiRequest,
  res: Response
): Promise<void> {
  if (!req.geminiClient) {
    throw new ApiError(
      401,
      'MISSING_API_KEY',
      'Gemini API key is required for Session Evaluation.'
    );
  }

  const {
    sceneTitle = 'Everyday Moment',
    initialThought = '',
    expansionSentences = [],
    developmentSentences = [],
    selfTalkTranscript = '',
    independentRecallTranscript = '',
    hintsUsedCount = 0,
    selfTalkDurationSeconds = 25,
  } = req.body || {};

  const result = await evaluateCompletedSession({
    ai: req.geminiClient,
    sceneTitle: String(sceneTitle),
    initialThought: String(initialThought),
    expansionSentences: Array.isArray(expansionSentences)
      ? expansionSentences
      : [],
    developmentSentences: Array.isArray(developmentSentences)
      ? developmentSentences
      : [],
    selfTalkTranscript: String(selfTalkTranscript),
    independentRecallTranscript: String(independentRecallTranscript),
    hintsUsedCount: Number(hintsUsedCount) || 0,
    selfTalkDurationSeconds: Number(selfTalkDurationSeconds) || 25,
  });

  res.json(result);
}
