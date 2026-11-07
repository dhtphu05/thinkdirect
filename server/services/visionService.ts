import { GoogleGenAI } from '@google/genai';
import { ENV_CONFIG } from '../config/env.ts';
import {
  stripDataUrlPrefix,
  withTimeout,
  safeParseJson,
} from '../utils/mediaUtils.ts';
import {
  buildThinkingConfig,
  withGeminiRetry,
} from './geminiClientService.ts';
import {
  buildVisionSceneSystemInstruction,
  buildUseCaseBlueprintSystemInstruction,
  VISION_SCENE_USER_PROMPT,
  VISION_SCENE_RESPONSE_SCHEMA,
  enforceAdditiveRungs,
} from '../prompts/visionPrompt.ts';
import {
  DetectedObject,
  ContextualExpression,
  ScenePracticeBlueprint,
  FrameworkType,
} from '../../src/types.ts';

export interface AnalyzeSceneInput {
  ai: GoogleGenAI;
  imageBase64: string;
  mimeType?: string;
  userGoal?: string;
  userLevel?: string;
}

export interface GenerateUseCaseInput {
  ai: GoogleGenAI;
  situation: string;
  userLevel?: string;
}

export interface AnalyzeSceneOutput {
  title: string;
  description: string;
  openingQuestion: string;
  initialSuggestedThought: string;
  suggestedFramework: FrameworkType;
  userGoal?: string;
  objects: DetectedObject[];
  suggestedExpressions: ContextualExpression[];
  practiceBlueprint: ScenePracticeBlueprint;
  isSample: false;
  usedFallback: false;
}

const DEFAULT_PIN_SLOTS = [
  { x: 30, y: 34 },
  { x: 70, y: 36 },
  { x: 28, y: 66 },
  { x: 72, y: 66 },
  { x: 50, y: 50 },
];

/**
 * Ensures floating object pins stay inside safe mobile bounds and do not collide.
 */
function normalizeObjectPins(rawObjects: DetectedObject[]): DetectedObject[] {
  const placed: { x: number; y: number }[] = [];

  return rawObjects.slice(0, 5).map((obj, idx) => {
    const slot = DEFAULT_PIN_SLOTS[idx % DEFAULT_PIN_SLOTS.length];
    let x =
      typeof obj.xPercent === 'number' && Number.isFinite(obj.xPercent)
        ? Math.min(80, Math.max(20, Math.round(obj.xPercent)))
        : slot.x;
    let y =
      typeof obj.yPercent === 'number' && Number.isFinite(obj.yPercent)
        ? Math.min(78, Math.max(18, Math.round(obj.yPercent)))
        : slot.y;

    for (const prev of placed) {
      const dist = Math.hypot(x - prev.x, y - prev.y);
      if (dist < 14) {
        x = Math.min(80, Math.max(20, x + (idx % 2 === 0 ? 15 : -15)));
        y = Math.min(78, Math.max(18, y + (idx < 2 ? -10 : 12)));
      }
    }

    placed.push({ x, y });
    return {
      ...obj,
      xPercent: x,
      yPercent: y,
    };
  });
}

function buildNormalizedSceneOutput(
  parsed: Partial<AnalyzeSceneOutput>,
  userGoal = ''
): AnalyzeSceneOutput {
  if (
    !parsed.title ||
    !Array.isArray(parsed.objects) ||
    parsed.objects.length === 0
  ) {
    throw new Error('Gemini returned an incomplete 5-method scene blueprint.');
  }

  const normalizedObjects = normalizeObjectPins(parsed.objects);
  const seedRaw = (parsed.initialSuggestedThought || "I'm right here.").trim();
  const seedWords = seedRaw.split(/\s+/).filter(Boolean);
  const cappedSeed =
    seedWords.length > 6
      ? `${seedWords.slice(0, 5).join(' ').replace(/[.!?]+$/, '')}.`
      : /[.!?]$/.test(seedRaw)
        ? seedRaw
        : `${seedRaw}.`;

  const additiveRungs = enforceAdditiveRungs(
    cappedSeed,
    parsed.practiceBlueprint?.expansionRungs || [],
    normalizedObjects[0]?.name || 'setup'
  );
  const rung2 = additiveRungs[1];
  const rung3 = additiveRungs[2];

  const rawSelfTalk = parsed.practiceBlueprint?.selfTalk;
  const beat1 =
    rawSelfTalk?.beat1Notice?.trim() ||
    'Something small here needs my attention right now.';
  const beat2 =
    rawSelfTalk?.beat2Hypothesize?.trim() ||
    'Maybe if I rush, I could miss an important detail.';
  const beat3 =
    rawSelfTalk?.beat3Decide?.trim() ||
    "First, I'll check the most important part carefully.";

  const blueprint: ScenePracticeBlueprint = {
    expansionRungs: additiveRungs,
    fiveWOneH: parsed.practiceBlueprint?.fiveWOneH || {
      whyPrompt: `Why does this moment in "${parsed.title}" matter right now?`,
      whySample: 'Because it helps me stay focused on what matters today.',
      howPrompt: 'How are you handling or approaching it?',
      howSample: "First, I'm taking it step by step with what's in front of me.",
    },
    preOpinion: parsed.practiceBlueprint?.preOpinion || {
      pointPrompt: `What is your personal preference about "${parsed.title}"?`,
      pointSample: 'I prefer keeping things simple and well-organized here.',
      reasonPrompt: 'Why do you feel that way?',
      reasonSample: 'Because it saves time and keeps my mind clear.',
      examplePrompt: 'Can you share a quick real-life example?',
      exampleSample: 'For example, today everything went much smoother this way.',
    },
    selfTalk: {
      situationPrompt:
        rawSelfTalk?.situationPrompt?.trim() ||
        `Look at "${parsed.title}". Notice one small snag or choice and talk yourself through your next move.`,
      beat1Notice: beat1,
      beat2Hypothesize: beat2,
      beat3Decide: beat3,
      fullMonologue:
        rawSelfTalk?.fullMonologue?.trim() || `${beat1} ${beat2} ${beat3}`,
    },
    recall: {
      prompt:
        parsed.practiceBlueprint?.recall?.prompt?.trim() ||
        `Without looking at the photo, describe "${parsed.title}", why it matters, any small snag, and what you'll do next.`,
      memoryCue:
        parsed.practiceBlueprint?.recall?.memoryCue?.trim() ||
        `1. ${parsed.title} · 2. Why it matters + small snag · 3. First move`,
      sampleSpeech:
        parsed.practiceBlueprint?.recall?.sampleSpeech?.trim() ||
        `${rung3.sampleSentence} ${beat2} ${beat3}`,
      sprintStep1Sample:
        parsed.practiceBlueprint?.recall?.sprintStep1Sample?.trim() ||
        `${rung2.sampleSentence.replace(/[.!?]+$/, '')} because it matters for my day.`,
      sprintStep2Sample:
        parsed.practiceBlueprint?.recall?.sprintStep2Sample?.trim() ||
        `${rung3.sampleSentence} ${beat2} ${beat3}`,
    },
    quickVietnameseBridgeChips:
      parsed.practiceBlueprint?.quickVietnameseBridgeChips &&
      parsed.practiceBlueprint.quickVietnameseBridgeChips.length > 0
        ? parsed.practiceBlueprint.quickVietnameseBridgeChips.slice(0, 4)
        : normalizedObjects
            .slice(0, 4)
            .map((o) => o.vietnameseMeaning || o.name.toLowerCase()),
  };

  return {
    title: parsed.title,
    description: parsed.description || `Real scene: ${parsed.title}`,
    openingQuestion:
      parsed.openingQuestion || 'What is happening right in front of you?',
    initialSuggestedThought: cappedSeed,
    suggestedFramework:
      parsed.suggestedFramework === 'IDEA_REASON_EXAMPLE'
        ? 'IDEA_REASON_EXAMPLE'
        : '5W1H',
    userGoal: userGoal.trim() || undefined,
    objects: normalizedObjects,
    suggestedExpressions: (parsed.suggestedExpressions || []).slice(0, 4),
    practiceBlueprint: blueprint,
    isSample: false,
    usedFallback: false,
  };
}

export async function analyzeScenePhoto({
  ai,
  imageBase64,
  mimeType = 'image/jpeg',
  userGoal = '',
}: AnalyzeSceneInput): Promise<AnalyzeSceneOutput> {
  const { base64, cleanMimeType } = stripDataUrlPrefix(
    imageBase64,
    mimeType || 'image/jpeg'
  );

  const systemInstruction = buildVisionSceneSystemInstruction(userGoal);
  const thinkingConfig = buildThinkingConfig(ENV_CONFIG.visionModel, 'balanced');

  const response = await withGeminiRetry(() =>
    withTimeout(
      ai.models.generateContent({
        model: ENV_CONFIG.visionModel,
        contents: {
          parts: [
            { inlineData: { mimeType: cleanMimeType, data: base64 } },
            { text: VISION_SCENE_USER_PROMPT },
          ],
        },
        config: {
          systemInstruction,
          ...(thinkingConfig ? { thinkingConfig } : {}),
          responseMimeType: 'application/json',
          responseSchema: VISION_SCENE_RESPONSE_SCHEMA,
        },
      }),
      26000
    )
  );

  const parsed = safeParseJson<Partial<AnalyzeSceneOutput>>(response.text, {});
  return buildNormalizedSceneOutput(parsed, userGoal);
}

export async function generateUseCaseScene({
  ai,
  situation,
}: GenerateUseCaseInput): Promise<AnalyzeSceneOutput> {
  const cleanSituation = situation.trim();
  const systemInstruction =
    buildUseCaseBlueprintSystemInstruction(cleanSituation);
  const thinkingConfig = buildThinkingConfig(ENV_CONFIG.coachModel, 'balanced');

  const response = await withGeminiRetry(() =>
    withTimeout(
      ai.models.generateContent({
        model: ENV_CONFIG.coachModel,
        contents: `Generate a complete 5-method ThinkDirect speaking blueprint JSON for this situation: "${cleanSituation}".`,
        config: {
          systemInstruction,
          ...(thinkingConfig ? { thinkingConfig } : {}),
          responseMimeType: 'application/json',
          responseSchema: VISION_SCENE_RESPONSE_SCHEMA,
        },
      }),
      20000
    )
  );

  const parsed = safeParseJson<Partial<AnalyzeSceneOutput>>(response.text, {});
  return buildNormalizedSceneOutput(parsed, cleanSituation);
}
