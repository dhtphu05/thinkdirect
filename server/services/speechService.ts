import { GoogleGenAI } from '@google/genai';
import { ENV_CONFIG } from '../config/env.ts';
import {
  stripDataUrlPrefix,
  withTimeout,
  ensurePlayableWavBase64,
} from '../utils/mediaUtils.ts';
import {
  buildThinkingConfig,
  withGeminiRetry,
} from './geminiClientService.ts';
import {
  buildSttTranscriptionPrompt,
  buildTtsCoachPrompt,
} from '../prompts/speechPrompts.ts';

export interface TranscribeAudioInput {
  ai: GoogleGenAI;
  audioBase64: string;
  mimeType?: string;
  sceneContext?: string;
  hintVocabulary?: string[];
}

export async function transcribeSpokenAudio({
  ai,
  audioBase64,
  mimeType = 'audio/webm',
  sceneContext = '',
  hintVocabulary = [],
}: TranscribeAudioInput): Promise<{ transcript: string }> {
  const { base64, cleanMimeType } = stripDataUrlPrefix(
    audioBase64,
    mimeType || 'audio/webm'
  );

  const sttPrompt = buildSttTranscriptionPrompt({
    sceneContext,
    hintVocabulary,
  });
  const thinkingConfig = buildThinkingConfig(ENV_CONFIG.sttModel, 'instant');

  const response = await withGeminiRetry(() =>
    withTimeout(
      ai.models.generateContent({
        model: ENV_CONFIG.sttModel,
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: cleanMimeType,
                data: base64,
              },
            },
            {
              text: sttPrompt,
            },
          ],
        },
        config: {
          ...(thinkingConfig ? { thinkingConfig } : {}),
        },
      }),
      18000
    )
  );

  const raw = (response.text || '')
    .trim()
    .replace(/^["'“”]+|["'“”]+$/g, '')
    .trim();

  if (
    !raw ||
    /^(silence|no speech|empty|none|inaudible|unintelligible|\[.*\]|\(.*\))$/i.test(
      raw
    )
  ) {
    return { transcript: '' };
  }

  return { transcript: raw };
}

export async function synthesizeGeminiSpeech(
  ai: GoogleGenAI,
  text: string
): Promise<{ audioBase64: string; mimeType: string }> {
  const cleanSpokenText = buildTtsCoachPrompt(text);
  if (!cleanSpokenText) {
    throw new Error('Empty text passed to Gemini TTS.');
  }

  const response = await withGeminiRetry(() =>
    withTimeout(
      ai.models.generateContent({
        model: ENV_CONFIG.ttsModel,
        contents: [{ role: 'user', parts: [{ text: cleanSpokenText }] }],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      }),
      14000
    )
  );

  const inlineAudio =
    response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
  if (!inlineAudio?.data) {
    throw new Error('No audio payload returned from Gemini TTS model.');
  }

  return ensurePlayableWavBase64(
    inlineAudio.data,
    inlineAudio.mimeType || 'audio/L16;rate=24000'
  );
}
