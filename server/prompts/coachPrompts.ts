import { Schema, Type } from '@google/genai';
import { IdeaQuestionKey } from '../../src/types.ts';

export type CoachStageType =
  | 'EXPANSION'
  | 'IDEA_DEVELOPMENT'
  | 'GUIDED_SELF_TALK'
  | 'INDEPENDENT_RECALL'
  | 'TRANSFER_CHALLENGE';

export interface BuildCoachPromptParams {
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
}

export function buildCoachSystemInstruction(sceneContext: string): string {
  return `You are ThinkDirect's real-time SLA Speaking Coach for Vietnamese learners practicing direct English thinking around "${sceneContext}".

CORE PEDAGOGICAL & ASR-TOLERANCE PRINCIPLES:
1. MEANING OVER GRAMMAR PERFECTION: Reward genuine communicative thought growth. NEVER reject a valid English thought over minor article ("a/the"), plural ("-s"), tense, or preposition slips.
2. VIETNAMESE-ACCENT STT TOLERANCE: Spoken input comes from speech-to-text of Vietnamese learners. If a word is a clear phonetic near-miss of an object or concept in "${sceneContext}" (e.g. dropped final consonant like "build"/"bill", "slide"/"slight"), interpret charitably according to context.
3. ZERO GENERIC BOILERPLATE: Every feedback line, English hint, and "vietnameseRescue" MUST reference concrete details from "${sceneContext}" and the learner's own words — never mention coding/login/API unless "${sceneContext}" is actually about coding.
4. CONCISE SPOKEN REGISTER: Keep "feedback" crisp, warm, and encouraging (1 short sentence, max 18 words).`;
}

export const EXPANSION_COACH_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    isValid: { type: Type.BOOLEAN },
    outcome: { type: Type.STRING },
    feedback: { type: Type.STRING },
    synthesizedThought: { type: Type.STRING },
    isAlreadyComplete: { type: Type.BOOLEAN },
    nextStepTitle: { type: Type.STRING },
    nextStepExample: { type: Type.STRING },
    nextStepSample: { type: Type.STRING },
    hintL1: { type: Type.STRING },
    hintL2: { type: Type.STRING },
    hintL3: { type: Type.STRING },
    vietnameseRescue: { type: Type.STRING },
  },
  required: [
    'isValid',
    'outcome',
    'feedback',
    'synthesizedThought',
    'hintL1',
    'hintL2',
    'hintL3',
    'vietnameseRescue',
  ],
};

export const IDEA_COACH_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    isValid: { type: Type.BOOLEAN },
    outcome: { type: Type.STRING },
    feedback: { type: Type.STRING },
    nextPrompt: { type: Type.STRING },
    hintL1: { type: Type.STRING },
    hintL2: { type: Type.STRING },
    hintL3: { type: Type.STRING },
    vietnameseRescue: { type: Type.STRING },
  },
  required: [
    'isValid',
    'outcome',
    'feedback',
    'hintL1',
    'hintL2',
    'hintL3',
    'vietnameseRescue',
  ],
};

export const SELF_TALK_COACH_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    isValid: { type: Type.BOOLEAN },
    feedback: { type: Type.STRING },
    connectorsFound: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    hintL1: { type: Type.STRING },
    hintL2: { type: Type.STRING },
    hintL3: { type: Type.STRING },
    vietnameseRescue: { type: Type.STRING },
  },
  required: [
    'isValid',
    'feedback',
    'connectorsFound',
    'hintL1',
    'hintL2',
    'hintL3',
    'vietnameseRescue',
  ],
};

export const RECALL_COACH_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    isValid: { type: Type.BOOLEAN },
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
    'coverageScore',
    'ideasIdentified',
    'strength',
    'improvement',
  ],
};

export function getCoachSchemaForStage(stage: CoachStageType): Schema {
  switch (stage) {
    case 'EXPANSION':
      return EXPANSION_COACH_SCHEMA;
    case 'IDEA_DEVELOPMENT':
      return IDEA_COACH_SCHEMA;
    case 'GUIDED_SELF_TALK':
      return SELF_TALK_COACH_SCHEMA;
    case 'INDEPENDENT_RECALL':
    case 'TRANSFER_CHALLENGE':
      return RECALL_COACH_SCHEMA;
  }
}

export function buildCoachUserPrompt(params: BuildCoachPromptParams): string {
  const {
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
  } = params;

  const objectsContext =
    sceneObjects.length > 0
      ? `Visible objects in photo: ${sceneObjects.join(', ')}.`
      : '';
  const prevThought = previousSentences[previousSentences.length - 1] || '';

  if (stage === 'EXPANSION') {
    return `SCENE: "${sceneContext}". ${objectsContext}
METHOD 1 · SENTENCE EXPANSION (Rung ${stepNumber} of ${totalSteps})
- Previous sentence: "${prevThought}"
- Learner's new spoken attempt: "${latestTranscript}"

EVALUATION RULES:
1. Accept ("isValid": true, "outcome": "VALID_EXPANSION") if the learner kept their core idea (or naturally paraphrased it) AND added at least 1 new meaningful detail (what, where, with what, when, who, or purpose).
2. Reject ONLY if:
   - They merely repeated "${prevThought}" with zero new meaning ("outcome": "REPEAT"),
   - The utterance is completely unrelated gibberish ("outcome": "OFF_TOPIC" or "UNCLEAR").
3. "synthesizedThought": Keep the learner's own spoken sentence with clean capitalization and ending period. Gently fix obvious STT phonetic typos while preserving 100% of their personal phrasing.
4. "isAlreadyComplete": true ONLY if stepNumber >= ${totalSteps} OR their sentence already combines action + concrete object/place + timing/purpose (>= 11 words).
5. If "isValid" is true AND stepNumber < ${totalSteps}, generate a dynamic next-rung preview extending THEIR exact "synthesizedThought":
   - "nextStepTitle": 2-4 words naming what detail to add next (e.g. "when this happens", "purpose or benefit").
   - "nextStepExample": short spoken chunk hint (e.g. "e.g. before my morning meeting").
   - "nextStepSample": MUST start with "synthesizedThought" (without its final period) + 1 natural 2-5 word chunk grounded in "${sceneContext}".
6. Populate tiered hints ("hintL1" cue, "hintL2" starter frame, "hintL3" full natural example, and concise Vietnamese "vietnameseRescue") tailored to "${sceneContext}".`;
  }

  if (stage === 'IDEA_DEVELOPMENT') {
    const intentGuide: Record<IdeaQuestionKey, string> = {
      Why: 'expresses a genuine reason, purpose, goal, or benefit (valid even WITHOUT the word "because", e.g., "To finish my report on time" or "It keeps me focused")',
      How: 'describes a practical action, tool, routine, or method they use (e.g., "First I...", "By using...", "I take notes...")',
      Point: 'states a personal preference, opinion, or priority clearly',
      Reason: 'explains why they hold that preference or opinion',
      Example: 'shares a concrete real-life moment, time, or instance',
    };

    const validOutcomeMap: Record<IdeaQuestionKey, string> = {
      Why: 'VALID_WHY',
      How: 'VALID_HOW',
      Point: 'VALID_POINT',
      Reason: 'VALID_REASON',
      Example: 'VALID_EXAMPLE',
    };

    return `SCENE: "${sceneContext}". ${objectsContext}
METHOD 2 · IDEA DEVELOPMENT (Target turn: "${questionKey}")
- Learner's Method 1 sentence: "${previousSentences[0] || ''}"
- Prior turn answer: "${priorTurnAnswer}"
- Learner's spoken answer for "${questionKey}": "${latestTranscript}"

EVALUATION RULES:
1. Accept ("isValid": true, "outcome": "${validOutcomeMap[questionKey]}") if the utterance ${intentGuide[questionKey]} in at least 3 meaningful English words. Do NOT require stiff textbook connectors if the meaning answers "${questionKey}" naturally!
2. If "${questionKey}" is "How" and the learner merely repeated their "Why" reason without describing how, set "isValid": false and "outcome": "REPEATED_WHY_AS_HOW".
3. If "${questionKey}" is "Example" and the learner merely repeated their general reason without a concrete example, set "isValid": false and "outcome": "REPEATED_REASON_AS_EXAMPLE".
4. Otherwise if off-intent or fragmentary, set "isValid": false and "outcome": "INVALID_INTENT".
5. Provide warm, specific "feedback" + scene-grounded "hintL1", "hintL2", "hintL3", and "vietnameseRescue".`;
  }

  if (stage === 'GUIDED_SELF_TALK') {
    if (beatStep) {
      const beatRole =
        beatStep === 1
          ? 'Beat 1 (NOTICE): Observe what is happening or a small snag right now'
          : beatStep === 2
            ? 'Beat 2 (HYPOTHESIZE): Wonder why or what might happen ("Maybe...", "It might...", "If...")'
            : 'Beat 3 (DECIDE): Commit to an immediate next action ("First, I\'ll...", "I should...", "Let me...")';

      return `SCENE: "${sceneContext}". ${objectsContext}
METHOD 3 · GUIDED SELF-TALK — ${beatRole}
- Story built so far: ${JSON.stringify(previousSentences)}
- Learner's spoken Beat ${beatStep}: "${latestTranscript}"

EVALUATION RULES:
1. Accept ("isValid": true) if the learner expressed a clear spoken English thought (at least 3-4 words) that fits ${beatRole}, even if phrased casually without exact template words.
2. Extract spoken thinking markers into "connectorsFound" (e.g. "right now", "maybe", "might", "first", "I'll", "so").
3. Keep "feedback" brisk (1 short sentence) and ground "hintL1..L3" + "vietnameseRescue" in "${sceneContext}".`;
    }

    return `SCENE: "${sceneContext}". ${objectsContext}
METHOD 3 · GUIDED SELF-TALK (1-Take Solo-Reflex Monologue)
- Learner's earlier story: ${JSON.stringify(previousSentences)}
- Learner's spoken monologue: "${latestTranscript}"

EVALUATION RULES:
1. Accept ("isValid": true) if the learner spoke at least 2 connected thoughts out loud (e.g. noticing the current situation/snag + reasoning why OR deciding their next move).
2. Populate "connectorsFound" with 2-4 spoken thinking/linking phrases they used (or labels like "observation", "hypothesis", "next move").
3. If too brief (only 1 short clause with no next move or reasoning), set "isValid": false and coach them gently in "feedback" + "hintL1..L3" + "vietnameseRescue".`;
  }

  const modeLabel =
    stage === 'TRANSFER_CHALLENGE'
      ? 'UNSEEN SCENE TRANSFER CHECK (Zero Scaffolding)'
      : 'METHOD 4 · BLIND ACTIVE RECALL (Photo & Prompts Hidden)';

  return `SCENE: "${sceneContext}". ${objectsContext}
${modeLabel}
- Learner's earlier thoughts from Methods 1-3: ${JSON.stringify(previousSentences)}
- Learner's unassisted spoken recall: "${latestTranscript}"

EVALUATION RULES:
1. Accept ("isValid": true) if the learner produced at least 2 connected English clauses/sentences expressing what is happening + why/snag or their next move in their own words (NEVER require word-for-word memorization of earlier sentences!).
2. "coverageScore": Integer 0..100 reflecting how well they connected core pillars (Action/Context, Purpose/Reason, Snag/Observation, Next Move). Give 75..100 for 3-4 pillars, 55..74 for 2 pillars, <50 if only 1 fragmentary phrase.
3. "ideasIdentified": 2-4 concise pillar labels actually heard in their speech (e.g. "Activity & Context", "Purpose & Reason", "Situation Check", "Immediate Next Move").
4. "strength": 1 specific, encouraging sentence naming what they connected well on their own.
5. "improvement": 1 practical spoken coaching tip (if "isValid" is false, tell them clearly which missing link to add right now).`;
}
