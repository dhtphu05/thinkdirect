import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const PROJECT_ROOT = path.resolve(__dirname, '../..');
export const ENV_LOCAL_PATH = path.resolve(PROJECT_ROOT, '.env.local');

dotenv.config({ path: ENV_LOCAL_PATH });
dotenv.config({ path: path.resolve(PROJECT_ROOT, '.env') });

const PLACEHOLDER_KEYS = new Set([
  '',
  'MY_GEMINI_API_KEY',
  'YOUR_GEMINI_API_KEY',
  'YOUR_API_KEY_HERE',
]);

function sanitizeKey(raw?: string | null): string | undefined {
  const trimmed = (raw || '').trim();
  if (!trimmed || PLACEHOLDER_KEYS.has(trimmed)) {
    return undefined;
  }
  return trimmed;
}

let runtimeApiKey: string | undefined = undefined;

export const ENV_CONFIG = {
  get port(): number {
    return parseInt(process.env.PORT || '3000', 10);
  },
  get nodeEnv(): string {
    return process.env.NODE_ENV || 'development';
  },
  get visionModel(): string {
    return process.env.GEMINI_VISION_MODEL || 'gemini-2.5-flash';
  },
  get sttModel(): string {
    return process.env.GEMINI_STT_MODEL || 'gemini-2.5-flash';
  },
  get coachModel(): string {
    return process.env.GEMINI_COACH_MODEL || 'gemini-2.5-flash';
  },
  get ttsModel(): string {
    return process.env.GEMINI_TTS_MODEL || 'gemini-2.5-flash-preview-tts';
  },
  get envApiKey(): string | undefined {
    return sanitizeKey(process.env.GEMINI_API_KEY);
  },
  get runtimeApiKey(): string | undefined {
    return runtimeApiKey;
  },
};

export function resolveActiveApiKey(headerKey?: string | null): {
  apiKey?: string;
  source: 'header' | 'runtime' | 'env' | 'none';
} {
  const cleanHeader = sanitizeKey(headerKey);
  if (cleanHeader) {
    return { apiKey: cleanHeader, source: 'header' };
  }
  if (runtimeApiKey) {
    return { apiKey: runtimeApiKey, source: 'runtime' };
  }
  const fromEnv = ENV_CONFIG.envApiKey;
  if (fromEnv) {
    return { apiKey: fromEnv, source: 'env' };
  }
  return { apiKey: undefined, source: 'none' };
}

export function maskApiKey(key?: string): string | undefined {
  if (!key) return undefined;
  if (key.length <= 10) return '••••••••';
  return `${key.slice(0, 4)}••••${key.slice(-4)}`;
}

export function setRuntimeGeminiApiKey(
  nextKey: string | null,
  persistToEnvLocal = true
): void {
  const sanitized = sanitizeKey(nextKey);
  runtimeApiKey = sanitized;

  if (!persistToEnvLocal) return;

  try {
    let content = '';
    if (fs.existsSync(ENV_LOCAL_PATH)) {
      content = fs.readFileSync(ENV_LOCAL_PATH, 'utf8');
    } else {
      const examplePath = path.resolve(PROJECT_ROOT, '.env.example');
      if (fs.existsSync(examplePath)) {
        content = fs.readFileSync(examplePath, 'utf8');
      }
    }

    const keyLine = `GEMINI_API_KEY=${sanitized || ''}`;
    if (/^GEMINI_API_KEY=.*$/m.test(content)) {
      content = content.replace(/^GEMINI_API_KEY=.*$/m, keyLine);
    } else {
      content = `${content.trimEnd()}\n${keyLine}\n`;
    }

    fs.writeFileSync(ENV_LOCAL_PATH, content, 'utf8');
    if (sanitized) {
      process.env.GEMINI_API_KEY = sanitized;
    } else {
      delete process.env.GEMINI_API_KEY;
    }
  } catch (err) {
    console.warn('[ThinkDirect] Could not persist key to .env.local:', err);
  }
}
