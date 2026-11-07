import express, { Express } from 'express';
import { apiRouter } from './routes/index.ts';
import { errorHandler } from './middleware/aiMiddleware.ts';

export function createThinkDirectApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '30mb' }));
  app.use(express.urlencoded({ extended: true, limit: '30mb' }));

  app.use('/api', apiRouter);
  app.use('/api', errorHandler);

  return app;
}
