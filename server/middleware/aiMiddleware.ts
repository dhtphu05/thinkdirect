import { Request, Response, NextFunction, RequestHandler } from 'express';
import { GoogleGenAI } from '@google/genai';
import { resolveActiveApiKey } from '../config/env.ts';
import { getGeminiClient } from '../services/geminiClientService.ts';

export interface AiRequest extends Request {
  geminiApiKey?: string;
  geminiKeySource?: 'header' | 'runtime' | 'env' | 'none';
  geminiClient?: GoogleGenAI | null;
}

export class ApiError extends Error {
  statusCode: number;
  code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

export function attachGeminiContext(
  req: AiRequest,
  _res: Response,
  next: NextFunction
): void {
  const headerKey = req.header('x-gemini-api-key');
  const resolved = resolveActiveApiKey(headerKey);
  req.geminiApiKey = resolved.apiKey;
  req.geminiKeySource = resolved.source;
  req.geminiClient = getGeminiClient(resolved.apiKey);
  next();
}

export function requireGeminiClient(
  req: AiRequest,
  _res: Response,
  next: NextFunction
): void {
  if (!req.geminiClient) {
    next(
      new ApiError(
        401,
        'MISSING_API_KEY',
        'Gemini API key is required. Add GEMINI_API_KEY to .env.local or enter your key in AI Settings.'
      )
    );
    return;
  }
  next();
}

export function asyncHandler(
  fn: (req: AiRequest, res: Response, next: NextFunction) => Promise<void>
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req as AiRequest, res, next)).catch(next);
  };
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      error: err.code,
      code: err.code,
      message: err.message,
    });
    return;
  }

  const rawMessage =
    err instanceof Error ? err.message : 'Unexpected server error';
  const isQuotaOrRate = /429|quota|rate limit|resource_exhausted/i.test(
    rawMessage
  );
  const isInvalidKey =
    /API_KEY_INVALID|invalid api key|401|403|permission_denied/i.test(
      rawMessage
    );

  if (isInvalidKey) {
    res.status(401).json({
      error: 'INVALID_API_KEY',
      code: 'INVALID_API_KEY',
      message:
        'Your Gemini API key was rejected. Please update your key in AI Settings or .env.local.',
    });
    return;
  }

  if (isQuotaOrRate) {
    res.status(429).json({
      error: 'RATE_LIMITED',
      code: 'RATE_LIMITED',
      message:
        'Gemini API quota or rate limit reached. Wait a few seconds or switch API keys.',
    });
    return;
  }

  console.error('[ThinkDirect Express Error]:', err);
  res.status(500).json({
    error: 'INTERNAL_ERROR',
    code: 'INTERNAL_ERROR',
    message: rawMessage,
  });
}
