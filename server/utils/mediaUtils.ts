/**
 * Safely strips any data URL header, including complex MIME parameters like
 * `data:audio/webm;codecs=opus;base64,...` or `data:image/jpeg;base64,...`.
 */
export function stripDataUrlPrefix(
  dataUrlOrBase64: string,
  fallbackMime = 'application/octet-stream'
): { base64: string; cleanMimeType: string } {
  const trimmed = (dataUrlOrBase64 || '').trim();
  const headerMatch = trimmed.match(/^data:([^;,]+)(?:;[^,]*)?,(.*)$/s);
  if (headerMatch) {
    return {
      cleanMimeType: headerMatch[1].trim() || fallbackMime.split(';')[0],
      base64: headerMatch[2].trim(),
    };
  }
  return {
    cleanMimeType:
      fallbackMime.split(';')[0].trim() || 'application/octet-stream',
    base64: trimmed,
  };
}

export function withTimeout<T>(promise: Promise<T>, ms = 18000): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error(`Gemini request timed out after ${ms}ms`)),
      ms
    );
  });
  return Promise.race([promise, timeoutPromise]).finally(() =>
    clearTimeout(timeoutId)
  );
}

export function safeParseJson<T>(rawText: string | undefined, fallback: T): T {
  if (!rawText) return fallback;
  const cleaned = rawText
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    return fallback;
  }
}

/**
 * Wraps raw 16-bit mono PCM audio (e.g. `audio/L16;rate=24000` returned by Gemini TTS)
 * in a standard 44-byte RIFF WAV header so HTMLAudioElement can play it in any browser.
 */
export function ensurePlayableWavBase64(
  rawBase64: string,
  reportedMimeType = 'audio/L16;rate=24000'
): { audioBase64: string; mimeType: string } {
  const lowerMime = reportedMimeType.toLowerCase();
  if (
    lowerMime.includes('wav') ||
    lowerMime.includes('mp3') ||
    lowerMime.includes('mpeg') ||
    lowerMime.includes('ogg')
  ) {
    const pcmCheck = Buffer.from(rawBase64.slice(0, 16), 'base64').toString(
      'ascii'
    );
    if (pcmCheck.startsWith('RIFF') || !lowerMime.includes('wav')) {
      return { audioBase64: rawBase64, mimeType: reportedMimeType.split(';')[0] };
    }
  }

  const rateMatch = reportedMimeType.match(/rate=(\d+)/i);
  const sampleRate = rateMatch ? parseInt(rateMatch[1], 10) : 24000;
  const numChannels = 1;
  const bitsPerSample = 16;

  const pcmBuffer = Buffer.from(rawBase64, 'base64');
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const wavHeader = Buffer.alloc(44);

  wavHeader.write('RIFF', 0);
  wavHeader.writeUInt32LE(36 + pcmBuffer.length, 4);
  wavHeader.write('WAVE', 8);
  wavHeader.write('fmt ', 12);
  wavHeader.writeUInt32LE(16, 16); // Subchunk1Size (PCM)
  wavHeader.writeUInt16LE(1, 20); // AudioFormat (1 = PCM)
  wavHeader.writeUInt16LE(numChannels, 22);
  wavHeader.writeUInt32LE(sampleRate, 24);
  wavHeader.writeUInt32LE(byteRate, 28);
  wavHeader.writeUInt16LE(blockAlign, 32);
  wavHeader.writeUInt16LE(bitsPerSample, 34);
  wavHeader.write('data', 36);
  wavHeader.writeUInt32LE(pcmBuffer.length, 40);

  const wavBuffer = Buffer.concat([wavHeader, pcmBuffer]);
  return {
    audioBase64: wavBuffer.toString('base64'),
    mimeType: 'audio/wav',
  };
}
