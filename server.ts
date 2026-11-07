import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import {
  analyzeExpansionStep,
  evaluateIdeaDevelopmentAttempt,
  evaluateSelfTalkMonologue,
  evaluateIndependentRecall,
  resolveConceptBridgeFallback,
} from './src/services/speakingEngine.ts';
import { IdeaQuestionKey } from './src/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local (recommended in README) first, then fallback to .env
dotenv.config({ path: path.resolve(__dirname, '.env.local') });
dotenv.config();

const VISION_MODEL = process.env.GEMINI_VISION_MODEL || 'gemini-2.5-flash';
const STT_MODEL = process.env.GEMINI_STT_MODEL || 'gemini-2.5-flash';
const COACH_MODEL = process.env.GEMINI_COACH_MODEL || 'gemini-2.5-flash';
const TTS_MODEL = process.env.GEMINI_TTS_MODEL || 'gemini-2.5-flash-preview-tts';

const apiKey =
  process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'
    ? process.env.GEMINI_API_KEY.trim()
    : undefined;

const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

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
    cleanMimeType: fallbackMime.split(';')[0].trim() || 'application/octet-stream',
    base64: trimmed,
  };
}

function withTimeout<T>(promise: Promise<T>, ms = 14000): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('Request timed out')), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() =>
    clearTimeout(timeoutId)
  );
}

const DEFAULT_STUDY_SCENE = {
  title: 'University Study Workspace',
  description:
    'A focused workspace with a laptop code editor, mechanical keyboard, notebook, headphones, and warm coffee.',
  openingQuestion: 'What are you doing here?',
  initialSuggestedThought: "I'm coding.",
  suggestedFramework: '5W1H',
  objects: [
    {
      name: 'Laptop',
      phonetic: '/ˈlæp.tɒp/',
      actionChunk: 'build a login page',
      xPercent: 50,
      yPercent: 40,
      definition: 'A portable computer for coding, writing, and coursework.',
      contextualSentence: "I'm building a login page on my laptop.",
      category: 'Electronics',
      vietnameseMeaning: 'máy tính xách tay',
    },
    {
      name: 'Headphones',
      phonetic: '/ˈhed.fəʊnz/',
      actionChunk: 'block out noise',
      xPercent: 20,
      yPercent: 62,
      definition: 'Headphones worn to block distractions and stay in flow.',
      contextualSentence: 'I put on my headphones to focus without distractions.',
      category: 'Audio',
      vietnameseMeaning: 'tai nghe chụp tai',
    },
    {
      name: 'Ceramic Mug',
      phonetic: '/səˈræm.ɪk mʌɡ/',
      actionChunk: 'sip warm coffee',
      xPercent: 79,
      yPercent: 55,
      definition: 'A warm coffee mug keeping energy steady during study blocks.',
      contextualSentence: 'A warm mug of coffee keeps me focused.',
      category: 'Beverage',
      vietnameseMeaning: 'cốc cà phê sứ',
    },
    {
      name: 'Notebook',
      phonetic: '/ˈnəʊt.bʊk/',
      actionChunk: 'sketch API notes',
      xPercent: 79,
      yPercent: 79,
      definition: 'A ruled notebook for sketching API flows and tasks.',
      contextualSentence: 'I sketch authentication logic in my notebook first.',
      category: 'Stationery',
      vietnameseMeaning: 'sổ tay ghi chép',
    },
    {
      name: 'Keyboard',
      phonetic: '/ˈkiː.bɔːd/',
      actionChunk: 'write clean code',
      xPercent: 47,
      yPercent: 76,
      definition: 'A tactile keyboard used for writing code comfortably.',
      contextualSentence: 'I use this keyboard to write my project code.',
      category: 'Peripherals',
      vietnameseMeaning: 'bàn phím rời',
    },
  ],
  suggestedExpressions: [
    {
      phrase: 'build a login page',
      meaning: 'create the sign-in screen and authentication flow of an app',
      example: "I'm building a login page for my university project.",
      vietnameseMeaning: 'xây dựng trang đăng nhập',
    },
    {
      phrase: 'sign in securely',
      meaning: 'log into an account with proper token and password protection',
      example: 'Students need to sign in securely to view their courses.',
      vietnameseMeaning: 'đăng nhập an toàn',
    },
    {
      phrase: 'check the API response',
      meaning: 'inspect data or error codes returned from the backend server',
      example: 'Maybe the token expired—I should check the API response first.',
      vietnameseMeaning: 'kiểm tra phản hồi từ API',
    },
  ],
  isSample: true,
};

export function createThinkDirectApp() {
  const app = express();
  app.use(express.json({ limit: '30mb' }));

  // Healthcheck & Capability Probe
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      hasApiKey: Boolean(apiKey),
      models: {
        vision: VISION_MODEL,
        stt: STT_MODEL,
        coach: COACH_MODEL,
        tts: TTS_MODEL,
      },
      timestamp: Date.now(),
    });
  });

  // 1. Scene Understanding — Gemini Vision
  app.post('/api/analyze-scene', async (req: Request, res: Response): Promise<void> => {
    try {
      const { imageBase64, mimeType = 'image/jpeg', isSample } = req.body || {};

      if (isSample || !ai || !imageBase64) {
        res.json({
          ...DEFAULT_STUDY_SCENE,
          isSample: Boolean(isSample || !ai),
          usedFallback: !isSample && !ai,
        });
        return;
      }

      const { base64, cleanMimeType } = stripDataUrlPrefix(imageBase64, mimeType);

      const systemPrompt = `You are the Scene Analyzer in ThinkDirect, an English thinking & speaking trainer for Vietnamese learners (A2-B1 level).
Analyze the provided photograph:
1. Identify 4 prominent, visible everyday objects a learner can point to and name aloud ("Label Anything"). For each object, include:
   - "xPercent" (18 to 82) and "yPercent" (16 to 80) estimating the center of that object in the image so its floating label sits right on the object.
   - "actionChunk": a short 2-4 word everyday verb+noun collocation (e.g. "sip hot coffee", "jot down notes", "type on laptop").
   - "contextualSentence": a natural, spoken first-person sentence (6-11 words, e.g. "I'm drinking hot coffee at my desk.").
2. Provide 3 natural spoken English expressions grounded in this scene.
3. Provide a short 2-5 word starter sentence ("initialSuggestedThought", e.g. "I'm coding.", "I'm having coffee.", "I'm reading my notes.") that a learner can expand step by step.
4. Choose "5W1H" (for actions/activities) or "IDEA_REASON_EXAMPLE" (for preferences/choices).
5. Include concise Vietnamese meanings for optional vocabulary check.`;

      const response = await withTimeout(
        ai.models.generateContent({
          model: VISION_MODEL,
          contents: {
            parts: [
              { inlineData: { mimeType: cleanMimeType, data: base64 } },
              {
                text: 'Analyze this real scene and return structured JSON matching the schema.',
              },
            ],
          },
          config: {
            systemInstruction: systemPrompt,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                openingQuestion: { type: Type.STRING },
                initialSuggestedThought: { type: Type.STRING },
                suggestedFramework: { type: Type.STRING },
                objects: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      phonetic: { type: Type.STRING },
                      actionChunk: { type: Type.STRING },
                      xPercent: { type: Type.NUMBER },
                      yPercent: { type: Type.NUMBER },
                      definition: { type: Type.STRING },
                      contextualSentence: { type: Type.STRING },
                      category: { type: Type.STRING },
                      vietnameseMeaning: { type: Type.STRING },
                    },
                    required: [
                      'name',
                      'actionChunk',
                      'xPercent',
                      'yPercent',
                      'definition',
                      'contextualSentence',
                    ],
                  },
                },
                suggestedExpressions: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      phrase: { type: Type.STRING },
                      meaning: { type: Type.STRING },
                      example: { type: Type.STRING },
                      vietnameseMeaning: { type: Type.STRING },
                    },
                    required: ['phrase', 'meaning', 'example'],
                  },
                },
              },
              required: [
                'title',
                'description',
                'openingQuestion',
                'initialSuggestedThought',
                'suggestedFramework',
                'objects',
                'suggestedExpressions',
              ],
            },
          },
        }),
        16000
      );

      const responseText = response.text;
      if (!responseText) throw new Error('Empty Gemini Vision response');
      const parsedData = JSON.parse(responseText);
      res.json({
        ...parsedData,
        suggestedFramework:
          parsedData.suggestedFramework === 'IDEA_REASON_EXAMPLE'
            ? 'IDEA_REASON_EXAMPLE'
            : '5W1H',
        isSample: false,
        usedFallback: false,
      });
    } catch (err: unknown) {
      console.warn('[ThinkDirect] Vision fallback used:', err);
      res.json({
        ...DEFAULT_STUDY_SCENE,
        usedFallback: true,
      });
    }
  });

  // 2. Recorded Audio Speech-to-Text — Multimodal Gemini Audio Transcription
  app.post('/api/transcribe-audio', async (req: Request, res: Response): Promise<void> => {
    try {
      const { audioBase64, mimeType = 'audio/webm' } = req.body || {};

      if (!audioBase64) {
        res.status(400).json({ error: 'Audio data is required' });
        return;
      }

      if (!ai) {
        res.json({ transcript: '', hasApiKey: false });
        return;
      }

      const { base64, cleanMimeType } = stripDataUrlPrefix(audioBase64, mimeType);

      const response = await withTimeout(
        ai.models.generateContent({
          model: STT_MODEL,
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType: cleanMimeType,
                  data: base64,
                },
              },
              {
                text: 'Transcribe this spoken English audio accurately. Return ONLY the plain spoken English words without commentary or quotation marks. If completely silent, return an empty string.',
              },
            ],
          },
          config: {
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          },
        }),
        16000
      );

      const transcript = (response.text || '').trim().replace(/^["']|["']$/g, '');
      res.json({ transcript, hasApiKey: true });
    } catch (err: unknown) {
      console.warn('[ThinkDirect] Audio transcription fallback:', err);
      res.json({ transcript: '', error: 'transcription_failed' });
    }
  });

  // 3. Speaking Method Engine — Deterministic SLA Guardrails + Gemini Coaching
  app.post('/api/coach-step', async (req: Request, res: Response): Promise<void> => {
    const {
      stage = 'EXPANSION',
      sceneContext = 'University Study Workspace',
      previousSentences = [],
      latestTranscript = '',
      stepNumber = 1,
      questionKey = 'Why',
      priorTurnAnswer = '',
      hintsUsed = false,
    } = req.body || {};

    // Deterministic Stage Pre-Checks (0ms latency, catches repetition & empty utterances reliably)
    if (stage === 'IDEA_DEVELOPMENT') {
      const localIdea = evaluateIdeaDevelopmentAttempt(
        questionKey as IdeaQuestionKey,
        latestTranscript,
        priorTurnAnswer,
        sceneContext
      );
      if (!localIdea.isValid || !ai) {
        res.json({ ...localIdea, usedFallback: !ai });
        return;
      }
    } else if (stage === 'GUIDED_SELF_TALK') {
      const localSelfTalk = evaluateSelfTalkMonologue(latestTranscript);
      if (!localSelfTalk.isValid || !ai) {
        res.json({ ...localSelfTalk, usedFallback: !ai });
        return;
      }
    } else if (stage === 'INDEPENDENT_RECALL') {
      const localRecall = evaluateIndependentRecall(
        latestTranscript,
        Boolean(hintsUsed),
        previousSentences
      );
      if (!localRecall.isValid || !ai) {
        res.json({ ...localRecall, usedFallback: !ai });
        return;
      }
    }

    const fallbackExpansion = analyzeExpansionStep(
      latestTranscript,
      stepNumber,
      previousSentences,
      sceneContext
    );

    if (stage === 'EXPANSION' && (!fallbackExpansion.isValid || !ai)) {
      res.json({ ...fallbackExpansion, usedFallback: !ai });
      return;
    }

    if (!ai) {
      res.json({ ...fallbackExpansion, usedFallback: true });
      return;
    }

    try {
      const systemPrompt = `You are the Speaking Coach inside ThinkDirect, helping a Vietnamese learner (A2-B1) form independent thoughts in English.
Rules:
1. Evaluate semantic idea development, NOT strict grammar nitpicking.
2. Reject mere repetition (e.g. "I'm coding" -> "im coding" is NOT expansion).
3. Ground feedback and the next prompt directly in the learner's own nouns/verbs and "${sceneContext}".
4. Provide 3 progressive English hints (L1 direction, L2 starter, L3 example) and 1 concise Vietnamese rescue hint.`;

      const response = await withTimeout(
        ai.models.generateContent({
          model: COACH_MODEL,
          contents: `Stage: ${stage} (step ${stepNumber}, questionKey=${questionKey}).
Scene: "${sceneContext}".
Previous learner thoughts: ${JSON.stringify(previousSentences)}.
Prior turn answer: "${priorTurnAnswer}".
Latest learner utterance: "${latestTranscript}".
Return structured SLA coaching JSON.`,
          config: {
            systemInstruction: systemPrompt,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                isValid: { type: Type.BOOLEAN },
                isUnderstandable: { type: Type.BOOLEAN },
                isAlreadyComplete: { type: Type.BOOLEAN },
                isRelevant: { type: Type.BOOLEAN },
                outcome: { type: Type.STRING },
                feedback: { type: Type.STRING },
                synthesizedThought: { type: Type.STRING },
                nextPrompt: { type: Type.STRING },
                hintL1: { type: Type.STRING },
                hintL2: { type: Type.STRING },
                hintL3: { type: Type.STRING },
                vietnameseRescue: { type: Type.STRING },
                suggestedFramework: { type: Type.STRING },
              },
              required: [
                'isValid',
                'feedback',
                'synthesizedThought',
                'nextPrompt',
                'hintL1',
                'hintL2',
                'hintL3',
                'vietnameseRescue',
              ],
            },
          },
        }),
        12000
      );

      const parsed = JSON.parse(response.text || '{}');
      res.json({
        ...fallbackExpansion,
        ...parsed,
        usedFallback: false,
      });
    } catch (err: unknown) {
      console.warn('[ThinkDirect] Coach step fallback used:', err);
      res.json({ ...fallbackExpansion, usedFallback: true });
    }
  });

  // 4. End-of-Session Observable SLA Evaluator
  app.post('/api/evaluate-session', async (req: Request, res: Response): Promise<void> => {
    const {
      sceneTitle = 'University Study Workspace',
      initialThought = "I'm coding.",
      expansionSentences = [],
      developmentSentences = [],
      selfTalkTranscript = '',
      independentRecallTranscript = '',
      hintsUsedCount = 0,
      selfTalkDurationSeconds = 32,
      isDemoSession = false,
    } = req.body || {};

    const fallbackEvaluation = {
      strength:
        'You expanded a 2-word starter into connected reasons, problem-solving self-talk, and unassisted speech.',
      improvement:
        "Try linking your hypothesis and action with 'Since the token might have expired, I'll...'",
      independentExpressionsUsed: [
        'login page',
        'university project',
        'sign in securely',
        'check the API response',
      ],
      ideasExpressedCount: 5,
      suggestedNextPractice:
        'Capture another corner of your desk or coffee break and build 3 connected thoughts without hints.',
      naturalUpgrade: {
        learnerOriginal:
          independentRecallTranscript ||
          "Maybe the token has expired, so I'll check the API response first.",
        naturalPhrasing:
          'The token might have expired — let me check the API response first.',
        upgradedChunk: 'might have expired — let me...',
        whyItHelps:
          'Keeps your exact meaning while sounding smooth and natural aloud.',
      },
      isDemoSession,
      usedFallback: true,
    };

    if (!ai) {
      res.json(fallbackEvaluation);
      return;
    }

    try {
      const prompt = `Evaluate this completed ThinkDirect English thinking session (A2-B1 Vietnamese learner).
Scene: "${sceneTitle}"
First short sentence: "${initialThought}"
Sentence expansions: ${JSON.stringify(expansionSentences)}
Idea development (5W1H / Reason-Example): ${JSON.stringify(developmentSentences)}
Guided self-talk: "${selfTalkTranscript}"
Final unassisted independent speech: "${independentRecallTranscript}"
Hints used: ${hintsUsedCount}
Speaking duration: ${selfTalkDurationSeconds}s

Rules:
- Highlight 1 observable strength in how their thought grew from the first short sentence to independent speech.
- Give 1 concrete English thinking phrase or connector to try next time.
- Extract 2-4 multi-word English expressions they used naturally in final recall.
- Provide "naturalUpgrade": pick 1 sentence or clause the learner actually said ("learnerOriginal") and recast it into slightly more natural B1-B2 spoken English ("naturalPhrasing") keeping 100% of their original meaning, plus the key 2-5 word "upgradedChunk" and a 1-sentence "whyItHelps".
- Count distinct meaningful idea units expressed.
- Never invent opaque scores like "English Brain %".`;

      const response = await withTimeout(
        ai.models.generateContent({
          model: COACH_MODEL,
          contents: prompt,
          config: {
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                strength: { type: Type.STRING },
                improvement: { type: Type.STRING },
                independentExpressionsUsed: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                ideasExpressedCount: { type: Type.INTEGER },
                suggestedNextPractice: { type: Type.STRING },
                naturalUpgrade: {
                  type: Type.OBJECT,
                  properties: {
                    learnerOriginal: { type: Type.STRING },
                    naturalPhrasing: { type: Type.STRING },
                    upgradedChunk: { type: Type.STRING },
                    whyItHelps: { type: Type.STRING },
                  },
                  required: [
                    'learnerOriginal',
                    'naturalPhrasing',
                    'upgradedChunk',
                    'whyItHelps',
                  ],
                },
              },
              required: [
                'strength',
                'improvement',
                'independentExpressionsUsed',
                'ideasExpressedCount',
                'suggestedNextPractice',
                'naturalUpgrade',
              ],
            },
          },
        }),
        14000
      );

      const parsed = JSON.parse(response.text || '{}');
      res.json({
        ...fallbackEvaluation,
        ...parsed,
        isDemoSession,
        usedFallback: false,
      });
    } catch (err: unknown) {
      console.warn('[ThinkDirect] Session evaluation fallback used:', err);
      res.json(fallbackEvaluation);
    }
  });

  // 5. Text-To-Speech (TTS) fallback endpoint
  app.post('/api/tts', async (req: Request, res: Response): Promise<void> => {
    try {
      const { text } = req.body || {};
      if (!text) {
        res.status(400).json({ error: 'Text is required' });
        return;
      }
      if (!ai) {
        res.status(503).json({ error: 'TTS unavailable without GEMINI_API_KEY' });
        return;
      }

      const response = await withTimeout(
        ai.models.generateContent({
          model: TTS_MODEL,
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
        12000
      );

      const base64Audio =
        response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) throw new Error('No audio returned from TTS model');

      res.json({ audioBase64: base64Audio, mimeType: 'audio/wav' });
    } catch (err: unknown) {
      console.warn('[ThinkDirect] TTS fallback notice:', err);
      res.status(500).json({ error: 'Failed to generate speech' });
    }
  });

  // 6. Vietnamese Stuck-Moment Concept Bridge (Strictly NO full-sentence translation)
  app.post('/api/concept-bridge', async (req: Request, res: Response): Promise<void> => {
    const {
      vietnameseIdea = '',
      sceneContext = 'University Study Workspace',
    } = req.body || {};

    const fallback = resolveConceptBridgeFallback(vietnameseIdea, sceneContext);
    if (!ai || !vietnameseIdea.trim()) {
      res.json({ ...fallback, usedFallback: true });
      return;
    }

    try {
      const response = await withTimeout(
        ai.models.generateContent({
          model: COACH_MODEL,
          contents: `Vietnamese learner is thinking about "${sceneContext}" and got stuck on the Vietnamese concept: "${vietnameseIdea}".
CRITICAL SLA RULE: NEVER translate a full sentence for the learner.
Return ONLY:
1. englishChunk: a natural 2-5 word English verb/noun concept chunk.
2. contextAnchor: 1 short sentence grounding that chunk visually in "${sceneContext}".
3. selfBuildPrompt: an incomplete English frame with "___" inviting the learner to build their own sentence.`,
          config: {
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                englishChunk: { type: Type.STRING },
                contextAnchor: { type: Type.STRING },
                selfBuildPrompt: { type: Type.STRING },
              },
              required: ['englishChunk', 'contextAnchor', 'selfBuildPrompt'],
            },
          },
        }),
        8000
      );

      const parsed = JSON.parse(response.text || '{}');
      res.json({
        vietnameseIdea: vietnameseIdea.trim(),
        englishChunk: parsed.englishChunk || fallback.englishChunk,
        contextAnchor: parsed.contextAnchor || fallback.contextAnchor,
        selfBuildPrompt: parsed.selfBuildPrompt || fallback.selfBuildPrompt,
        usedFallback: false,
      });
    } catch (err: unknown) {
      console.warn('[ThinkDirect] Concept bridge fallback used:', err);
      res.json({ ...fallback, usedFallback: true });
    }
  });

  return app;
}

async function startServer() {
  const app = createThinkDirectApp();
  const PORT = parseInt(process.env.PORT || '3000', 10);

  if (process.env.NODE_ENV !== 'production') {
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

  app.listen(PORT, () => {
    console.log(
      `[ThinkDirect] Server running on http://localhost:${PORT} (Gemini API key: ${
        apiKey ? 'configured' : 'guided-fallback mode'
      })`
    );
  });
}

// Only start listening when executed directly (not when imported by unit tests)
if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  startServer().catch((err) => {
    console.error('[ThinkDirect] Fatal server error:', err);
    process.exit(1);
  });
}
