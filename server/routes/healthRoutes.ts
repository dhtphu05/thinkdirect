import { Router } from 'express';
import { asyncHandler } from '../middleware/aiMiddleware.ts';
import {
  getHealthStatus,
  saveAndVerifyApiKey,
  clearApiKey,
} from '../controllers/healthController.ts';

export const healthRouter = Router();

healthRouter.get('/health', asyncHandler(getHealthStatus));
healthRouter.post('/settings/api-key', asyncHandler(saveAndVerifyApiKey));
healthRouter.delete('/settings/api-key', asyncHandler(clearApiKey));
