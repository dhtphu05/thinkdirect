import { Schema, Type } from '@google/genai';

export interface ConceptBridgePromptInput {
  vietnameseIdea: string;
  sceneContext: string;
  sceneObjects?: string[];
  currentStage?: string;
  currentThought?: string;
}

export const CONCEPT_BRIDGE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    englishChunk: { type: Type.STRING },
    contextAnchor: { type: Type.STRING },
    selfBuildPrompt: { type: Type.STRING },
  },
  required: ['englishChunk', 'contextAnchor', 'selfBuildPrompt'],
};

export function buildConceptBridgePrompt({
  vietnameseIdea,
  sceneContext,
  sceneObjects = [],
  currentStage = '',
  currentThought = '',
}: ConceptBridgePromptInput): { systemInstruction: string; userPrompt: string } {
  const objectsNote =
    sceneObjects.length > 0
      ? `Visible objects: ${sceneObjects.slice(0, 5).join(', ')}.`
      : '';
  const stageNote = currentStage ? `Active practice stage: ${currentStage}.` : '';
  const draftNote = currentThought.trim()
    ? `Learner's sentence so far: "${currentThought.trim()}".`
    : '';

  return {
    systemInstruction: `You are ThinkDirect's Vietnamese-to-English SLA Concept Bridge.
Your mission: Break mental translation dependence. When a Vietnamese learner gets stuck on a Vietnamese idea while speaking, give them ONLY a natural 2-5 word spoken English collocation/chunk and an open sentence frame with "___" — NEVER write or translate a complete sentence for them.`,
    userPrompt: `Scene: "${sceneContext}". ${objectsNote} ${stageNote} ${draftNote}
The learner is stuck trying to express this Vietnamese idea aloud: "${vietnameseIdea}".

STRICT OUTPUT RULES:
1. "englishChunk": Natural, idiomatic 2-5 word spoken English phrase/collocation that native speakers actually say in this context (avoid stiff word-by-word dictionary translation; NEVER return a full sentence with subject + verb + period).
2. "contextAnchor": 1 concise sentence (max 14 words) explaining how this chunk fits "${sceneContext}".
3. "selfBuildPrompt": An incomplete spoken starter frame containing "___" (e.g., 'Try saying: "Right now I\'m ___ so I can..."') so the learner actively speaks their own full sentence.`,
  };
}

export interface SessionEvalPromptInput {
  sceneTitle: string;
  initialThought: string;
  expansionSentences: string[];
  developmentSentences: string[];
  selfTalkTranscript: string;
  independentRecallTranscript: string;
  hintsUsedCount: number;
  selfTalkDurationSeconds: number;
}

export const SESSION_EVAL_SCHEMA: Schema = {
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
};

export function buildSessionEvaluationPrompt(
  input: SessionEvalPromptInput
): { systemInstruction: string; userPrompt: string } {
  return {
    systemInstruction: `You are ThinkDirect's Senior SLA Speaking Assessment & Natural Recast Coach for Vietnamese learners.
Analyze the learner's real spoken progression from a 2-4 word seed to unassisted blind recall.
Focus on communicative growth, real phrases the learner actually produced, and ONE high-impact "Natural Rephrase" (SLA Recast) that upgrades literal/choppy Vietnamese-influenced English into smooth, idiomatic everyday spoken English while preserving 100% of the learner's original meaning.`,
    userPrompt: `Evaluate this completed 5-Method English speaking session:
- Scene / Photo: "${input.sceneTitle}"
- Starting Seed: "${input.initialThought}"
- Method 1 (Sentence Expansions): ${JSON.stringify(input.expansionSentences)}
- Method 2 (Idea Development — Why/How or P.R.E): ${JSON.stringify(input.developmentSentences)}
- Method 3 (Solo-Reflex Self-Talk): "${input.selfTalkTranscript}"
- Method 4 (Unassisted Blind Recall): "${input.independentRecallTranscript}"
- Hints Used: ${input.hintsUsedCount}
- Total Speaking Time: ${input.selfTalkDurationSeconds}s

STRICT ASSESSMENT RULES:
1. "strength": Highlight 1 concrete, observable win showing how their thought grew from "${input.initialThought}" into "${input.independentRecallTranscript}" (1-2 sentences, warm & specific).
2. "improvement": Give 1 practical spoken linking habit or rhythm tip they can apply immediately next time (1 concise sentence).
3. "independentExpressionsUsed": Extract 2-4 multi-word English chunks/collocations that ACTUALLY appear in the learner's transcripts above (do NOT invent phrases they didn't say).
4. "ideasExpressedCount": Count distinct meaningful propositions expressed in their final recall (integer, typically 3..6).
5. "naturalUpgrade" (CRITICAL SLA RECAST):
   - "learnerOriginal": Quote 1 actual sentence or two choppy adjacent clauses directly from the learner's Method 3 or Method 4 transcript (prioritize Vietnamese L1 transfer patterns like "because... so...", "although... but...", "for not...", stiff phrasing, or unlinked short clauses).
   - "naturalPhrasing": Rewrite ONLY that quote into smooth, idiomatic B1-B2 spoken English using natural contractions, preserving 100% of their exact meaning.
   - "upgradedChunk": Highlight the key 2-5 word spoken pattern or connector introduced in "naturalPhrasing".
   - "whyItHelps": 1 crisp sentence explaining why this phrasing sounds more natural in spoken English.
6. "suggestedNextPractice": Suggest 1 concrete, relatable nearby scene or moment to photograph next.`,
  };
}
