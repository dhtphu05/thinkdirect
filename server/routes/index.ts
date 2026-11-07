import { Router } from 'express';
import { attachGeminiContext } from '../middleware/aiMiddleware.ts';
import { healthRouter } from './healthRoutes.ts';
import { sceneRouter } from './sceneRoutes.ts';
import { speechRouter } from './speechRoutes.ts';
import { coachRouter } from './coachRoutes.ts';

export const apiRouter = Router();

apiRouter.use(attachGeminiContext);
apiRouter.use(healthRouter);
apiRouter.use(sceneRouter);
apiRouter.use(speechRouter);
apiRouter.use(coachRouter);
