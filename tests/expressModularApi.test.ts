/**
 * ThinkDirect — Modular Express.js Backend & Media Utilities Integration Tests
 */

import http from 'node:http';
import { createThinkDirectApp, stripDataUrlPrefix } from '../server.ts';
import { ensurePlayableWavBase64 } from '../server/utils/mediaUtils.ts';
import { maskApiKey } from '../server/config/env.ts';

interface TestCase {
  id: number;
  name: string;
  passed: boolean;
  details?: string;
}

const results: TestCase[] = [];

function check(cond: boolean, id: number, name: string, details = '') {
  if (cond) {
    results.push({ id, name, passed: true });
    console.log(`✓ [PASS ${id}] ${name}`);
  } else {
    results.push({ id, name, passed: false, details });
    console.error(`✗ [FAIL ${id}] ${name} — ${details}`);
  }
}

async function runIntegrationTests() {
  console.log('\n======================================================');
  console.log('   ThinkDirect — Modular Express.js API Tests');
  console.log('======================================================\n');

  const app = createThinkDirectApp();
  const server = http.createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const addr = server.address();
  const port = typeof addr === 'object' && addr ? addr.port : 0;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 1. GET /api/health returns structured status & model configuration
    {
      const res = await fetch(`${baseUrl}/api/health`);
      const body = await res.json();
      check(
        res.status === 200 &&
          body.status === 'ok' &&
          typeof body.hasApiKey === 'boolean' &&
          Boolean(body.models?.vision) &&
          Boolean(body.models?.stt) &&
          Boolean(body.models?.coach) &&
          Boolean(body.models?.tts),
        1,
        'GET /api/health returns modular health status and active Gemini models',
        JSON.stringify(body)
      );
    }

    // 2. GET /api/health detects x-gemini-api-key header override
    {
      const res = await fetch(`${baseUrl}/api/health`, {
        headers: { 'x-gemini-api-key': 'AIzaSyTestHeaderKey1234567890' },
      });
      const body = await res.json();
      check(
        res.status === 200 &&
          body.hasApiKey === true &&
          body.keySource === 'header' &&
          typeof body.maskedKey === 'string' &&
          body.maskedKey.includes('...'),
        2,
        'Middleware resolves x-gemini-api-key header and masks key safely',
        JSON.stringify(body)
      );
    }

    // 3. POST /api/analyze-scene without API key returns 401 MISSING_API_KEY
    {
      const res = await fetch(`${baseUrl}/api/analyze-scene`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: 'ZmFrZQ==' }),
      });
      const body = await res.json();
      check(
        res.status === 401 && body.error === 'MISSING_API_KEY',
        3,
        'POST /api/analyze-scene returns 401 MISSING_API_KEY when no key is configured',
        `status=${res.status}, body=${JSON.stringify(body)}`
      );
    }

    // 4. POST /api/analyze-scene with header key but missing imageBase64 returns 400 MISSING_IMAGE
    {
      const res = await fetch(`${baseUrl}/api/analyze-scene`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gemini-api-key': 'AIzaSyTestHeaderKey1234567890',
        },
        body: JSON.stringify({}),
      });
      const body = await res.json();
      check(
        res.status === 400 && body.error === 'MISSING_IMAGE',
        4,
        'POST /api/analyze-scene validates required imageBase64 payload (400 MISSING_IMAGE)',
        `status=${res.status}, body=${JSON.stringify(body)}`
      );
    }

    // 5. POST /api/generate-usecase validates required situation text (400 MISSING_SITUATION)
    {
      const res = await fetch(`${baseUrl}/api/generate-usecase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gemini-api-key': 'AIzaSyTestHeaderKey1234567890',
        },
        body: JSON.stringify({ situation: '   ' }),
      });
      const body = await res.json();
      check(
        res.status === 400 && body.error === 'MISSING_SITUATION',
        5,
        'POST /api/generate-usecase validates empty situation input (400 MISSING_SITUATION)',
        `status=${res.status}, body=${JSON.stringify(body)}`
      );
    }

    // 6. POST /api/transcribe-audio validates required audioBase64 payload (400 MISSING_AUDIO)
    {
      const res = await fetch(`${baseUrl}/api/transcribe-audio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gemini-api-key': 'AIzaSyTestHeaderKey1234567890',
        },
        body: JSON.stringify({ mimeType: 'audio/webm' }),
      });
      const body = await res.json();
      check(
        res.status === 400 && body.error === 'MISSING_AUDIO',
        6,
        'POST /api/transcribe-audio validates required audioBase64 payload (400 MISSING_AUDIO)',
        `status=${res.status}, body=${JSON.stringify(body)}`
      );
    }

    // 7. POST /api/coach-step validates required latestTranscript (400 MISSING_TRANSCRIPT)
    {
      const res = await fetch(`${baseUrl}/api/coach-step`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gemini-api-key': 'AIzaSyTestHeaderKey1234567890',
        },
        body: JSON.stringify({ stage: 'EXPANSION', latestTranscript: '' }),
      });
      const body = await res.json();
      check(
        res.status === 400 && body.error === 'MISSING_TRANSCRIPT',
        7,
        'POST /api/coach-step validates required latestTranscript (400 MISSING_TRANSCRIPT)',
        `status=${res.status}, body=${JSON.stringify(body)}`
      );
    }

    // 8. ensurePlayableWavBase64 wraps raw 24kHz 16-bit PCM (audio/L16) in valid 44-byte RIFF WAV header
    {
      const fakePcmSamples = Buffer.alloc(480, 0);
      const wrapped = ensurePlayableWavBase64(
        fakePcmSamples.toString('base64'),
        'audio/L16;codec=pcm;rate=24000'
      );
      const decoded = Buffer.from(wrapped.audioBase64, 'base64');
      const riffHeader = decoded.subarray(0, 4).toString('ascii');
      const waveHeader = decoded.subarray(8, 12).toString('ascii');
      const sampleRate = decoded.readUInt32LE(24);
      check(
        wrapped.mimeType === 'audio/wav' &&
          decoded.length === 44 + 480 &&
          riffHeader === 'RIFF' &&
          waveHeader === 'WAVE' &&
          sampleRate === 24000,
        8,
        'ensurePlayableWavBase64 prepends valid 44-byte 24kHz RIFF WAVE header to Gemini raw PCM',
        `mime=${wrapped.mimeType}, len=${decoded.length}, riff=${riffHeader}, rate=${sampleRate}`
      );
    }

    // 9. stripDataUrlPrefix & maskApiKey utilities
    {
      const stripped = stripDataUrlPrefix(
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==',
        'image/jpeg'
      );
      const masked = maskApiKey('AIzaSyA1B2C3D4E5F6G7H8I9J0');
      check(
        stripped.cleanMimeType === 'image/png' &&
          stripped.base64 === 'iVBORw0KGgoAAAANSUhEUg==' &&
          masked === 'AIza...I9J0',
        9,
        'stripDataUrlPrefix extracts MIME/base64 and maskApiKey redacts middle characters',
        JSON.stringify({ stripped, masked })
      );
    }
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }

  const passedCount = results.filter((r) => r.passed).length;
  console.log('\n------------------------------------------------------');
  console.log(`Results: ${passedCount}/${results.length} passed.`);
  if (passedCount !== results.length) {
    process.exit(1);
  }
  console.log('All Modular Express.js API integration tests passed!\n');
}

runIntegrationTests();
