/**
 * ThinkDirect V3 Practice Adapters — DevFest 2026
 * Supports both offline Video-Ready Happy Path (DemoPracticeAdapter)
 * and Live Gemini Coaching + Deterministic Guardrails (RealPracticeAdapter).
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
  ) => Promise<ExpansionEvaluationResult>;
  evaluateIdeaTurn: (
    questionKey: IdeaQuestionKey,
    answer: string,
    priorTurnAnswer?: string
  ) => Promise<IdeaEvaluationResult>;
  evaluateWhy: (answer: string) => Promise<IdeaEvaluationResult>;
  evaluateHow: (answer: string, whyAnswer: string) => Promise<IdeaEvaluationResult>;
  evaluateSelfTalk: (
    monologue: string
  ) => Promise<{ isValid: boolean; feedback: string; connectorsFound: string[] }>;
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
 * Demo Practice Adapter
 * Deterministic, instant, zero network dependency — ideal for Guided Demo & 1-take video recording.
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
  ): Promise<ExpansionEvaluationResult> {
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
 * Runs fast local SLA guardrails first (0ms repetition catch), then queries backend
 * Gemini `/api/coach-step` grounded in the real captured scene, with graceful fallback.
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

    if (scene && !scene.isSample) {
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
    return this.activeScene?.title || this.contextData.title;
  }

  async evaluateExpansion(
    previousThought: string,
    newAttempt: string,
    subStep: number
  ): Promise<ExpansionEvaluationResult> {
    const local = evaluateExpansionAttempt(
      previousThought,
      newAttempt,
      subStep,
      this.sceneLabel
    );
    // Immediately block repetition or empty attempts without waiting on network
    if (!local.isValid || typeof fetch === 'undefined') {
      return local;
    }

    try {
      const res = await fetch('/api/coach-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: 'EXPANSION',
          sceneContext: this.sceneLabel,
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
    if (!local.isValid || typeof fetch === 'undefined') {
      return local;
    }

    try {
      const res = await fetch('/api/coach-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: 'IDEA_DEVELOPMENT',
          questionKey,
          priorTurnAnswer,
          sceneContext: this.sceneLabel,
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
