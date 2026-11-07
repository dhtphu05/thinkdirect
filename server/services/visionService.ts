import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import { ENV_CONFIG } from '../config/env.ts';
import {
  stripDataUrlPrefix,
  withTimeout,
  safeParseJson,
} from '../utils/mediaUtils.ts';
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

const SCENE_BLUEPRINT_RESPONSE_SCHEMA = {
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
          'vietnameseMeaning',
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
        required: ['phrase', 'meaning', 'example', 'vietnameseMeaning'],
      },
    },
    practiceBlueprint: {
      type: Type.OBJECT,
      properties: {
        expansionRungs: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              stepNum: { type: Type.INTEGER },
              focusCue: { type: Type.STRING },
              exampleChunk: { type: Type.STRING },
              sampleSentence: { type: Type.STRING },
            },
            required: [
              'stepNum',
              'focusCue',
              'exampleChunk',
              'sampleSentence',
            ],
          },
        },
        fiveWOneH: {
          type: Type.OBJECT,
          properties: {
            whyPrompt: { type: Type.STRING },
            whySample: { type: Type.STRING },
            howPrompt: { type: Type.STRING },
            howSample: { type: Type.STRING },
          },
          required: ['whyPrompt', 'whySample', 'howPrompt', 'howSample'],
        },
        preOpinion: {
          type: Type.OBJECT,
          properties: {
            pointPrompt: { type: Type.STRING },
            pointSample: { type: Type.STRING },
            reasonPrompt: { type: Type.STRING },
            reasonSample: { type: Type.STRING },
            examplePrompt: { type: Type.STRING },
            exampleSample: { type: Type.STRING },
          },
          required: [
            'pointPrompt',
            'pointSample',
            'reasonPrompt',
            'reasonSample',
            'examplePrompt',
            'exampleSample',
          ],
        },
        selfTalk: {
          type: Type.OBJECT,
          properties: {
            situationPrompt: { type: Type.STRING },
            beat1Notice: { type: Type.STRING },
            beat2Hypothesize: { type: Type.STRING },
            beat3Decide: { type: Type.STRING },
            fullMonologue: { type: Type.STRING },
          },
          required: [
            'situationPrompt',
            'beat1Notice',
            'beat2Hypothesize',
            'beat3Decide',
            'fullMonologue',
          ],
        },
        recall: {
          type: Type.OBJECT,
          properties: {
            prompt: { type: Type.STRING },
            sampleSpeech: { type: Type.STRING },
            sprintStep1Sample: { type: Type.STRING },
            sprintStep2Sample: { type: Type.STRING },
          },
          required: [
            'prompt',
            'sampleSpeech',
            'sprintStep1Sample',
            'sprintStep2Sample',
          ],
        },
        quickVietnameseBridgeChips: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
      },
      required: [
        'expansionRungs',
        'fiveWOneH',
        'preOpinion',
        'selfTalk',
        'recall',
        'quickVietnameseBridgeChips',
      ],
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
    'practiceBlueprint',
  ],
};

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

function finalizeSceneAnalysisOutput(
  parsed: Partial<AnalyzeSceneOutput>,
  userGoal = ''
): AnalyzeSceneOutput {
  if (
    !parsed.title ||
    !Array.isArray(parsed.objects) ||
    parsed.objects.length === 0
  ) {
    throw new Error('Gemini returned an incomplete scene analysis.');
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

  const rawRungs = parsed.practiceBlueprint?.expansionRungs || [];
  const seedBase = cappedSeed.replace(/[.!?]+$/, '');
  const rung1 = rawRungs[0] || {
    stepNum: 1 as const,
    focusCue: 'where or with what',
    exampleChunk: `e.g. with this ${normalizedObjects[0]?.name.toLowerCase() || 'setup'}`,
    sampleSentence: `${seedBase} right here.`,
  };
  const rung1Base = rung1.sampleSentence.replace(/[.!?]+$/, '');
  const rung2 = rawRungs[1] || {
    stepNum: 2 as const,
    focusCue: 'context or timing',
    exampleChunk: 'e.g. today...',
    sampleSentence: `${rung1Base} today.`,
  };
  const rung2Base = rung2.sampleSentence.replace(/[.!?]+$/, '');
  const rung3 = rawRungs[2] || {
    stepNum: 3 as const,
    focusCue: 'purpose or outcome',
    exampleChunk: 'e.g. so everything goes smoothly',
    sampleSentence: `${rung2Base} so everything goes smoothly.`,
  };

  const blueprint: ScenePracticeBlueprint = {
    expansionRungs: [
      { ...rung1, stepNum: 1 },
      { ...rung2, stepNum: 2 },
      { ...rung3, stepNum: 3 },
    ],
    fiveWOneH: parsed.practiceBlueprint?.fiveWOneH || {
      whyPrompt: `Why is this moment in "${parsed.title}" important to you?`,
      whySample: 'Because it helps me take care of my daily priorities.',
      howPrompt: 'How are you handling or approaching it right now?',
      howSample: "I'm taking it step by step using what's in front of me.",
    },
    preOpinion: parsed.practiceBlueprint?.preOpinion || {
      pointPrompt: `What is your personal preference or main view about "${parsed.title}"?`,
      pointSample: 'I prefer keeping things simple and organized here.',
      reasonPrompt: 'Why do you feel that way?',
      reasonSample: 'Because it saves time and keeps me relaxed.',
      examplePrompt: 'Can you share a quick real-life example?',
      exampleSample: 'For example, today everything went much faster this way.',
    },
    selfTalk: parsed.practiceBlueprint?.selfTalk || {
      situationPrompt: `Look at "${parsed.title}". Notice one small snag or choice and talk yourself through your next move.`,
      beat1Notice: 'Something small here needs my attention right now.',
      beat2Hypothesize: 'Maybe if I rush, I could miss an important detail.',
      beat3Decide: "First, I'll check the most important part carefully.",
      fullMonologue:
        "Something small here needs my attention right now. Maybe if I rush, I could miss an important detail. First, I'll check the most important part carefully.",
    },
    recall: parsed.practiceBlueprint?.recall || {
      prompt: `Without looking at any notes, describe "${parsed.title}", why it matters, any snag, and what you'll do next.`,
      sampleSpeech: `${rung3.sampleSentence} It matters to me today, so first I'll focus on the main step carefully.`,
      sprintStep1Sample: `${rung2.sampleSentence} because it matters for my day.`,
      sprintStep2Sample: `${rung3.sampleSentence} Maybe a small challenge could come up, so first I'll handle the main step carefully.`,
    },
    quickVietnameseBridgeChips:
      parsed.practiceBlueprint?.quickVietnameseBridgeChips?.slice(0, 4) ||
      normalizedObjects
        .slice(0, 3)
        .map((o) => o.vietnameseMeaning || o.name.toLowerCase()),
  };

  return {
    title: parsed.title,
    description: parsed.description || `Real scene: ${parsed.title}`,
    openingQuestion: parsed.openingQuestion || 'What is happening right here?',
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
  userLevel = 'B1',
}: AnalyzeSceneInput): Promise<AnalyzeSceneOutput> {
  const { base64, cleanMimeType } = stripDataUrlPrefix(
    imageBase64,
    mimeType || 'image/jpeg'
  );

  const goalInstruction = userGoal.trim()
    ? `IMPORTANT USER GOAL / USE-CASE: The learner specifically wants to practice this real-life situation with this photo: "${userGoal.trim()}". Ground the starter sentence, expressions, expansion rungs, 5W1H/P.R.E questions, and Self-Talk snag in BOTH the visible photo AND this use-case.`
    : `Infer the most natural, practical real-life activity or moment happening in this photo (e.g. cooking a meal, ordering at a café, commuting, shopping, studying, working at an office, exercising, traveling, relaxing at home, caring for a pet, etc.).`;

  const systemInstruction = `You are the Multimodal Scene & Speaking Curriculum Architect for ThinkDirect, an English thinking & speaking coach for Vietnamese learners (target level: ${userLevel}).
Analyze the uploaded real-world photograph and build a complete, authentic 5-method speaking blueprint grounded 100% in what is actually visible in THIS image.
${goalInstruction}

STRICT PEDAGOGICAL RULES:
1. Direct Labeling ("objects"): Identify 4 to 5 distinct, clearly visible objects in the photo.
   - Estimate accurate "xPercent" (20..80) and "yPercent" (18..78) for the visual center of each object.
   - "actionChunk": natural 2-4 word spoken verb+noun collocation (e.g. "stir the soup", "check boarding pass", "review the report").
   - "contextualSentence": natural first-person sentence (6-11 words).
   - Include IPA "phonetic" and concise "vietnameseMeaning".
2. "initialSuggestedThought": MUST be a short, natural 2-5 word first-person English starter seed (e.g. "I'm making dinner.", "I'm at the airport.", "I'm buying groceries.", "I'm reviewing my code."). NEVER exceed 5 words so the learner can expand it across 3 rungs.
3. Method 1 ("expansionRungs"): Build a 3-rung additive sentence staircase starting strictly from "initialSuggestedThought":
   - Rung 1 ("sampleSentence"): Repeats "initialSuggestedThought" (without period) + adds 2-4 words (what/where).
   - Rung 2 ("sampleSentence"): Repeats Rung 1 (without period) + adds 3-5 words (who/which/when).
   - Rung 3 ("sampleSentence"): Repeats Rung 2 (without period) + adds 3-5 words (purpose/reason/outcome).
   - Each rung MUST keep the exact prefix of the previous rung so the learner sees [previous sentence] + [new short chunk].
4. Method 2 ("fiveWOneH" & "preOpinion"):
   - "fiveWOneH": Ask 1 natural "Why" question and 1 practical "How" question directly about this scene/activity, with natural spoken sample answers.
   - "preOpinion": Provide Point, Reason, and Example prompts + spoken samples for expressing a personal preference or opinion related to this scene.
5. Method 3 ("selfTalk"): Create a realistic minor snag, choice, or problem that could happen right now in THIS exact scene (NEVER mention coding/tokens unless the photo actually shows code). Provide:
   - "situationPrompt": 1-2 sentences setting up the real-life snag/decision.
   - "beat1Notice" (Observe what's happening), "beat2Hypothesize" ("Maybe..." / "It might..."), "beat3Decide" ("First, I'll..." / "I should..."), and "fullMonologue" combining all 3 beats.
6. Method 4 ("recall"): Provide an unassisted Active Recall prompt + natural 3-sentence sampleSpeech, plus "sprintStep1Sample" and "sprintStep2Sample" for 90s Sprint mode.
7. "quickVietnameseBridgeChips": 3 realistic short Vietnamese concepts (2-4 words each) a Vietnamese learner might think of and get stuck on in THIS exact photo.`;

  const response = await withTimeout(
    ai.models.generateContent({
      model: ENV_CONFIG.visionModel,
      contents: {
        parts: [
          { inlineData: { mimeType: cleanMimeType, data: base64 } },
          {
            text: 'Analyze this real photo and generate the complete structured 5-method speaking blueprint JSON.',
          },
        ],
      },
      config: {
        systemInstruction,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: SCENE_BLUEPRINT_RESPONSE_SCHEMA,
      },
    }),
    24000
  );

  const parsed = safeParseJson<Partial<AnalyzeSceneOutput>>(response.text, {});
  return finalizeSceneAnalysisOutput(parsed, userGoal);
}

/**
 * Generates a complete 5-method speaking blueprint from ANY custom text situation/use-case
 * (Vietnamese or English) when the user practices without a camera.
 */
export async function generateUseCaseScene({
  ai,
  situation,
  userLevel = 'B1',
}: GenerateUseCaseInput): Promise<AnalyzeSceneOutput> {
  const cleanSituation = situation.trim();

  const systemInstruction = `You are the Speaking Curriculum Architect for ThinkDirect, an English thinking & speaking coach for Vietnamese learners (target level: ${userLevel}).
The learner wants to practice speaking English in this custom real-life situation / use-case (may be written in Vietnamese or English):
"${cleanSituation}"

Generate a complete, authentic 5-method English speaking blueprint tailored 100% to this exact situation:
1. "title": Clear, natural English title (3-6 words) for this situation.
2. "objects": 4 concrete objects, items, or key nouns present in this situation (with xPercent in 22..78, yPercent in 22..76, IPA phonetic, actionChunk, contextualSentence, and vietnameseMeaning).
3. "suggestedExpressions": 3 natural spoken English collocations/chunks (2-5 words) essential for this use-case.
4. "initialSuggestedThought": Short 2-5 word first-person English starter seed (e.g. "I'm checking into my hotel.", "I'm pitching our new product.").
5. "practiceBlueprint": Complete 3-rung additive expansion staircase (each rung starts with the previous rung's words), 5W1H, P.R.E opinion turns, a realistic 3-beat Self-Talk snag specific to "${cleanSituation}", Active Recall prompt, and 3 Vietnamese Concept Bridge chips.`;

  const response = await withTimeout(
    ai.models.generateContent({
      model: ENV_CONFIG.coachModel,
      contents: `Create the 5-method English speaking blueprint for: "${cleanSituation}"`,
      config: {
        systemInstruction,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: SCENE_BLUEPRINT_RESPONSE_SCHEMA,
      },
    }),
    20000
  );

  const parsed = safeParseJson<Partial<AnalyzeSceneOutput>>(response.text, {});
  return finalizeSceneAnalysisOutput(parsed, cleanSituation);
}
