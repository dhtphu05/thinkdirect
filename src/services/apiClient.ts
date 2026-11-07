import { ApiHealthStatus } from '../types';

const LOCAL_API_KEY_STORAGE = 'thinkdirect_gemini_api_key_v1';

export function getStoredClientApiKey(): string {
  if (typeof window === 'undefined') return '';
  try {
    return (window.localStorage.getItem(LOCAL_API_KEY_STORAGE) || '').trim();
  } catch {
    return '';
  }
}

export function setStoredClientApiKey(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    const trimmed = key.trim();
    if (trimmed) {
      window.localStorage.setItem(LOCAL_API_KEY_STORAGE, trimmed);
    } else {
      window.localStorage.removeItem(LOCAL_API_KEY_STORAGE);
    }
  } catch {
    // Ignore private-mode storage errors
  }
}

export function notifyApiKeyNeeded(reason?: string): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent('thinkdirect:apikey-needed', {
      detail: { reason: reason || 'Please configure your Gemini API key.' },
    })
  );
}

export async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  const clientKey = getStoredClientApiKey();
  if (clientKey && !headers.has('x-gemini-api-key')) {
    headers.set('x-gemini-api-key', clientKey);
  }

  const response = await fetch(path, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    try {
      const cloned = response.clone();
      const errBody = await cloned.json();
      if (
        errBody?.code === 'MISSING_API_KEY' ||
        errBody?.code === 'INVALID_API_KEY'
      ) {
        notifyApiKeyNeeded(errBody.message);
      }
    } catch {
      notifyApiKeyNeeded();
    }
  }

  return response;
}

export async function fetchApiHealth(): Promise<ApiHealthStatus | null> {
  try {
    const res = await apiFetch('/api/health', { method: 'GET' });
    if (!res.ok) return null;
    return (await res.json()) as ApiHealthStatus;
  } catch {
    return null;
  }
}

export async function saveAndVerifyGeminiKey(apiKey: string): Promise<{
  ok: boolean;
  maskedKey?: string;
  keySource?: string;
  error?: string;
}> {
  const trimmed = apiKey.trim();
  if (!trimmed) {
    return { ok: false, error: 'Please paste a Gemini API key.' };
  }

  try {
    const res = await fetch('/api/settings/api-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: trimmed, persistToEnv: true }),
    });
    const data = await res.json();
    if (!res.ok) {
      return {
        ok: false,
        error: data?.message || 'Invalid Gemini API key.',
      };
    }

    setStoredClientApiKey(trimmed);
    return {
      ok: true,
      maskedKey: data.maskedKey,
      keySource: data.keySource,
    };
  } catch {
    return {
      ok: false,
      error: 'Cannot reach Node.js backend. Ensure `npm run dev` is running.',
    };
  }
}

export async function clearConfiguredGeminiKey(): Promise<void> {
  setStoredClientApiKey('');
  try {
    await fetch('/api/settings/api-key', { method: 'DELETE' });
  } catch {
    // Ignore network error when clearing
  }
}
