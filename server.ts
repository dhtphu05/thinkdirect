import path from 'path';
import { fileURLToPath } from 'url';
import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import { createThinkDirectApp } from './server/app.ts';
import {
  ENV_CONFIG,
  resolveActiveApiKey,
  maskApiKey,
} from './server/config/env.ts';
import { stripDataUrlPrefix } from './server/utils/mediaUtils.ts';

export { createThinkDirectApp, stripDataUrlPrefix };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = createThinkDirectApp();
  const port = ENV_CONFIG.port;

  if (ENV_CONFIG.nodeEnv !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(port, () => {
    const active = resolveActiveApiKey();
    const keyStatus = active.apiKey
      ? `configured (${active.source}: ${maskApiKey(active.apiKey)})`
      : 'awaiting GEMINI_API_KEY (.env.local or UI AI Settings)';
    console.log(
      `[ThinkDirect] Modular Express Server running on http://localhost:${port} — Gemini API key: ${keyStatus}`
    );
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  startServer().catch((err) => {
    console.error('[ThinkDirect] Fatal server startup error:', err);
    process.exit(1);
  });
}
