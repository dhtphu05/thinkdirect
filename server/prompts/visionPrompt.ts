import { Schema, Type } from '@google/genai';
import { ExpansionRungBlueprint } from '../../src/types.ts';

export function buildVisionSceneSystemInstruction(userGoal = ''): string {
  const cleanGoal = userGoal.trim();
  const goalDirective = cleanGoal
    ? `USER SPEAKING GOAL: The learner wants to talk about this specific situation with this photo: "${cleanGoal}". Anchor the starter seed, collocations, 3 expansion rungs, Why/How & P.R.E questions, and Self-Talk snag in BOTH what is physically visible in the photo AND this goal.`
    : `SCENE INFERENCE: Identify the single clearest real-life human moment or activity visible in this photo (e.g., having a drink at a café, cooking at home, studying/working at a desk, commuting, shopping, packing a bag, relaxing outdoors).`;

  return `You are ThinkDirect's Principal SLA Curriculum & Multimodal Vision Architect.
Your job: Turn ONE real-world photograph into a cohesive, spoken-first 5-Method English Thinking Blueprint so a learner can go directly from visual perception -> short seed -> expanded sentence -> structured reason/method -> solo self-talk -> unassisted recall WITHOUT translating from Vietnamese.

${goalDirective}

NON-NEGOTIABLE GROUNDING & ANTI-HALLUCINATION RULES:
1. 100% VISUAL TRUTH: Every object, expression, question, and problem MUST come from what is genuinely visible in THIS image.
2. ZERO DOMAIN LEAKAGE: NEVER mention coding, software, React, APIs, login pages, or tokens UNLESS computer code or a software IDE is visibly displayed in the photo.
3. SPOKEN CONVERSATIONAL REGISTER: Write every sample in natural, everyday first-person spoken English using contractions ("I'm", "I'll", "it's", "don't"). Sound like a fluent speaker talking naturally, never like a textbook essay.

METHOD-BY-METHOD BLUEPRINT RULES:
- Method 0 · Direct Labeling ("objects" — 4 to 5 items):
  - Pick 4-5 distinct, foreground physical objects clearly visible in the image.
  - Estimate accurate visual center coordinates: "xPercent" (20..80) and "yPercent" (18..78), choosing well-separated objects so pins do not overlap.
  - "name": 1-2 word everyday noun (Title Case, e.g., "Iced Coffee", "Wooden Desk", "Open Notebook").
  - "actionChunk": natural 2-4 word spoken verb+noun collocation (e.g., "sip iced coffee", "jot down notes").
  - "contextualSentence": natural first-person sentence (6-10 words).
  - "phonetic": standard IPA (e.g., "/aɪst ˈkɒf.i/").
  - "vietnameseMeaning": concise, natural 1-3 word Vietnamese meaning.

- "suggestedExpressions" (3 to 4 items):
  - Useful 2-5 word spoken collocations or everyday chunks that fit THIS exact scene (not single nouns), with concise English "meaning", natural first-person "example", and natural "vietnameseMeaning".

- Seed Thought ("initialSuggestedThought"):
  - MUST be a crisp 2-4 word first-person present-continuous or simple starter sentence ending with a period (e.g., "I'm having coffee.", "I'm making dinner.", "I'm organizing my desk.").
  - NEVER exceed 5 words so there is clear room to expand across 3 rungs.

- Method 1 · Additive Sentence Staircase ("expansionRungs" — strictly 3 rungs):
  - Each rung MUST keep the EXACT wording of the previous step (without its ending period) and append ONE short natural 2-5 word chunk at the end:
    - Rung 1 (stepNum: 1): "<seed without period> + <where or with what>."
    - Rung 2 (stepNum: 2): "<Rung 1 without period> + <when, who, or context>."
    - Rung 3 (stepNum: 3): "<Rung 2 without period> + <purpose, feeling, or outcome>."
  - Format reference (illustrative structure only — adapt 100% to the photo):
    - Seed: "I'm making breakfast."
    - Rung 1: focusCue="what or where", exampleChunk="e.g. in my kitchen", sampleSentence="I'm making breakfast in my kitchen."
    - Rung 2: focusCue="when or for whom", exampleChunk="e.g. before leaving for work", sampleSentence="I'm making breakfast in my kitchen before leaving for work."
    - Rung 3: focusCue="purpose or benefit", exampleChunk="e.g. so I have steady energy", sampleSentence="I'm making breakfast in my kitchen before leaving for work so I have steady energy."

- Method 2 · Idea Development ("fiveWOneH" & "preOpinion"):
  - Choose "suggestedFramework": "5W1H" for action/process scenes, or "IDEA_REASON_EXAMPLE" for preference/choice/ambience scenes (still populate BOTH objects cleanly).
  - "fiveWOneH": 1 concrete "Why" question + natural spoken sample ("Because..." / "So I can..."), and 1 practical "How" question + natural spoken sample ("First, I..." / "I'm...").
  - "preOpinion": Personal "Point" ("I prefer..." / "I love..."), "Reason" ("Because..."), and concrete "Example" ("For example,...").

- Method 3 · Solo-Reflex Guided Self-Talk ("selfTalk"):
  - Invent ONE realistic, relatable minor snag, trade-off, or small check needed right now in THIS exact scene (e.g., drink cooling down, glare on screen, running 5 minutes tight, forgetting an item, crowded table).
  - "situationPrompt": 1-2 brisk sentences setting up the moment so the learner thinks out loud.
  - "beat1Notice": 1 natural sentence noticing the situation right now (6-12 words).
  - "beat2Hypothesize": 1 natural sentence wondering why or what might happen, starting with "Maybe...", "It looks like...", or "If I..." (7-13 words).
  - "beat3Decide": 1 concrete immediate action starting with "First, I'll...", "Let me...", or "I should..." (7-13 words).
  - "fullMonologue": "<beat1Notice> <beat2Hypothesize> <beat3Decide>" flowing naturally as one 3-sentence spoken thought.

- Method 4 · Blind Active Recall ("recall"):
  - "prompt": 1 clear sentence asking the learner to retell what's happening, why it matters, the small snag, and their next move without looking at the photo.
  - "memoryCue": Short 3-part cue grounded in this scene (max 18 words, format: "1. <activity/place> · 2. <why + snag> · 3. <first move>").
  - "sampleSpeech": Cohesive 3-sentence spoken recall uniting the expanded idea, reason, snag, and next move.
  - "sprintStep1Sample" & "sprintStep2Sample": Natural 1-sentence and 2-sentence samples for quick sprint practice.

- Vietnamese Stuck-Moment Chips ("quickVietnameseBridgeChips" — 4 items):
  - 4 realistic 2-4 word Vietnamese thoughts/collocations a Vietnamese speaker would genuinely think of and hesitate to express in English in THIS exact photo (focus on natural actions/nuances, e.g., "tranh thủ nghỉ ngơi", "sợ muộn giờ", "kiểm tra lại đồ").`;
}

export const VISION_SCENE_USER_PROMPT =
  'Inspect this real photograph carefully and generate the complete, grounded 5-Method ThinkDirect speaking blueprint JSON.';

export function buildUseCaseBlueprintSystemInstruction(
  situation: string
): string {
  const cleanSituation = situation.trim();
  return `You are ThinkDirect's Principal SLA Curriculum Architect.
The learner wants to practice English thinking & speaking for this real-life situation (which may be written in Vietnamese or English): "${cleanSituation}".

Build a vivid, concrete, spoken-first 5-Method English Thinking Blueprint grounded 100% in "${cleanSituation}":
1. Translate/distill the situation into a natural English "title" (3-6 words) and concrete physical setting "description".
2. Populate 4-5 realistic "objects" that would physically surround the speaker in "${cleanSituation}" with well-spaced coordinates ("xPercent": 20..80, "yPercent": 18..78), natural 2-4 word "actionChunk", first-person "contextualSentence", IPA "phonetic", and concise "vietnameseMeaning".
3. Populate 3-4 idiomatic spoken "suggestedExpressions" directly useful for "${cleanSituation}".
4. "initialSuggestedThought": Crisp 2-4 word first-person English seed sentence ending with a period (e.g., "I'm ordering dinner.", "I'm in my interview.").
5. "practiceBlueprint":
   - "expansionRungs": Strictly 3 additive rungs where each "sampleSentence" repeats the exact previous sentence (without period) + adds 1 natural 2-5 word chunk.
   - "fiveWOneH" & "preOpinion": Natural spoken prompts and first-person samples tailored to "${cleanSituation}".
   - "selfTalk": 1 realistic minor snag or follow-up curveball in "${cleanSituation}" with 3 spoken beats ("beat1Notice", "beat2Hypothesize", "beat3Decide") and "fullMonologue".
   - "recall": Unassisted prompt, short 3-part "memoryCue", cohesive 3-sentence "sampleSpeech", and sprint samples.
   - "quickVietnameseBridgeChips": 4 realistic 2-4 word Vietnamese thoughts a learner often gets stuck expressing in "${cleanSituation}".`;
}

export const VISION_SCENE_RESPONSE_SCHEMA: Schema = {
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
            required: ['stepNum', 'focusCue', 'exampleChunk', 'sampleSentence'],
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
            memoryCue: { type: Type.STRING },
            sampleSpeech: { type: Type.STRING },
            sprintStep1Sample: { type: Type.STRING },
            sprintStep2Sample: { type: Type.STRING },
          },
          required: [
            'prompt',
            'memoryCue',
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

function cleanChunkTail(rawChunk: string, fallback: string): string {
  const cleaned = (rawChunk || '')
    .trim()
    .replace(/^(?:e\.g\.?|for example[:,]?|\+|\.\.\.|…)\s*/i, '')
    .replace(/[.!?…]+$/g, '')
    .trim();
  return cleaned || fallback;
}

/**
 * Guarantees that the 3 expansion rungs form a true additive staircase
 * (`[previous sentence without period] + [added chunk].`) so the UI highlighter
 * always splits `[basePart] + [addedPart]` cleanly on every captured photo.
 */
export function enforceAdditiveRungs(
  seedSentence: string,
  rawRungs: Array<Partial<ExpansionRungBlueprint>> = [],
  firstObjectName = 'setup'
): [ExpansionRungBlueprint, ExpansionRungBlueprint, ExpansionRungBlueprint] {
  const defaultFocus = [
    'where or with what',
    'when or context',
    'purpose or outcome',
  ];
  const defaultChunks = [
    `with this ${firstObjectName.toLowerCase()}`,
    'right now',
    'so everything goes smoothly',
  ];

  const normalizeSample = (
    prevSentence: string,
    candidateSample: string | undefined,
    exampleChunk: string | undefined,
    fallbackChunk: string
  ): { sampleSentence: string; exampleChunk: string } => {
    const prevBase = prevSentence.trim().replace(/[.!?]+$/, '').trim();
    const rawSample = (candidateSample || '').trim();

    if (
      rawSample &&
      rawSample.toLowerCase().startsWith(prevBase.toLowerCase()) &&
      rawSample.replace(/[.!?]+$/, '').trim().length > prevBase.length + 2
    ) {
      const ensuredPeriod = /[.!?]$/.test(rawSample)
        ? rawSample
        : `${rawSample}.`;
      const extractedTail = ensuredPeriod
        .slice(prevBase.length)
        .trim()
        .replace(/^[,\s]+/, '')
        .replace(/[.!?]+$/, '');
      const formattedExample = exampleChunk?.trim()
        ? exampleChunk.trim()
        : `e.g. ${extractedTail}`;
      return {
        sampleSentence: ensuredPeriod,
        exampleChunk: formattedExample,
      };
    }

    const tail = cleanChunkTail(exampleChunk || '', fallbackChunk);
    const loweredTail =
      tail.startsWith('I ') || tail.startsWith("I'")
        ? tail
        : `${tail.charAt(0).toLowerCase()}${tail.slice(1)}`;
    return {
      sampleSentence: `${prevBase} ${loweredTail}.`,
      exampleChunk: exampleChunk?.trim() || `e.g. ${loweredTail}`,
    };
  };

  const r0 = rawRungs[0] || {};
  const step1 = normalizeSample(
    seedSentence,
    r0.sampleSentence,
    r0.exampleChunk,
    defaultChunks[0]
  );
  const rung1: ExpansionRungBlueprint = {
    stepNum: 1,
    focusCue: r0.focusCue?.trim() || defaultFocus[0],
    exampleChunk: step1.exampleChunk,
    sampleSentence: step1.sampleSentence,
  };

  const r1 = rawRungs[1] || {};
  const step2 = normalizeSample(
    rung1.sampleSentence,
    r1.sampleSentence,
    r1.exampleChunk,
    defaultChunks[1]
  );
  const rung2: ExpansionRungBlueprint = {
    stepNum: 2,
    focusCue: r1.focusCue?.trim() || defaultFocus[1],
    exampleChunk: step2.exampleChunk,
    sampleSentence: step2.sampleSentence,
  };

  const r2 = rawRungs[2] || {};
  const step3 = normalizeSample(
    rung2.sampleSentence,
    r2.sampleSentence,
    r2.exampleChunk,
    defaultChunks[2]
  );
  const rung3: ExpansionRungBlueprint = {
    stepNum: 3,
    focusCue: r2.focusCue?.trim() || defaultFocus[2],
    exampleChunk: step3.exampleChunk,
    sampleSentence: step3.sampleSentence,
  };

  return [rung1, rung2, rung3];
}
