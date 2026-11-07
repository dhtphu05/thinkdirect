import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import { ENV_CONFIG } from '../config/env.ts';
import { withTimeout, safeParseJson } from '../utils/mediaUtils.ts';
import {
  analyzeExpansionStep,
  evaluateIdeaDevelopmentAttempt,
  evaluateSelfTalkMonologue,
  evaluateIndependentRecall,
  evaluateTransferAttempt,
  resolveConceptBridgeFallback,
  buildNaturalUpgrade,
} from '../../src/services/speakingEngine.ts';
import {
  IdeaQuestionKey,
  NaturalPhrasingUpgrade,
} from '../../src/types.ts';

export interface CoachStepInput {
  ai: GoogleGenAI;
  stage:
    | 'EXPANSION'
    | 'IDEA_DEVELOPMENT'
    | 'GUIDED_SELF_TALK'
    | 'INDEPENDENT_RECALL'
    | 'TRANSFER_CHALLENGE';
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
  const prevThought =
    previousSentences[previousSentences.length - 1] || '';

  // Fast 0ms guardrails for completely empty or exact-duplicate utterances
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
    if (!cleanTranscript || localIdea.outcome.startsWith('REPEATED_')) {
      return { ...localIdea, usedFallback: false };
    }
  } else if (stage === 'GUIDED_SELF_TALK' && !beatStep) {
    const localSelf = evaluateSelfTalkMonologue(cleanTranscript);
    if (!cleanTranscript || cleanTranscript.split(/\s+/).length < 4) {
      return { ...localSelf, usedFallback: false };
    }
  } else if (stage === 'INDEPENDENT_RECALL') {
    const localRecall = evaluateIndependentRecall(
      cleanTranscript,
      hintsUsed,
      previousSentences
    );
    if (!cleanTranscript || cleanTranscript.split(/\s+/).length < 5) {
      return { ...localRecall, usedFallback: false };
    }
  } else if (stage === 'TRANSFER_CHALLENGE') {
    const localTransfer = evaluateTransferAttempt(cleanTranscript, sceneContext);
    if (!cleanTranscript || cleanTranscript.split(/\s+/).length < 5) {
      return { ...localTransfer, usedFallback: false };
    }
  }

  const objectsLine =
    sceneObjects.length > 0
      ? `Visible objects in this photo: ${sceneObjects.join(', ')}.`
      : '';

  const stageSpecificRules =
    stage === 'EXPANSION'
      ? `STAGE = Method 1: Sentence Expansion (Rung ${stepNumber} of ${totalSteps}).
- Previous accepted sentence: "${prevThought}"
- Learner's new spoken sentence: "${cleanTranscript}"
- Check if the learner kept their core idea AND added at least 1 new meaningful detail (where, what, who, when, or purpose). Accept minor A2-B1 grammar quirks if meaning grew!
- Reject if they only repeated "${prevThought}" without new detail, or spoke gibberish unrelated to human communication.
- "synthesizedThought": Keep the learner's own spoken sentence with clean capitalization & ending period (fix only tiny transcription typos while preserving their exact phrasing).
- If stepNumber < ${totalSteps}, also generate the NEXT rung preview extending THEIR "synthesizedThought":
  - "nextStepTitle": 2-4 words naming what to add next (e.g. "when or for whom", "purpose or reason").
  - "nextStepExample": short hint chunk (e.g. "e.g. with my family tonight").
  - "nextStepSample": MUST start with "synthesizedThought" (without period) + 1 natural 3-5 word chunk grounded in "${sceneContext}".`
      : stage === 'IDEA_DEVELOPMENT'
        ? `STAGE = Method 2: Idea Development (${questionKey}).
- Base expanded sentence from Method 1: "${previousSentences[0] || ''}"
- Prior turn answer: "${priorTurnAnswer}"
- Learner's spoken answer for "${questionKey}": "${cleanTranscript}"
- Accept if the learner genuinely answers "${questionKey}" with a meaningful English thought (do NOT nitpick minor grammar). Reject if it's just 1-2 words or repeats the prior turn.`
        : stage === 'GUIDED_SELF_TALK'
          ? beatStep
            ? `STAGE = Method 3: Guided Self-Talk (Beat ${beatStep} of 3: ${
                beatStep === 1
                  ? 'NOTICE what is happening'
                  : beatStep === 2
                    ? 'HYPOTHESIZE why / what might happen'
                    : 'DECIDE immediate next move'
              }).
- Scene: "${sceneContext}". Prior story: ${JSON.stringify(previousSentences)}.
- Learner's spoken beat: "${cleanTranscript}".
- Accept if it expresses a clear English thought fitting Beat ${beatStep} (at least 3-4 words).`
            : `STAGE = Method 3: Guided Self-Talk (Full 1-Take Monologue).
- Scene: "${sceneContext}". Prior story: ${JSON.stringify(previousSentences)}.
- Learner's monologue: "${cleanTranscript}".
- Accept if the learner connects at least 2 Solo-Reflex beats (noticing a situation/snag, reasoning/wondering why, or deciding their next action). Extract "connectorsFound" (e.g. "maybe", "so", "first", "should").`
          : `STAGE = Method 4: ${
              stage === 'TRANSFER_CHALLENGE'
                ? 'Unseen Scene Transfer Check'
                : 'Active Recall (Photo & Prompts Hidden)'
            }.
- Scene: "${sceneContext}".
- Learner's earlier story sentences: ${JSON.stringify(previousSentences)}.
- Learner's unassisted spoken recall: "${cleanTranscript}".
- Accept ("isValid": true) if the learner spoke at least 2 connected English clauses/sentences expressing what is happening + why/context or next action in their own words.
- Populate "ideasIdentified" (2-4 short labels like "Activity & Context", "Purpose", "Problem-Solving Move"), "coverageScore" (0..100), "strength" (1 encouraging observable sentence), and "improvement" (1 specific coaching tip if short or incomplete).`;

  const response = await withTimeout(
    ai.models.generateContent({
      model: ENV_CONFIG.coachModel,
      contents: `Scene: "${sceneContext}". ${objectsLine}
${stageSpecificRules}`,
      config: {
        systemInstruction: `You are ThinkDirect's real-time SLA Speaking Coach for Vietnamese learners.
Evaluate semantic communication and thought expansion — NEVER reject valid speech over minor article/tense slips.
Ground all hints and Vietnamese rescue notes directly in "${sceneContext}" and the learner's own words.`,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isValid: { type: Type.BOOLEAN },
            outcome: { type: Type.STRING },
            feedback: { type: Type.STRING },
            synthesizedThought: { type: Type.STRING },
            nextPrompt: { type: Type.STRING },
            nextStepTitle: { type: Type.STRING },
            nextStepExample: { type: Type.STRING },
            nextStepSample: { type: Type.STRING },
            hintL1: { type: Type.STRING },
            hintL2: { type: Type.STRING },
            hintL3: { type: Type.STRING },
            vietnameseRescue: { type: Type.STRING },
            connectorsFound: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            coverageScore: { type: Type.INTEGER },
            ideasIdentified: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            strength: { type: Type.STRING },
            improvement: { type: Type.STRING },
          },
          required: [
            'isValid',
            'feedback',
            'hintL1',
            'hintL2',
            'hintL3',
            'vietnameseRescue',
          ],
        },
      },
    }),
    14000
  );

  const parsed = safeParseJson<Record<string, unknown>>(response.text, {});
  const formattedClean = /[.!?]$/.test(cleanTranscript)
    ? cleanTranscript.charAt(0).toUpperCase() + cleanTranscript.slice(1)
    : `${cleanTranscript.charAt(0).toUpperCase()}${cleanTranscript.slice(1)}.`;

  return {
    isValid: Boolean(parsed.isValid),
    outcome:
      (parsed.outcome as string) ||
      (parsed.isValid ? 'VALID_EXPANSION' : 'UNCLEAR'),
    feedback:
      (parsed.feedback as string) ||
      (parsed.isValid
        ? 'Great job expressing that thought clearly!'
        : 'Try adding one more concrete detail in English.'),
    synthesizedThought:
      (parsed.synthesizedThought as string)?.trim() || formattedClean,
    nextPrompt: (parsed.nextPrompt as string) || '',
    nextStepTitle: (parsed.nextStepTitle as string) || undefined,
    nextStepExample: (parsed.nextStepExample as string) || undefined,
    nextStepSample: (parsed.nextStepSample as string) || undefined,
    addedWords: cleanTranscript
      .toLowerCase()
      .split(/\s+/)
      .filter(
        (w) => w.length > 2 && !prevThought.toLowerCase().includes(w)
      )
      .slice(0, 6),
    hintL1:
      (parsed.hintL1 as string) ||
      'Add one specific detail from what is around you.',
    hintL2: (parsed.hintL2 as string) || 'Try connecting with because, so, or first...',
    hintL3: (parsed.hintL3 as string) || formattedClean,
    vietnameseRescue:
      (parsed.vietnameseRescue as string) ||
      'Gợi ý: Hãy nói thêm 1 chi tiết cụ thể gắn với khung cảnh trước mắt bạn.',
    connectorsFound: Array.isArray(parsed.connectorsFound)
      ? parsed.connectorsFound
      : [],
    coverageScore:
      typeof parsed.coverageScore === 'number' ? parsed.coverageScore : 85,
    ideasIdentified:
      Array.isArray(parsed.ideasIdentified) && parsed.ideasIdentified.length > 0
        ? parsed.ideasIdentified
        : ['Core Activity', 'Personal Context', 'Next Move'],
    strength:
      (parsed.strength as string) ||
      (parsed.feedback as string) ||
      'You expressed your ideas clearly in your own words.',
    improvement:
      (parsed.improvement as string) ||
      (parsed.feedback as string) ||
      'Connect your activity, why it matters, and what you will do next.',
    usedFallback: false,
  };
}

export async function bridgeVietnameseConcept(
  ai: GoogleGenAI,
  vietnameseIdea: string,
  sceneContext: string
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

  const response = await withTimeout(
    ai.models.generateContent({
      model: ENV_CONFIG.coachModel,
      contents: `A Vietnamese learner is speaking about "${sceneContext}" and got stuck on the Vietnamese word/idea: "${cleanVi}".
CRITICAL SLA RULE: NEVER translate a full sentence for the learner.
Return ONLY:
1. "englishChunk": a natural 2-5 word spoken English collocation or noun/verb phrase for "${cleanVi}".
2. "contextAnchor": 1 short sentence showing how that chunk fits "${sceneContext}".
3. "selfBuildPrompt": an incomplete English starter frame with "___" so the learner builds their own sentence.`,
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
    10000
  );

  const parsed = safeParseJson<Record<string, string>>(response.text, {});
  return {
    vietnameseIdea: cleanVi,
    englishChunk: parsed.englishChunk || fallback.englishChunk,
    contextAnchor: parsed.contextAnchor || fallback.contextAnchor,
    selfBuildPrompt: parsed.selfBuildPrompt || fallback.selfBuildPrompt,
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
  const prompt = `Evaluate this real completed ThinkDirect English speaking session (Vietnamese learner).
Scene / Use-case: "${sceneTitle}"
Starting seed: "${initialThought}"
Method 1 (Sentence expansions): ${JSON.stringify(expansionSentences)}
Method 2 (5W1H / P.R.E answers): ${JSON.stringify(developmentSentences)}
Method 3 (Guided self-talk): "${selfTalkTranscript}"
Method 4 (Unassisted active recall): "${independentRecallTranscript}"
Hints used: ${hintsUsedCount}
Total speaking duration: ${selfTalkDurationSeconds}s

Rules:
1. "strength": Highlight 1 concrete observable win in how their own thought grew from "${initialThought}" to "${independentRecallTranscript}".
2. "improvement": Suggest 1 practical spoken connector or phrasing habit for their next real-life moment.
3. "independentExpressionsUsed": Extract 2-4 natural multi-word English phrases the learner actually used.
4. "naturalUpgrade": Pick 1 actual clause/sentence the learner spoke ("learnerOriginal") and recast it into natural, idiomatic B1-B2 spoken English ("naturalPhrasing") preserving 100% of their meaning, plus the key 2-5 word "upgradedChunk" and 1-sentence "whyItHelps".
5. "ideasExpressedCount": Count distinct meaningful ideas expressed across final recall.
6. "suggestedNextPractice": Suggest a realistic related photo or real-world moment to capture next.`;

  const response = await withTimeout(
    ai.models.generateContent({
      model: ENV_CONFIG.coachModel,
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
    16000
  );

  const fallbackUpgrade = buildNaturalUpgrade({
    initialThought,
    expandedThought: expansionSentences[expansionSentences.length - 1],
    selfTalkMonologue: selfTalkTranscript,
    independentRecall: independentRecallTranscript,
    sceneTitle,
  });

  const parsed = safeParseJson<Record<string, unknown>>(response.text, {});
  return {
    strength:
      (parsed.strength as string) ||
      `You grew "${initialThought}" into confident, unassisted speech about "${sceneTitle}".`,
    improvement:
      (parsed.improvement as string) ||
      'Try linking your reason and next move smoothly with "Since..., first I\'ll..."',
    independentExpressionsUsed: Array.isArray(parsed.independentExpressionsUsed)
      ? (parsed.independentExpressionsUsed as string[])
      : [],
    ideasExpressedCount:
      typeof parsed.ideasExpressedCount === 'number'
        ? parsed.ideasExpressedCount
        : 5,
    suggestedNextPractice:
      (parsed.suggestedNextPractice as string) ||
      'Capture another everyday moment around you and run a 4-step speaking workout.',
    naturalUpgrade:
      (parsed.naturalUpgrade as NaturalPhrasingUpgrade) || fallbackUpgrade,
    isDemoSession: false,
    usedFallback: false,
  };
}
