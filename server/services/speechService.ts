import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { ENV_CONFIG } from '../config/env.ts';
import {
  stripDataUrlPrefix,
  withTimeout,
  ensurePlayableWavBase64,
} from '../utils/mediaUtils.ts';

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

  const vocabLine =
    hintVocabulary.length > 0
      ? `Relevant scene words that may appear: ${hintVocabulary.slice(0, 10).join(', ')}.`
      : '';
  const contextLine = sceneContext
    ? `Topic context: "${sceneContext}".`
    : '';

  const response = await withTimeout(
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
            text: `Transcribe the learner's spoken English audio accurately. ${contextLine} ${vocabLine}
STRICT RULES:
- Return ONLY the exact words the speaker actually said in English.
- Do NOT invent words if the audio is silent, background noise, or unintelligible — return an empty string "" in that case.
- Do NOT include commentary, labels, or surrounding quotation marks.`,
          },
        ],
      },
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      },
    }),
    18000
  );

  const raw = (response.text || '')
    .trim()
    .replace(/^["'“”]+|["'“”]+$/g, '')
    .trim();

  if (/^(silence|no speech|empty|none|\[.*\]|\(.*\))$/i.test(raw)) {
    return { transcript: '' };
  }

  return { transcript: raw };
}

export async function synthesizeGeminiSpeech(
  ai: GoogleGenAI,
  text: string
): Promise<{ audioBase64: string; mimeType: string }> {
  const response = await withTimeout(
    ai.models.generateContent({
      model: ENV_CONFIG.ttsModel,
      contents: [{ role: 'user', parts: [{ text: text.trim() }] }],
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
  );

  const inlineAudio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
  if (!inlineAudio?.data) {
    throw new Error('No audio payload returned from Gemini TTS model.');
  }

  return ensurePlayableWavBase64(
    inlineAudio.data,
    inlineAudio.mimeType || 'audio/L16;rate=24000'
  );
}
