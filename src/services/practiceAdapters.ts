/**
 * ThinkDirect V3 Practice Adapters
 * - RealPracticeAdapter: Live Gemini Coaching (`/api/coach-step`) grounded in ANY captured/uploaded
 *   scene photo + deterministic 0ms SLA guardrails.
 * - DemoPracticeAdapter: Deterministic reference adapter preserved for automated unit test suites.
 */

import {
  PracticeContextKey,
  PracticeContextData,
  SessionMode,
  IdeaQuestionKey,
  SceneData,
} from '../types';
import {
  evaluateExpansionAttempt,
  evaluateIdeaDevelopmentAttempt,
  evaluateSelfTalkMonologue,
  evaluateIndependentRecall,
  ExpansionEvaluationResult,
  IdeaEvaluationResult,
  GOLDEN_DEMO_PATH,
} from './speakingEngine';
import { apiFetch } from './apiClient';

export interface CoachExpansionEvaluationResult extends ExpansionEvaluationResult {
  nextStepTitle?: string;
  nextStepExample?: string;
  nextStepSample?: string;
}

export interface SelfTalkEvaluationOptions {
  beatStep?: number;
  previousSentences?: string[];
}

export const PRACTICE_CONTEXTS: Record<PracticeContextKey, PracticeContextData> = {
  STUDY_WORKSPACE: {
    key: 'STUDY_WORKSPACE',
    title: 'University Study Workspace',
    topicLabel: 'Building a login page for my university project',
    initialThought: GOLDEN_DEMO_PATH.stepA_root,
    expansion1Prompt: 'What specific feature or page are you building?',
    expansion1Sample: GOLDEN_DEMO_PATH.stepB_expansion1,
    expansion1IncorrectSample: 'im coding',
    expansion1IncorrectFeedback:
      "That's the same idea without new information. Try adding what specific feature you're building.",
    expansion2Prompt: 'What project or purpose is this login page for?',
    expansion2Sample: GOLDEN_DEMO_PATH.stepB_expansion2,
    whyPrompt: 'Why do users or students need this login page?',
    whySample: GOLDEN_DEMO_PATH.stepC_why,
    howPrompt: 'How are you building it technically?',
    howSample: GOLDEN_DEMO_PATH.stepC_how,
    pointPrompt: 'What is your main priority when building this feature?',
    pointSample:
      'I prefer building secure authentication before designing the rest of the app.',
    reasonPrompt: 'Why do you prefer building the authentication flow first?',
    reasonSample:
      'Because securing student accounts early keeps the rest of the app safe.',
    examplePrompt: 'Can you share a quick example from this project?',
    exampleSample:
      'For example, yesterday I tested protected routes before building the student dashboard.',
    selfTalkPrompt:
      "You're testing authentication and hit a bug. Think out loud about what's happening and what to check first.",
    selfTalkMonologue: GOLDEN_DEMO_PATH.stepD_selfTalk,
    independentRecallPrompt:
      'Explain your login page project, the authentication issue, and your next step—in your own words without hints.',
    independentRecallSample: GOLDEN_DEMO_PATH.stepE_recall,
    thinkingPrompts: [
      {
        category: 'NOTICE',
        categoryLabel: 'Notice',
        question: "What isn't working right now?",
        helperText: "e.g. Something isn't working with authentication.",
      },
      {
        category: 'QUESTION',
        categoryLabel: 'Question',
        question: 'Why is the request failing?',
        helperText: 'Ask yourself what part of sign-in could break.',
      },
      {
        category: 'CONSIDER',
        categoryLabel: 'Consider',
        question: 'What might be causing it?',
        helperText: 'e.g. Maybe the access token has expired.',
      },
      {
        category: 'DECIDE',
        categoryLabel: 'Decide',
        question: 'What should I check first?',
        helperText: 'e.g. I should check the API response first.',
      },
    ],
    speakingStrength:
      'You progressed from a 2-word starter ("I\'m coding.") to explaining purpose, technical stack, and live debugging decisions independently.',
    actionableImprovement:
      "Try linking your hypothesis and action with 'Since the token may have expired, I'll check...'",
    nextPracticeSuggestion:
      'Point your camera at another everyday study or coffee moment and build 3 connected thoughts without hints.',
  },

  MORNING_COFFEE: {
    key: 'MORNING_COFFEE',
    title: 'Morning Routine & Coffee',
    topicLabel: 'Getting ready before morning class',
    initialThought: "I'm drinking coffee.",
    expansion1Prompt: 'When or where are you having this coffee?',
    expansion1Sample: "I'm drinking coffee before my morning class.",
    expansion1IncorrectSample: 'im drinking coffee',
    expansion1IncorrectFeedback:
      'This repeats your thought. Try adding when or where you are drinking it.',
    expansion2Prompt: 'Why is this coffee important right now?',
    expansion2Sample:
      "I'm drinking coffee before my morning class because I need energy for a busy day.",
    whyPrompt: 'Why is today especially busy for you?',
    whySample: 'Because I have two lectures and a team presentation to deliver.',
    howPrompt: 'How are you preparing before leaving home?',
    howSample: "I'm finishing my coffee while reviewing my presentation slides.",
    pointPrompt: 'What do you value most about your morning routine?',
    pointSample:
      'I prefer having ten quiet minutes with coffee before morning class.',
    reasonPrompt: 'Why do you like having a quiet coffee routine before class?',
    reasonSample: 'Because ten calm minutes help me organize my thoughts before speaking.',
    examplePrompt: 'Give a concrete example of when this helped you.',
    exampleSample:
      'For example, last Tuesday I spotted a missing slide over morning coffee and fixed it in time.',
    selfTalkPrompt:
      "You're getting ready to leave for campus. Think out loud about your timing and next move.",
    selfTalkMonologue:
      'I have twenty minutes before leaving for campus. Maybe traffic will be heavy this morning. I should pack my charger and review my opening slide first.',
    independentRecallPrompt:
      'Describe your morning routine, why today matters, and what you will do before heading out.',
    independentRecallSample:
      "I'm having coffee before my morning class because I have two lectures and a team presentation today. Traffic might be busy, so I'll review my slides and leave a few minutes early.",
    thinkingPrompts: [
      {
        category: 'NOTICE',
        categoryLabel: 'Notice',
        question: 'How much time do I have right now?',
        helperText: 'Notice your schedule before class starts.',
      },
      {
        category: 'QUESTION',
        categoryLabel: 'Question',
        question: "What's my main priority this morning?",
        helperText: 'Focus on the presentation or lecture ahead.',
      },
      {
        category: 'CONSIDER',
        categoryLabel: 'Consider',
        question: 'What could slow me down?',
        helperText: 'Think about traffic, notes, or equipment.',
      },
      {
        category: 'DECIDE',
        categoryLabel: 'Decide',
        question: 'What should I do first?',
        helperText: 'Choose one concrete step in the next five minutes.',
      },
    ],
    speakingStrength:
      'Natural everyday sequencing connecting morning preparation with upcoming responsibilities.',
    actionableImprovement:
      "Use time connectors like 'right before heading out' to smooth transitions.",
    nextPracticeSuggestion:
      'Capture your study notes after class and summarize one key idea aloud.',
  },

  PLANNING_DAY: {
    key: 'PLANNING_DAY',
    title: 'Planning My Study Week',
    topicLabel: 'Organizing priorities and deadlines',
    initialThought: "I'm planning my day.",
    expansion1Prompt: 'Why are you planning your day right now?',
    expansion1Sample:
      "I'm planning my day because I have several tasks to finish.",
    expansion1IncorrectSample: 'im planning my day',
    expansion1IncorrectFeedback:
      'This is the same idea. Try adding why you are planning or what tasks await.',
    expansion2Prompt: 'Which deadline or assignments make this urgent?',
    expansion2Sample:
      "I'm planning my day because I have several tasks to finish for two assignments this week.",
    whyPrompt: 'Why does writing a checklist help you?',
    whySample: 'Writing down a clear checklist keeps me from feeling overwhelmed.',
    howPrompt: 'How will you tackle your checklist today?',
    howSample:
      "I'll start with the hardest assignment first while my mind is fresh.",
    pointPrompt: 'What is your strategy for managing busy study days?',
    pointSample:
      'I prefer tackling my hardest assignment first in the morning.',
    reasonPrompt: 'Why do you prefer tackling the hardest task first?',
    reasonSample:
      'Because my concentration is sharpest in the morning before messages pile up.',
    examplePrompt: 'Can you give a specific example from this week?',
    exampleSample:
      'For example, yesterday I completed my database schema before noon without distractions.',
    selfTalkPrompt:
      'Look at your task list and think out loud about how to pace your energy today.',
    selfTalkMonologue:
      'Both assignments take deep focus, and afternoon meetings might drain my energy. Maybe I should silence notifications for ninety minutes and draft the main section first.',
    independentRecallPrompt:
      'Explain your schedule today, why planning helps, and how you will execute your first block.',
    independentRecallSample:
      "I'm organizing my schedule because two major assignments are due this week. A written checklist prevents me from feeling overwhelmed, so I'll silence notifications and finish the hardest task first while my mind is fresh.",
    thinkingPrompts: [
      {
        category: 'NOTICE',
        categoryLabel: 'Notice',
        question: 'What is on my desk and schedule today?',
        helperText: 'Observe your workload honestly.',
      },
      {
        category: 'QUESTION',
        categoryLabel: 'Question',
        question: 'Which task needs the deepest focus?',
        helperText: 'Pick the single highest-impact priority.',
      },
      {
        category: 'CONSIDER',
        categoryLabel: 'Consider',
        question: 'What could interrupt my focus?',
        helperText: 'Consider notifications, fatigue, or afternoon classes.',
      },
      {
        category: 'DECIDE',
        categoryLabel: 'Decide',
        question: 'What is my immediate first move?',
        helperText: 'Commit to your first focused block.',
      },
    ],
    speakingStrength:
      'Structured prioritization with clear cause-and-effect English connectors.',
    actionableImprovement:
      "Try adding conditional planning phrases such as 'If I finish early, I'll...'",
    nextPracticeSuggestion:
      'Reflect aloud tonight on what you finished and what moves to tomorrow.',
  },
};

export interface IPracticeAdapter {
  mode: SessionMode;
  contextData: PracticeContextData;
  setContext: (key: PracticeContextKey) => void;
  evaluateExpansion: (
    previousThought: string,
    newAttempt: string,
    subStep: number
  ) => Promise<CoachExpansionEvaluationResult>;
  evaluateIdeaTurn: (
    questionKey: IdeaQuestionKey,
    answer: string,
    priorTurnAnswer?: string
  ) => Promise<IdeaEvaluationResult>;
  evaluateWhy: (answer: string) => Promise<IdeaEvaluationResult>;
  evaluateHow: (answer: string, whyAnswer: string) => Promise<IdeaEvaluationResult>;
  evaluateSelfTalk: (
    monologue: string,
    options?: SelfTalkEvaluationOptions
  ) => Promise<{
    isValid: boolean;
    feedback: string;
    connectorsFound: string[];
    hintL1?: string;
    hintL2?: string;
    hintL3?: string;
    vietnameseRescue?: string;
  }>;
  evaluateRecall: (
    recall: string,
    hintsUsed: boolean,
    referenceUtterances?: string[]
  ) => Promise<{
    isValid: boolean;
    coverageScore: number;
    ideasIdentified: string[];
    strength: string;
    improvement: string;
  }>;
}

/**
 * Deterministic Reference Adapter (used by unit test suites).
 */
export class DemoPracticeAdapter implements IPracticeAdapter {
  mode: SessionMode = 'demo';
  contextData: PracticeContextData;

  constructor(contextKey: PracticeContextKey = 'STUDY_WORKSPACE') {
    this.contextData =
      PRACTICE_CONTEXTS[contextKey] || PRACTICE_CONTEXTS.STUDY_WORKSPACE;
  }

  setContext(key: PracticeContextKey) {
    this.contextData =
      PRACTICE_CONTEXTS[key] || PRACTICE_CONTEXTS.STUDY_WORKSPACE;
  }

  async evaluateExpansion(
    previousThought: string,
    newAttempt: string,
    subStep: number
  ): Promise<CoachExpansionEvaluationResult> {
    const trimmed = newAttempt.trim().toLowerCase();
    if (
      trimmed === this.contextData.expansion1IncorrectSample.toLowerCase() ||
      trimmed === previousThought.trim().toLowerCase()
    ) {
      return {
        outcome: 'REPEAT',
        isValid: false,
        feedback: this.contextData.expansion1IncorrectFeedback,
        synthesizedThought: previousThought,
        nextPrompt: this.contextData.expansion1Prompt,
        isAlreadyComplete: false,
        addedWords: [],
        hintL1: 'Name the specific feature, object, or activity.',
        hintL2: "Start with: I'm building...",
        hintL3: `Example: ${this.contextData.expansion1Sample}`,
        vietnameseRescue:
          'Gợi ý: Câu này lặp lại ý cũ — hãy nói thêm bạn đang làm tính năng hay chi tiết cụ thể gì.',
      };
    }

    return evaluateExpansionAttempt(
      previousThought,
      newAttempt,
      subStep,
      this.contextData.title
    );
  }

  async evaluateIdeaTurn(
    questionKey: IdeaQuestionKey,
    answer: string,
    priorTurnAnswer = ''
  ): Promise<IdeaEvaluationResult> {
    return evaluateIdeaDevelopmentAttempt(
      questionKey,
      answer,
      priorTurnAnswer,
      this.contextData.title
    );
  }

  async evaluateWhy(answer: string) {
    return this.evaluateIdeaTurn('Why', answer);
  }

  async evaluateHow(answer: string, whyAnswer: string) {
    return this.evaluateIdeaTurn('How', answer, whyAnswer);
  }

  async evaluateSelfTalk(monologue: string) {
    return evaluateSelfTalkMonologue(monologue);
  }

  async evaluateRecall(
    recall: string,
    hintsUsed: boolean,
    referenceUtterances: string[] = []
  ) {
    return evaluateIndependentRecall(recall, hintsUsed, referenceUtterances);
  }
}

/**
 * Real Practice Adapter
 * Grounds every stage in ANY captured/uploaded SceneData + `practiceBlueprint`,
 * catches instant repetitions locally in 0ms, and calls Gemini `/api/coach-step`
 * across all 4 speaking methods.
 */
export class RealPracticeAdapter implements IPracticeAdapter {
  mode: SessionMode = 'real';
  contextData: PracticeContextData;
  private activeScene?: SceneData;

  constructor(
    contextKey: PracticeContextKey = 'STUDY_WORKSPACE',
    scene?: SceneData
  ) {
    const base =
      PRACTICE_CONTEXTS[contextKey] || PRACTICE_CONTEXTS.STUDY_WORKSPACE;
    this.activeScene = scene;

    if (scene?.practiceBlueprint) {
      const bp = scene.practiceBlueprint;
      const rung1 = bp.expansionRungs[0];
      const rung2 = bp.expansionRungs[1];
      const starter =
        scene.initialSuggestedThought ||
        scene.objects[0]?.contextualSentence ||
        base.initialThought;
      this.contextData = {
        ...base,
        title: scene.title,
        topicLabel: scene.userGoal || scene.description || scene.title,
        initialThought: starter,
        expansion1Prompt: rung1 ? `Add ${rung1.focusCue}` : base.expansion1Prompt,
        expansion1Sample: rung1?.sampleSentence || base.expansion1Sample,
        expansion1IncorrectSample: starter
          .toLowerCase()
          .replace(/[^a-z0-9\s']/g, '')
          .trim(),
        expansion2Prompt: rung2 ? `Add ${rung2.focusCue}` : base.expansion2Prompt,
        expansion2Sample: rung2?.sampleSentence || base.expansion2Sample,
        whyPrompt: bp.fiveWOneH.whyPrompt,
        whySample: bp.fiveWOneH.whySample,
        howPrompt: bp.fiveWOneH.howPrompt,
        howSample: bp.fiveWOneH.howSample,
        pointPrompt: bp.preOpinion.pointPrompt,
        pointSample: bp.preOpinion.pointSample,
        reasonPrompt: bp.preOpinion.reasonPrompt,
        reasonSample: bp.preOpinion.reasonSample,
        examplePrompt: bp.preOpinion.examplePrompt,
        exampleSample: bp.preOpinion.exampleSample,
        selfTalkPrompt: bp.selfTalk.situationPrompt,
        selfTalkMonologue: bp.selfTalk.fullMonologue,
        independentRecallPrompt: bp.recall.prompt,
        independentRecallSample: bp.recall.sampleSpeech,
        thinkingPrompts: [
          {
            category: 'NOTICE',
            categoryLabel: 'Notice',
            question: 'What is happening right in front of me?',
            helperText: bp.selfTalk.beat1Notice,
          },
          {
            category: 'QUESTION',
            categoryLabel: 'Question',
            question: 'What small challenge or risk should I watch for?',
            helperText: 'Ask yourself one quick question in English.',
          },
          {
            category: 'CONSIDER',
            categoryLabel: 'Consider',
            question: 'What might happen or cause an issue?',
            helperText: bp.selfTalk.beat2Hypothesize,
          },
          {
            category: 'DECIDE',
            categoryLabel: 'Decide',
            question: 'What is my immediate first move?',
            helperText: bp.selfTalk.beat3Decide,
          },
        ],
        speakingStrength: `You built a natural, connected English story directly from "${scene.title}".`,
        actionableImprovement:
          'Link your observation and next action smoothly using connectors like "so first, I\'ll..." or "in case...".',
        nextPracticeSuggestion:
          'Snap or upload another photo from your day and express 3 connected ideas without hints.',
      };
    } else if (scene && !scene.isSample) {
      const firstObj = scene.objects[0]?.name?.toLowerCase() || 'item';
      const firstExpr =
        scene.suggestedExpressions[0]?.phrase || 'focus on my task';
      this.contextData = {
        ...base,
        title: scene.title,
        topicLabel: scene.title,
        initialThought:
          scene.initialSuggestedThought ||
          scene.objects[0]?.contextualSentence ||
          base.initialThought,
        expansion1Prompt: `Add a specific detail using what you see (e.g. ${firstObj}).`,
        expansion1Sample:
          scene.objects[0]?.contextualSentence || base.expansion1Sample,
        expansion2Prompt: `Add context or purpose (e.g. "${firstExpr}").`,
        expansion2Sample:
          scene.suggestedExpressions[0]?.example || base.expansion2Sample,
        selfTalkPrompt: `Look around "${scene.title}". Think out loud about what you're doing, one challenge, and your next move.`,
        independentRecallPrompt: `Talk freely about "${scene.title}", why it matters to you, and what you'll do next—without looking at any labels.`,
      };
    } else {
      this.contextData = base;
    }
  }

  setContext(key: PracticeContextKey) {
    this.contextData =
      PRACTICE_CONTEXTS[key] || PRACTICE_CONTEXTS.STUDY_WORKSPACE;
  }

  private get sceneLabel(): string {
    if (this.activeScene?.userGoal) {
      return `${this.activeScene.title} (Goal: ${this.activeScene.userGoal})`;
    }
    return this.activeScene?.title || this.contextData.title;
  }

  private get sceneObjects(): string[] {
    return (this.activeScene?.objects || []).map((o) => o.name);
  }

  async evaluateExpansion(
    previousThought: string,
    newAttempt: string,
    subStep: number
  ): Promise<CoachExpansionEvaluationResult> {
    const local = evaluateExpansionAttempt(
      previousThought,
      newAttempt,
      subStep,
      this.sceneLabel
    );
    // Catch instant repetition or empty speech in 0ms without network latency
    if (!local.isValid || typeof window === 'undefined') {
      return local;
    }

    try {
      const res = await apiFetch('/api/coach-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: 'EXPANSION',
          sceneContext: this.sceneLabel,
          sceneObjects: this.sceneObjects,
          previousSentences: [previousThought],
          latestTranscript: newAttempt,
          stepNumber: subStep,
        }),
      });
      if (!res.ok) return local;
      const data = await res.json();
      return {
        ...local,
        isValid: Boolean(data.isValid ?? local.isValid),
        feedback: data.feedback || local.feedback,
        synthesizedThought: data.synthesizedThought || local.synthesizedThought,
        nextPrompt: data.nextPrompt || local.nextPrompt,
        isAlreadyComplete: Boolean(
          data.isAlreadyComplete ?? local.isAlreadyComplete
        ),
        hintL1: data.hintL1 || local.hintL1,
        hintL2: data.hintL2 || local.hintL2,
        hintL3: data.hintL3 || local.hintL3,
        vietnameseRescue: data.vietnameseRescue || local.vietnameseRescue,
        nextStepTitle: data.nextStepTitle || undefined,
        nextStepExample: data.nextStepExample || undefined,
        nextStepSample: data.nextStepSample || undefined,
      };
    } catch {
      return local;
    }
  }

  async evaluateIdeaTurn(
    questionKey: IdeaQuestionKey,
    answer: string,
    priorTurnAnswer = ''
  ): Promise<IdeaEvaluationResult> {
    const local = evaluateIdeaDevelopmentAttempt(
      questionKey,
      answer,
      priorTurnAnswer,
      this.sceneLabel
    );
    if (!local.isValid || typeof window === 'undefined') {
      return local;
    }

    try {
      const res = await apiFetch('/api/coach-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: 'IDEA_DEVELOPMENT',
          questionKey,
          priorTurnAnswer,
          sceneContext: this.sceneLabel,
          sceneObjects: this.sceneObjects,
          previousSentences: [
            this.contextData.initialThought,
            priorTurnAnswer,
          ].filter(Boolean),
          latestTranscript: answer,
        }),
      });
      if (!res.ok) return local;
      const data = await res.json();
      return {
        ...local,
        isValid: Boolean(data.isValid ?? local.isValid),
        feedback: data.feedback || local.feedback,
        nextPrompt: data.nextPrompt || local.nextPrompt,
        hintL1: data.hintL1 || local.hintL1,
        hintL2: data.hintL2 || local.hintL2,
        hintL3: data.hintL3 || local.hintL3,
        vietnameseRescue: data.vietnameseRescue || local.vietnameseRescue,
      };
    } catch {
      return local;
    }
  }

  async evaluateWhy(answer: string) {
    return this.evaluateIdeaTurn('Why', answer);
  }

  async evaluateHow(answer: string, whyAnswer: string) {
    return this.evaluateIdeaTurn('How', answer, whyAnswer);
  }

  async evaluateSelfTalk(
    monologue: string,
    options?: SelfTalkEvaluationOptions
  ) {
    const beatStep = options?.beatStep;
    const clean = monologue.trim();
    const wordCount = clean.split(/\s+/).filter(Boolean).length;

    const local = beatStep
      ? {
          isValid: wordCount >= 3,
          feedback:
            wordCount >= 3
              ? `Great Beat ${beatStep} thought.`
              : `Say one complete English sentence for Beat ${beatStep}.`,
          connectorsFound: [] as string[],
        }
      : evaluateSelfTalkMonologue(monologue);

    if (!local.isValid || typeof window === 'undefined') {
      return local;
    }

    try {
      const res = await apiFetch('/api/coach-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: 'GUIDED_SELF_TALK',
          beatStep,
          sceneContext: this.sceneLabel,
          sceneObjects: this.sceneObjects,
          previousSentences: options?.previousSentences || [],
          latestTranscript: monologue,
        }),
      });
      if (!res.ok) return local;
      const data = await res.json();
      return {
        ...local,
        isValid: Boolean(data.isValid ?? local.isValid),
        feedback: data.feedback || local.feedback,
        hintL1: data.hintL1,
        hintL2: data.hintL2,
        hintL3: data.hintL3,
        vietnameseRescue: data.vietnameseRescue,
      };
    } catch {
      return local;
    }
  }

  async evaluateRecall(
    recall: string,
    hintsUsed: boolean,
    referenceUtterances: string[] = []
  ) {
    const local = evaluateIndependentRecall(
      recall,
      hintsUsed,
      referenceUtterances
    );
    if (!local.isValid || typeof window === 'undefined') {
      return local;
    }

    try {
      const res = await apiFetch('/api/coach-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: 'INDEPENDENT_RECALL',
          sceneContext: this.sceneLabel,
          sceneObjects: this.sceneObjects,
          previousSentences: referenceUtterances,
          latestTranscript: recall,
        }),
      });
      if (!res.ok) return local;
      const data = await res.json();
      if (!data.isValid) {
        return {
          ...local,
          isValid: false,
          improvement: data.feedback || local.improvement,
        };
      }
      return {
        ...local,
        strength: data.feedback || local.strength,
        improvement: data.hintL1 || local.improvement,
      };
    } catch {
      return local;
    }
  }
}
