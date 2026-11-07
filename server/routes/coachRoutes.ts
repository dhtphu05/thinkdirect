import { Router } from 'express';
import {
  asyncHandler,
  requireGeminiClient,
} from '../middleware/aiMiddleware.ts';
import {
  handleCoachStep,
  handleConceptBridge,
  handleEvaluateSession,
} from '../controllers/coachController.ts';

export const coachRouter = Router();

coachRouter.post(
  '/coach-step',
  requireGeminiClient,
  asyncHandler(handleCoachStep)
);

coachRouter.post(
  '/concept-bridge',
  requireGeminiClient,
  asyncHandler(handleConceptBridge)
);

coachRouter.post(
  '/evaluate-session',
  requireGeminiClient,
  asyncHandler(handleEvaluateSession)
);
