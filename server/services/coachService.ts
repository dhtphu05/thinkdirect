import { GoogleGenAI } from '@google/genai';
import { ENV_CONFIG } from '../config/env.ts';
import { withTimeout, safeParseJson } from '../utils/mediaUtils.ts';
import {
  buildThinkingConfig,
  withGeminiRetry,
} from './geminiClientService.ts';
import {
  CoachStageType,
  buildCoachSystemInstruction,
  buildCoachUserPrompt,
  getCoachSchemaForStage,
} from '../prompts/coachPrompts.ts';
import {
  CONCEPT_BRIDGE_SCHEMA,
  SESSION_EVAL_SCHEMA,
  buildConceptBridgePrompt,
  buildSessionEvaluationPrompt,
} from '../prompts/bridgeAndSessionPrompts.ts';
import {
  analyzeExpansionStep,
  evaluateIdeaDevelopmentAttempt,
  evaluateSelfTalkMonologue,
  evaluateIndependentRecall,
  evaluateTransferAttempt,
  resolveConceptBridgeFallback,
  buildNaturalUpgrade,
  extractContentWords,
} from '../../src/services/speakingEngine.ts';
import {
  IdeaQuestionKey,
  NaturalPhrasingUpgrade,
} from '../../src/types.ts';

export interface CoachStepInput {
  ai: GoogleGenAI;
  stage: CoachStageType;
  sceneContext: string;
  sceneObjects?: string[];
  previousSentences?: string[];
  latestTranscript: string;
  stepNumber?: number;
  totalSteps?: number;
  questionKey?: IdeaQuestionKey;
  priorTurnAnswer?: string;
  beatStep?: number;
  hintsUsed?: boolean;
}

function formatSpokenSentence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return '';
  const capitalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  return /[.!?]$/.test(capitalized) ? capitalized : `${capitalized}.`;
}

function ensureDynamicNextSamplePrefix(
  synthesizedThought: string,
  candidateNextSample?: string
): string | undefined {
  const rawNext = (candidateNextSample || '').trim();
  if (!rawNext) return undefined;

  const base = synthesizedThought.trim().replace(/[.!?]+$/, '').trim();
  if (!base) return formatSpokenSentence(rawNext);

  if (rawNext.toLowerCase().startsWith(base.toLowerCase())) {
    return formatSpokenSentence(rawNext);
  }

  return undefined;
}

export async function evaluateSpeakingStep({
  ai,
  stage,
  sceneContext,
  sceneObjects = [],
  previousSentences = [],
  latestTranscript,
  stepNumber = 1,
  totalSteps = 3,
  questionKey = 'Why',
  priorTurnAnswer = '',
  beatStep,
  hintsUsed = false,
}: CoachStepInput): Promise<Record<string, unknown>> {
  const cleanTranscript = (latestTranscript || '').trim();
  const wordCount = cleanTranscript.split(/\s+/).filter(Boolean).length;
  const prevThought = previousSentences[previousSentences.length - 1] || '';

  // Fast 0ms guardrails ONLY for empty utterances or exact repetitions
  if (stage === 'EXPANSION') {
    const localExp = analyzeExpansionStep(
      cleanTranscript,
      stepNumber,
      previousSentences,
      sceneContext
    );
    if (!cleanTranscript || localExp.outcome === 'REPEAT') {
      return { ...localExp, usedFallback: false };
    }
  } else if (stage === 'IDEA_DEVELOPMENT') {
    const localIdea = evaluateIdeaDevelopmentAttempt(
      questionKey,
      cleanTranscript,
      priorTurnAnswer,
      sceneContext
    );
    if (
      wordCount < 2 ||
      localIdea.outcome === 'REPEATED_WHY_AS_HOW' ||
      localIdea.outcome === 'REPEATED_REASON_AS_EXAMPLE'
    ) {
      return { ...localIdea, usedFallback: false };
    }
  } else if (stage === 'GUIDED_SELF_TALK') {
    if (beatStep) {
      if (wordCount < 2) {
        return {
          isValid: false,
          feedback: `Say one short English sentence for Beat ${beatStep}.`,
          connectorsFound: [],
          hintL1: `Share one clear thought about "${sceneContext}".`,
          hintL2:
            beatStep === 1
              ? 'Start with: Right now,...'
              : beatStep === 2
                ? 'Start with: Maybe...'
                : "Start with: First, I'll...",
          hintL3: "First, I'll check the most important detail carefully.",
          vietnameseRescue:
            'Gợi ý: Hãy nói ít nhất 1 cụm hoặc câu ngắn bằng tiếng Anh cho nhịp này.',
          usedFallback: false,
        };
      }
    } else if (wordCount < 4) {
      const localSelf = evaluateSelfTalkMonologue(cleanTranscript);
      return { ...localSelf, usedFallback: false };
    }
  } else if (stage === 'INDEPENDENT_RECALL') {
    if (wordCount < 5) {
      const localRecall = evaluateIndependentRecall(
        cleanTranscript,
        hintsUsed,
        previousSentences
      );
      return { ...localRecall, usedFallback: false };
    }
  } else if (stage === 'TRANSFER_CHALLENGE') {
    if (wordCount < 5) {
      const localTransfer = evaluateTransferAttempt(
        cleanTranscript,
        sceneContext
      );
      return { ...localTransfer, usedFallback: false };
    }
  }

  const thinkingConfig = buildThinkingConfig(ENV_CONFIG.coachModel, 'instant');
  const userPrompt = buildCoachUserPrompt({
    stage,
    sceneContext,
    sceneObjects,
    previousSentences,
    latestTranscript: cleanTranscript,
    stepNumber,
    totalSteps,
    questionKey,
    priorTurnAnswer,
    beatStep,
  });

  const response = await withGeminiRetry(() =>
    withTimeout(
      ai.models.generateContent({
        model: ENV_CONFIG.coachModel,
        contents: userPrompt,
        config: {
          systemInstruction: buildCoachSystemInstruction(sceneContext),
          ...(thinkingConfig ? { thinkingConfig } : {}),
          responseMimeType: 'application/json',
          responseSchema: getCoachSchemaForStage(stage),
        },
      }),
      13000
    )
  );

  const parsed = safeParseJson<Record<string, unknown>>(response.text, {});
  const formattedClean = formatSpokenSentence(cleanTranscript);

  if (stage === 'INDEPENDENT_RECALL' || stage === 'TRANSFER_CHALLENGE') {
    const rawScore =
      typeof parsed.coverageScore === 'number' ? parsed.coverageScore : 80;
    const normalizedCoverage = Number(
      Math.min(1, Math.max(0.2, rawScore > 1 ? rawScore / 100 : rawScore)).toFixed(
        2
      )
    );
    const ideas =
      Array.isArray(parsed.ideasIdentified) && parsed.ideasIdentified.length > 0
        ? (parsed.ideasIdentified as string[]).slice(0, 4)
        : ['Activity & Context', 'Purpose & Reason', 'Next Move'];
    const isValid =
      typeof parsed.isValid === 'boolean' ? parsed.isValid : wordCount >= 10;

    return {
      isValid,
      coverageScore: normalizedCoverage,
      ideasIdentified: ideas,
      strength:
        (parsed.strength as string) ||
        'You connected your main ideas smoothly in your own words.',
      improvement:
        (parsed.improvement as string) ||
        'Link your reason and next move smoothly with "so first, I\'ll...".',
      feedback:
        (parsed.strength as string) ||
        (parsed.improvement as string) ||
        'Great unassisted recall!',
      usedFallback: false,
    };
  }

  const synthesizedThought =
    (parsed.synthesizedThought as string)?.trim() || formattedClean;
  const prevTokens = extractContentWords(prevThought);
  const newTokens = [...extractContentWords(cleanTranscript)].filter(
    (w) => !prevTokens.has(w)
  );

  return {
    isValid: Boolean(parsed.isValid),
    outcome:
      (parsed.outcome as string) ||
      (parsed.isValid ? 'VALID_EXPANSION' : 'UNCLEAR'),
    feedback:
      (parsed.feedback as string) ||
      (parsed.isValid
        ? 'Nice job expressing that thought clearly!'
        : `Add one concrete detail connected to "${sceneContext}".`),
    synthesizedThought,
    isAlreadyComplete: Boolean(parsed.isAlreadyComplete),
    nextPrompt: (parsed.nextPrompt as string) || '',
    nextStepTitle: (parsed.nextStepTitle as string) || undefined,
    nextStepExample: (parsed.nextStepExample as string) || undefined,
    nextStepSample: ensureDynamicNextSamplePrefix(
      synthesizedThought,
      parsed.nextStepSample as string | undefined
    ),
    addedWords: newTokens.slice(0, 6),
    hintL1:
      (parsed.hintL1 as string) ||
      `Add one specific detail from "${sceneContext}".`,
    hintL2:
      (parsed.hintL2 as string) ||
      'Try connecting with because, so, or first...',
    hintL3: (parsed.hintL3 as string) || formattedClean,
    vietnameseRescue:
      (parsed.vietnameseRescue as string) ||
      'Gợi ý: Hãy nói thêm 1 chi tiết cụ thể gắn với khung cảnh trước mắt bạn.',
    connectorsFound: Array.isArray(parsed.connectorsFound)
      ? parsed.connectorsFound
      : [],
    usedFallback: false,
  };
}

export interface BridgeConceptOptions {
  sceneObjects?: string[];
  currentStage?: string;
  currentThought?: string;
}

export async function bridgeVietnameseConcept(
  ai: GoogleGenAI,
  vietnameseIdea: string,
  sceneContext: string,
  options: BridgeConceptOptions = {}
): Promise<{
  vietnameseIdea: string;
  englishChunk: string;
  contextAnchor: string;
  selfBuildPrompt: string;
  usedFallback: boolean;
}> {
  const cleanVi = vietnameseIdea.trim();
  const fallback = resolveConceptBridgeFallback(cleanVi, sceneContext);
  if (!cleanVi) {
    return { ...fallback, usedFallback: true };
  }

  const thinkingConfig = buildThinkingConfig(ENV_CONFIG.coachModel, 'instant');
  const { systemInstruction, userPrompt } = buildConceptBridgePrompt({
    vietnameseIdea: cleanVi,
    sceneContext,
    sceneObjects: options.sceneObjects,
    currentStage: options.currentStage,
    currentThought: options.currentThought,
  });

  const response = await withGeminiRetry(() =>
    withTimeout(
      ai.models.generateContent({
        model: ENV_CONFIG.coachModel,
        contents: userPrompt,
        config: {
          systemInstruction,
          ...(thinkingConfig ? { thinkingConfig } : {}),
          responseMimeType: 'application/json',
          responseSchema: CONCEPT_BRIDGE_SCHEMA,
        },
      }),
      10000
    )
  );

  const parsed = safeParseJson<Record<string, string>>(response.text, {});
  const rawChunk = (parsed.englishChunk || '')
    .trim()
    .replace(/[.!?]+$/, '')
    .trim();
  const rawSelfPrompt = (parsed.selfBuildPrompt || '').trim();

  return {
    vietnameseIdea: cleanVi,
    englishChunk: rawChunk || fallback.englishChunk,
    contextAnchor: parsed.contextAnchor?.trim() || fallback.contextAnchor,
    selfBuildPrompt:
      rawSelfPrompt && rawSelfPrompt.includes('___')
        ? rawSelfPrompt
        : fallback.selfBuildPrompt,
    usedFallback: false,
  };
}

export interface EvaluateSessionInput {
  ai: GoogleGenAI;
  sceneTitle: string;
  initialThought: string;
  expansionSentences: string[];
  developmentSentences: string[];
  selfTalkTranscript: string;
  independentRecallTranscript: string;
  hintsUsedCount: number;
  selfTalkDurationSeconds: number;
}

export async function evaluateCompletedSession({
  ai,
  sceneTitle,
  initialThought,
  expansionSentences,
  developmentSentences,
  selfTalkTranscript,
  independentRecallTranscript,
  hintsUsedCount,
  selfTalkDurationSeconds,
}: EvaluateSessionInput): Promise<{
  strength: string;
  improvement: string;
  independentExpressionsUsed: string[];
  ideasExpressedCount: number;
  suggestedNextPractice: string;
  naturalUpgrade: NaturalPhrasingUpgrade;
  isDemoSession: false;
  usedFallback: false;
}> {
  const thinkingConfig = buildThinkingConfig(ENV_CONFIG.coachModel, 'instant');
  const { systemInstruction, userPrompt } = buildSessionEvaluationPrompt({
    sceneTitle,
    initialThought,
    expansionSentences,
    developmentSentences,
    selfTalkTranscript,
    independentRecallTranscript,
    hintsUsedCount,
    selfTalkDurationSeconds,
  });

  const response = await withGeminiRetry(() =>
    withTimeout(
      ai.models.generateContent({
        model: ENV_CONFIG.coachModel,
        contents: userPrompt,
        config: {
          systemInstruction,
          ...(thinkingConfig ? { thinkingConfig } : {}),
          responseMimeType: 'application/json',
          responseSchema: SESSION_EVAL_SCHEMA,
        },
      }),
      16000
    )
  );

  const fallbackUpgrade = buildNaturalUpgrade({
    initialThought,
    expandedThought: expansionSentences[expansionSentences.length - 1],
    selfTalkMonologue: selfTalkTranscript,
    independentRecall: independentRecallTranscript,
    sceneTitle,
  });

  const parsed = safeParseJson<Record<string, unknown>>(response.text, {});
  const candidateUpgrade = parsed.naturalUpgrade as
    | NaturalPhrasingUpgrade
    | undefined;
  const hasValidUpgrade =
    Boolean(candidateUpgrade?.learnerOriginal?.trim()) &&
    Boolean(candidateUpgrade?.naturalPhrasing?.trim()) &&
    Boolean(candidateUpgrade?.upgradedChunk?.trim());

  return {
    strength:
      (parsed.strength as string) ||
      `You grew "${initialThought}" into confident, unassisted speech about "${sceneTitle}".`,
    improvement:
      (parsed.improvement as string) ||
      'Try linking your reason and next move smoothly with "Since..., first I\'ll..."',
    independentExpressionsUsed: Array.isArray(parsed.independentExpressionsUsed)
      ? (parsed.independentExpressionsUsed as string[]).slice(0, 4)
      : [],
    ideasExpressedCount:
      typeof parsed.ideasExpressedCount === 'number'
        ? parsed.ideasExpressedCount
        : 4,
    suggestedNextPractice:
      (parsed.suggestedNextPractice as string) ||
      'Capture another everyday moment around you and run a 4-step speaking workout.',
    naturalUpgrade: hasValidUpgrade ? candidateUpgrade! : fallbackUpgrade,
    isDemoSession: false,
    usedFallback: false,
  };
}
