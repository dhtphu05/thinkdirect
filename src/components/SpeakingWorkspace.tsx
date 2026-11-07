import React, { useState, useMemo } from 'react';
import {
  SceneData,
  LearningStageKey,
  SpeakingAttempt,
  HintEvent,
  SessionResultData,
  InputMode,
  SessionMode,
  PracticeContextKey,
  FrameworkType,
  UserLevel,
  NaturalPhrasingUpgrade,
} from '../types';
import {
  DemoPracticeAdapter,
  RealPracticeAdapter,
  IPracticeAdapter,
} from '../services/practiceAdapters';
import {
  determineFramework,
  computeSessionMetrics,
  buildNaturalUpgrade,
} from '../services/speakingEngine';
import { VoiceDraft } from './VoiceInput';
import { HintSheet } from './HintSheet';
import { playPronunciation } from '../utils/audioUtils';
import { AmbientMintArc } from './ui/BrandMark';
import { ExpansionStage, ExpansionStepConfig } from './stages/ExpansionStage';
import {
  IdeaDevelopmentStage,
  IdeaTurnConfig,
} from './stages/IdeaDevelopmentStage';
import { GuidedSelfTalkStage } from './stages/GuidedSelfTalkStage';
import { IndependentRecallStage } from './stages/IndependentRecallStage';

interface SpeakingWorkspaceProps {
  scene: SceneData;
  sessionMode?: SessionMode;
  contextKey?: PracticeContextKey;
  initialRootThought?: string;
  userLevel?: UserLevel;
  canFastTrack?: boolean;
  initialAutoMode?: boolean;
  onAutoModeChange?: (next: boolean) => void;
  onQuit: () => void;
  onCompleteSession: (result: SessionResultData) => void;
}

export const SpeakingWorkspace: React.FC<SpeakingWorkspaceProps> = ({
  scene,
  sessionMode = 'demo',
  contextKey = 'STUDY_WORKSPACE',
  initialRootThought,
  userLevel = 'B1',
  canFastTrack = false,
  initialAutoMode = true,
  onAutoModeChange,
  onQuit,
  onCompleteSession,
}) => {
  // Default ON so recording a 1-take DevFest demo video is effortless; toggleable anytime to Real Mic
  const [autoMode, setAutoMode] = useState<boolean>(initialAutoMode);

  const handleToggleAutoMode = () => {
    setAutoMode((prev) => {
      const next = !prev;
      onAutoModeChange?.(next);
      return next;
    });
  };

  const adapter: IPracticeAdapter = useMemo(() => {
    return sessionMode === 'demo' && autoMode
      ? new DemoPracticeAdapter(contextKey)
      : new RealPracticeAdapter(contextKey, scene);
  }, [sessionMode, autoMode, contextKey, scene]);

  const ctx = adapter.contextData;
  const startingThought =
    initialRootThought?.trim() ||
    scene.initialSuggestedThought ||
    ctx.initialThought;

  const isCustomTopicScene = scene.title.trim() !== ctx.title.trim();
  const isCustomStarter =
    isCustomTopicScene ||
    startingThought.trim().toLowerCase() !==
      ctx.initialThought.trim().toLowerCase();

  const cleanRootSentence = startingThought.trim().replace(/[.!?]+$/, '');
  const expr0 = scene.suggestedExpressions[0];
  const expr1 = scene.suggestedExpressions[1];
  const expr2 = scene.suggestedExpressions[2];

  const [stageKey, setStageKey] = useState<LearningStageKey>('EXPANSION');
  const [subStep, setSubStep] = useState<number>(1);
  const [ideaTurnStep, setIdeaTurnStep] = useState<number>(1);
  const [framework, setFramework] = useState<FrameworkType>(
    scene.suggestedFramework || '5W1H'
  );

  const [accumulatedThought, setAccumulatedThought] =
    useState<string>(startingThought);
  const [acceptedExpansions, setAcceptedExpansions] = useState<string[]>([
    startingThought,
  ]);
  const [ideaAnswers, setIdeaAnswers] = useState<string[]>([]);
  const [whyOrReasonAnswer, setWhyOrReasonAnswer] = useState<string>('');
  const [howOrExampleAnswer, setHowOrExampleAnswer] = useState<string>('');
  const [selfTalkTranscript, setSelfTalkTranscript] = useState<string>('');
  const [selfTalkDuration, setSelfTalkDuration] = useState<number>(24);

  const [, setActiveDraft] = useState<VoiceDraft | null>(null);
  const [resetSignal] = useState<number>(0);

  const [attempts, setAttempts] = useState<SpeakingAttempt[]>([]);
  const [hintEvents, setHintEvents] = useState<HintEvent[]>([]);
  const [isHintSheetOpen, setIsHintSheetOpen] = useState<boolean>(false);
  const [hintSheetTab, setHintSheetTab] = useState<'hints' | 'bridge'>('hints');
  const [activeHints, setActiveHints] = useState<{
    level1?: string;
    level2?: string;
    level3?: string;
    vietnameseRescue?: string;
  }>({
    level1: 'Name the specific feature, object, or activity.',
    level2: "Start with: I'm building... / I'm...",
    level3: ctx.expansion1Sample,
    vietnameseRescue:
      'Gợi ý: Thêm chi tiết cụ thể (tính năng, đồ vật hoặc thời điểm) để mở rộng câu.',
  });

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [inlineFeedback, setInlineFeedback] = useState<{
    type: 'success' | 'warning';
    message: string;
  } | null>(null);
  const [playingAudioKey, setPlayingAudioKey] = useState<string | null>(null);

  // Curated natural English progression for custom daily prompts & object starters
  const customProgression = useMemo(() => {
    if (!isCustomStarter) return null;

    // Case A: Custom Daily Prompt or Live Camera Scene (uses scene.suggestedExpressions[0..2].example)
    if (isCustomTopicScene) {
      const lowerRoot = cleanRootSentence.toLowerCase();
      const step1Tail = lowerRoot.includes('today')
        ? 'at my desk'
        : lowerRoot.startsWith("i'm ") || lowerRoot.startsWith("it's ")
          ? 'this morning'
          : lowerRoot.includes('extra day')
            ? 'on this task'
            : 'this week';
      const exp1NoDot = `${cleanRootSentence} ${step1Tail}`;
      const exp1 = `${exp1NoDot}.`;

      const rawEx0 = expr0?.example?.trim() || `${cleanRootSentence} with a clear plan.`;
      const cleanedEx0 = rawEx0
        .replace(/^(today,?\s+|right now,?\s+)/i, '')
        .replace(/\bthis morning\b/gi, 'today')
        .trim();
      const loweredEx0 =
        cleanedEx0.startsWith('I ') || cleanedEx0.startsWith("I'")
          ? cleanedEx0
          : `${cleanedEx0.charAt(0).toLowerCase()}${cleanedEx0.slice(1)}`;
      const exp2 =
        rawEx0.toLowerCase() === startingThought.trim().toLowerCase()
          ? `${exp1NoDot} so everything stays on track.`
          : `${exp1NoDot} — ${loweredEx0}`;

      const exp2NoDot = exp2.replace(/[.!?]+$/, '');
      const exp3 = lowerRoot.includes('track')
        ? `${exp2NoDot} right away.`
        : `${exp2NoDot} so everything stays on track.`;

      const rawEx1 =
        expr1?.example?.trim() ||
        'Because it helps me stay focused and organized today.';
      const whyLine =
        /^(because|since|one|clear|bullet|main)\b/i.test(rawEx1) ||
        /\b(help|helps|easier|need|should)\b/i.test(rawEx1)
          ? rawEx1
          : `Because ${
              rawEx1.startsWith('I ') || rawEx1.startsWith("I'")
                ? rawEx1
                : `${rawEx1.charAt(0).toLowerCase()}${rawEx1.slice(1)}`
            }`;

      const rawEx2 =
        expr2?.example?.trim() ||
        "First, I'll focus on the most important step right away.";
      const howLine = rawEx2;
      const pointLine = `I believe tackling “${scene.title.toLowerCase()}” with a clear structure works best.`;
      const exampleLine = /^for example\b/i.test(rawEx2)
        ? rawEx2
        : `For example, today ${
            rawEx2.startsWith('I ') || rawEx2.startsWith("I'")
              ? rawEx2
              : `${rawEx2.charAt(0).toLowerCase()}${rawEx2.slice(1)}`
          }`;

      const selfTalk = `${rawEx0}. Maybe something small could slow me down if I rush. ${rawEx2}`;
      const recall = `${exp3} ${whyLine} Maybe a small obstacle could come up, so ${
        rawEx2.startsWith('I ') || rawEx2.startsWith("I'")
          ? rawEx2
          : `${rawEx2.charAt(0).toLowerCase()}${rawEx2.slice(1)}`
      }`;

      return {
        exp1,
        exp1Example: 'e.g. this morning, at my desk...',
        exp2,
        exp2Example: expr0?.phrase
          ? `e.g. “${expr0.phrase}”`
          : 'e.g. add your main goal...',
        exp3,
        exp3Example: 'e.g. so everything stays on track...',
        whyLine,
        howLine,
        pointLine,
        reasonLine: whyLine,
        exampleLine,
        selfTalkPrompt: `Continue your story for “${scene.title}”: notice what could slow you down and decide your next move.`,
        selfTalk: selfTalk.replace(/\.\./g, '.'),
        recallPrompt: `Tell your complete story for “${scene.title}” — what is happening, why it matters, and what you will do next.`,
        recall,
      };
    }

    // Case B: Learner picked an object/expression starter on one of the 3 visual scenes
    const lowerRoot = cleanRootSentence.toLowerCase();
    const exp1 =
      contextKey === 'MORNING_COFFEE'
        ? lowerRoot.includes('table')
          ? `${cleanRootSentence} right now.`
          : `${cleanRootSentence} at my sunlit table.`
        : contextKey === 'PLANNING_DAY'
          ? lowerRoot.includes('notebook')
            ? `${cleanRootSentence} at my quiet desk.`
            : `${cleanRootSentence} in my notebook.`
          : lowerRoot.includes('login')
            ? `${cleanRootSentence} at my desk.`
            : `${cleanRootSentence} to build a login page.`;

    const exp1NoDot = exp1.replace(/[.!?]+$/, '');
    const exp2 =
      contextKey === 'MORNING_COFFEE'
        ? lowerRoot.includes('class')
          ? `${exp1NoDot} this morning.`
          : `${exp1NoDot} before my morning class.`
        : contextKey === 'PLANNING_DAY'
          ? lowerRoot.includes('assignment')
            ? `${exp1NoDot} this week.`
            : `${exp1NoDot} for two assignments this week.`
          : lowerRoot.includes('project')
            ? `${exp1NoDot} tonight.`
            : `${exp1NoDot} for my university project.`;

    const exp2NoDot = exp2.replace(/[.!?]+$/, '');
    const exp3 =
      contextKey === 'MORNING_COFFEE'
        ? `${exp2NoDot} so I feel calm and prepared.`
        : contextKey === 'PLANNING_DAY'
          ? `${exp2NoDot} so I don't feel overwhelmed.`
          : `${exp2NoDot} so students can sign in securely.`;

    const pointSample =
      contextKey === 'MORNING_COFFEE'
        ? 'I prefer having ten quiet minutes with coffee before morning class.'
        : contextKey === 'PLANNING_DAY'
          ? 'I prefer tackling my hardest assignment first in the morning.'
          : 'I prefer building secure authentication before designing the rest of the app.';

    return {
      exp1,
      exp1Example:
        contextKey === 'MORNING_COFFEE'
          ? 'e.g. at my sunlit table...'
          : contextKey === 'PLANNING_DAY'
            ? 'e.g. in my notebook...'
            : 'e.g. to build a login page...',
      exp2,
      exp2Example:
        contextKey === 'MORNING_COFFEE'
          ? 'e.g. before my morning class...'
          : contextKey === 'PLANNING_DAY'
            ? 'e.g. for two assignments this week...'
            : 'e.g. for my university project...',
      exp3,
      exp3Example:
        contextKey === 'MORNING_COFFEE'
          ? 'e.g. so I feel calm and prepared...'
          : contextKey === 'PLANNING_DAY'
            ? "e.g. so I don't feel overwhelmed..."
            : 'e.g. so students can sign in securely...',
      whyLine: ctx.whySample,
      howLine: ctx.howSample,
      pointLine: pointSample,
      reasonLine:
        ctx.reasonSample ||
        'Because securing student accounts early keeps the rest of the app safe.',
      exampleLine:
        ctx.exampleSample ||
        'For example, yesterday I tested protected routes before building the dashboard.',
      selfTalkPrompt: ctx.selfTalkPrompt,
      selfTalk: ctx.selfTalkMonologue,
      recallPrompt: ctx.independentRecallPrompt,
      recall: ctx.independentRecallSample,
    };
  }, [
    isCustomStarter,
    isCustomTopicScene,
    cleanRootSentence,
    startingThought,
    expr0,
    expr1,
    expr2,
    scene.title,
    contextKey,
    ctx,
  ]);

  const expansionSteps: ExpansionStepConfig[] = useMemo(() => {
    if (customProgression) {
      return [
        {
          stepNum: 1,
          title: 'where, when, or target.',
          example: customProgression.exp1Example,
          sample: customProgression.exp1,
          repeatTrap: cleanRootSentence.toLowerCase(),
        },
        {
          stepNum: 2,
          title: 'project or context.',
          example: customProgression.exp2Example,
          sample: customProgression.exp2,
        },
        {
          stepNum: 3,
          title: 'purpose or outcome.',
          example: customProgression.exp3Example,
          sample: customProgression.exp3,
        },
      ];
    }

    if (contextKey === 'MORNING_COFFEE') {
      return [
        {
          stepNum: 1,
          title: 'where you are.',
          example: 'e.g. at my sunlit table...',
          sample: "I'm drinking coffee at my sunlit table.",
          repeatTrap: ctx.expansion1IncorrectSample,
        },
        {
          stepNum: 2,
          title: 'when this happens.',
          example: 'e.g. before my morning class...',
          sample: "I'm drinking coffee at my sunlit table before my morning class.",
        },
        {
          stepNum: 3,
          title: 'purpose or feeling.',
          example: 'e.g. so I feel focused...',
          sample:
            "I'm drinking coffee at my sunlit table before my morning class so I feel focused.",
        },
      ];
    }

    if (contextKey === 'PLANNING_DAY') {
      return [
        {
          stepNum: 1,
          title: 'where or how.',
          example: 'e.g. in my notebook...',
          sample: "I'm planning my day in my notebook.",
          repeatTrap: ctx.expansion1IncorrectSample,
        },
        {
          stepNum: 2,
          title: 'what tasks await.',
          example: 'e.g. for two big assignments...',
          sample: "I'm planning my day in my notebook for two big assignments.",
        },
        {
          stepNum: 3,
          title: 'deadline or timing.',
          example: "e.g. before Friday's deadline...",
          sample:
            "I'm planning my day in my notebook for two big assignments before Friday's deadline.",
        },
      ];
    }

    return [
      {
        stepNum: 1,
        title: 'what you are coding.',
        example: 'e.g. a login page, an app feature...',
        sample: "I'm coding a login page.",
        repeatTrap: ctx.expansion1IncorrectSample,
      },
      {
        stepNum: 2,
        title: 'which project.',
        example: 'e.g. for my university project...',
        sample: "I'm coding a login page for my university project.",
      },
      {
        stepNum: 3,
        title: 'where or when.',
        example: 'e.g. on my laptop tonight...',
        sample:
          "I'm coding a login page for my university project on my laptop tonight.",
      },
    ];
  }, [customProgression, cleanRootSentence, contextKey, ctx]);

  const ideaTurns: IdeaTurnConfig[] = useMemo(() => {
    const basePointSample =
      contextKey === 'MORNING_COFFEE'
        ? 'I prefer having ten quiet minutes with coffee before morning class.'
        : contextKey === 'PLANNING_DAY'
          ? 'I prefer tackling my hardest assignment first in the morning.'
          : 'I prefer building secure authentication before designing the rest of the app.';

    if (customProgression) {
      if (framework === 'IDEA_REASON_EXAMPLE') {
        return [
          {
            turnNum: 1,
            questionKey: 'Point',
            prompt: 'State your main opinion or priority on this task.',
            helper: 'Start with I prefer..., I believe..., or My priority is...',
            sample: customProgression.pointLine,
          },
          {
            turnNum: 2,
            questionKey: 'Reason',
            prompt: 'Why do you hold that view?',
            helper: 'Share one personal reason or benefit.',
            sample: customProgression.reasonLine,
          },
          {
            turnNum: 3,
            questionKey: 'Example',
            prompt: 'Can you share a quick concrete example?',
            helper: 'Mention a specific moment from today or this week.',
            sample: customProgression.exampleLine,
          },
        ];
      }

      return [
        {
          turnNum: 1,
          questionKey: 'Why',
          prompt: 'Why is this important right now?',
          helper: 'Explain your main purpose or motivation.',
          sample: customProgression.whyLine,
        },
        {
          turnNum: 2,
          questionKey: 'How',
          prompt: 'How will you handle or do it?',
          helper: 'Describe your next practical step or tool.',
          sample: customProgression.howLine,
        },
      ];
    }

    if (framework === 'IDEA_REASON_EXAMPLE') {
      return [
        {
          turnNum: 1,
          questionKey: 'Point',
          prompt:
            ctx.pointPrompt ||
            'State your main opinion or priority on this topic.',
          helper: 'Open with I prefer..., I believe..., or My priority is...',
          sample: ctx.pointSample || basePointSample,
        },
        {
          turnNum: 2,
          questionKey: 'Reason',
          prompt: ctx.reasonPrompt || 'Why do you think or prefer this?',
          helper: 'Share the main reason or benefit.',
          sample:
            ctx.reasonSample ||
            'Because securing student accounts early keeps the rest of the app safe.',
        },
        {
          turnNum: 3,
          questionKey: 'Example',
          prompt: ctx.examplePrompt || 'Can you share a concrete example?',
          helper: 'Mention a specific moment such as yesterday or this morning.',
          sample:
            ctx.exampleSample ||
            'For example, yesterday I tested protected routes before building the dashboard.',
        },
      ];
    }

    return [
      {
        turnNum: 1,
        questionKey: 'Why',
        prompt: ctx.whyPrompt,
        helper: 'Explain the purpose, user need, or motivation.',
        sample: ctx.whySample,
      },
      {
        turnNum: 2,
        questionKey: 'How',
        prompt: ctx.howPrompt,
        helper: 'Describe the tools, framework, or steps you use.',
        sample: ctx.howSample,
      },
    ];
  }, [customProgression, framework, contextKey, ctx]);

  const effectiveSelfTalkPrompt = customProgression
    ? customProgression.selfTalkPrompt
    : ctx.selfTalkPrompt;

  const effectiveSelfTalkMonologue = customProgression
    ? customProgression.selfTalk
    : ctx.selfTalkMonologue;

  const effectiveRecallPrompt = customProgression
    ? customProgression.recallPrompt
    : ctx.independentRecallPrompt;

  const effectiveRecallSample = customProgression
    ? customProgression.recall
    : ctx.independentRecallSample;

  const recordHintEvent = (
    level: 1 | 2 | 3 = 1,
    isVietnameseRescue = false,
    overrideStage?: LearningStageKey
  ) => {
    const targetStage = overrideStage || stageKey;
    setHintEvents((prev) => [
      ...prev,
      {
        stageKey: targetStage,
        questionId: `${targetStage}_${
          targetStage === 'IDEA_DEVELOPMENT' ? ideaTurnStep : subStep
        }`,
        hintLevel: level,
        isVietnameseRescue,
        timestamp: Date.now(),
      },
    ]);
  };

  const handleOpenHintSheet = () => {
    setHintSheetTab('hints');
    setIsHintSheetOpen(true);
    recordHintEvent(1, false);
  };

  const handleOpenConceptBridge = () => {
    setHintSheetTab('bridge');
    setIsHintSheetOpen(true);
    recordHintEvent(1, true);
  };

  const handlePlaySentence = (text: string, key: string) => {
    setPlayingAudioKey(key);
    playPronunciation(text);
    window.setTimeout(() => setPlayingAudioKey(null), 2000);
  };

  const handleSubmitAttempt = async (
    text: string,
    source: InputMode,
    durationSeconds = 4
  ) => {
    setIsSubmitting(true);
    setInlineFeedback(null);
    const attemptId = `att_${Date.now()}`;

    // METHOD 01: SENTENCE EXPANSION (Steps 1..2)
    if (stageKey === 'EXPANSION') {
      const evaluation = await adapter.evaluateExpansion(
        accumulatedThought,
        text,
        subStep
      );

      const newAttemptObj: SpeakingAttempt = {
        attemptId,
        questionId: `EXP_${subStep}`,
        stageKey: 'EXPANSION',
        source,
        userText: text,
        isValid: evaluation.isValid,
        outcome: evaluation.outcome,
        feedback: evaluation.feedback,
        addedInformation: evaluation.addedWords.join(', '),
        durationSeconds,
        timestamp: Date.now(),
      };
      setAttempts((prev) => [...prev, newAttemptObj]);
      setActiveHints({
        level1: evaluation.hintL1,
        level2: evaluation.hintL2,
        level3: evaluation.hintL3,
        vietnameseRescue: evaluation.vietnameseRescue,
      });

      if (evaluation.isValid && evaluation.synthesizedThought) {
        const nextSynthesized = evaluation.synthesizedThought;
        setAccumulatedThought(nextSynthesized);
        setAcceptedExpansions((prev) => [...prev, nextSynthesized]);
        setActiveDraft(null);
        setIsSubmitting(false);

        if (subStep >= expansionSteps.length) {
          const detectedFw = determineFramework(nextSynthesized);
          setFramework(detectedFw);
          setIdeaTurnStep(1);
          setStageKey('IDEA_DEVELOPMENT');
          setActiveHints({
            level1: 'Explain who benefits or what problem this solves.',
            level2: 'Start with: Students need to... / Because...',
            level3: ctx.whySample,
            vietnameseRescue: 'Gợi ý: Giải thích lý do tại sao việc này quan trọng.',
          });
        } else {
          setSubStep(subStep + 1);
          const nextStepCfg = expansionSteps[subStep];
          setActiveHints({
            level1: `Add ${nextStepCfg?.title || 'one more short detail'}`,
            level2: `Repeat the line above + ${nextStepCfg?.example || 'a short chunk'}`,
            level3: nextStepCfg?.sample || ctx.expansion2Sample,
            vietnameseRescue:
              'Gợi ý: Đọc lại nguyên câu ở bậc trên và nối thêm cụm ngắn màu xanh ở bậc mới.',
          });
        }
      } else {
        setIsSubmitting(false);
        setInlineFeedback({ type: 'warning', message: evaluation.feedback });
      }
      return;
    }

    // METHOD 02: DEVELOP YOUR IDEA (5W1H: Why & How | P.R.E: Point, Reason, Example)
    if (stageKey === 'IDEA_DEVELOPMENT') {
      const currentTurn = ideaTurns[ideaTurnStep - 1];
      const priorAnswer =
        ideaTurnStep > 1 ? ideaAnswers[ideaTurnStep - 2] || '' : '';
      const evaluation = await adapter.evaluateIdeaTurn(
        currentTurn.questionKey,
        text,
        priorAnswer
      );

      const newAttemptObj: SpeakingAttempt = {
        attemptId,
        questionId: `IDEA_${currentTurn.questionKey}`,
        stageKey: 'IDEA_DEVELOPMENT',
        source,
        userText: text,
        isValid: evaluation.isValid,
        outcome: evaluation.outcome,
        feedback: evaluation.feedback,
        durationSeconds,
        timestamp: Date.now(),
      };
      setAttempts((prev) => [...prev, newAttemptObj]);
      setActiveHints({
        level1: evaluation.hintL1,
        level2: evaluation.hintL2,
        level3: evaluation.hintL3,
        vietnameseRescue: evaluation.vietnameseRescue,
      });

      if (evaluation.isValid) {
        setActiveDraft(null);
        setIsSubmitting(false);
        const nextAnswers = [...ideaAnswers];
        nextAnswers[ideaTurnStep - 1] = text;
        setIdeaAnswers(nextAnswers);

        if (currentTurn.questionKey === 'Why' || currentTurn.questionKey === 'Reason') {
          setWhyOrReasonAnswer(text);
        } else if (
          currentTurn.questionKey === 'How' ||
          currentTurn.questionKey === 'Example'
        ) {
          setHowOrExampleAnswer(text);
        }

        if (ideaTurnStep < ideaTurns.length) {
          setIdeaTurnStep(ideaTurnStep + 1);
        } else {
          setStageKey('GUIDED_SELF_TALK');
        }
      } else {
        setIsSubmitting(false);
        setInlineFeedback({ type: 'warning', message: evaluation.feedback });
      }
      return;
    }

    // METHOD 03: GUIDED SELF-TALK
    if (stageKey === 'GUIDED_SELF_TALK') {
      const evaluation = await adapter.evaluateSelfTalk(text);
      const spokenSecs = Math.max(16, durationSeconds || 22);
      setAttempts((prev) => [
        ...prev,
        {
          attemptId,
          questionId: 'SELFTALK_1',
          stageKey: 'GUIDED_SELF_TALK',
          source,
          userText: text,
          isValid: evaluation.isValid,
          outcome: 'VALID_SELF_TALK',
          feedback: evaluation.feedback,
          durationSeconds: spokenSecs,
          timestamp: Date.now(),
        },
      ]);

      if (!evaluation.isValid) {
        setIsSubmitting(false);
        setInlineFeedback({ type: 'warning', message: evaluation.feedback });
        return;
      }

      setSelfTalkTranscript(text);
      setSelfTalkDuration(spokenSecs);
      setActiveDraft(null);
      setIsSubmitting(false);
      setStageKey('INDEPENDENT_RECALL');
      return;
    }

    // METHOD 04: REPEAT WITHOUT HELP (INDEPENDENT RECALL)
    if (stageKey === 'INDEPENDENT_RECALL') {
      const recallHintUsed = hintEvents.some(
        (h) => h.stageKey === 'INDEPENDENT_RECALL'
      );
      const referenceThoughts = [
        accumulatedThought,
        ...ideaAnswers,
        whyOrReasonAnswer,
        howOrExampleAnswer,
        selfTalkTranscript,
      ].filter(Boolean);

      const evaluation = await adapter.evaluateRecall(
        text,
        recallHintUsed,
        referenceThoughts
      );

      if (!evaluation.isValid) {
        setIsSubmitting(false);
        setInlineFeedback({
          type: 'warning',
          message: evaluation.improvement,
        });
        return;
      }

      const recallSecs = Math.max(20, durationSeconds || 26);
      const finalAttempt: SpeakingAttempt = {
        attemptId,
        questionId: 'RECALL_1',
        stageKey: 'INDEPENDENT_RECALL',
        source,
        userText: text,
        isValid: evaluation.isValid,
        outcome: 'VALID_RECALL',
        feedback: evaluation.strength,
        durationSeconds: recallSecs,
        timestamp: Date.now(),
      };
      const allSessionAttempts = [...attempts, finalAttempt];
      setAttempts(allSessionAttempts);

      const expansionAttemptsCount = allSessionAttempts.filter(
        (a) => a.stageKey === 'EXPANSION'
      ).length;

      const fallbackWhy =
        ideaTurns.find((t) => t.questionKey === 'Why' || t.questionKey === 'Reason')
          ?.sample || ctx.whySample;
      const fallbackHow =
        ideaTurns.find((t) => t.questionKey === 'How' || t.questionKey === 'Example')
          ?.sample || ctx.howSample;

      const computedMetrics = computeSessionMetrics({
        initialThought: acceptedExpansions[0] || startingThought,
        acceptedExpansions,
        expansionTotalAttempts: expansionAttemptsCount,
        whyAnswer: whyOrReasonAnswer || fallbackWhy,
        howAnswer: howOrExampleAnswer || fallbackHow,
        selfTalkTranscript: selfTalkTranscript || effectiveSelfTalkMonologue,
        independentRecallTranscript: text,
        recallIdeasIdentified: evaluation.ideasIdentified,
        hintEvents,
        attempts: allSessionAttempts.map((a) => ({
          source: a.source,
          durationSeconds: a.durationSeconds,
          isValid: a.isValid,
        })),
        selfTalkDurationSeconds: selfTalkDuration,
        recallDurationSeconds: recallSecs,
        stagesCompleted: 4,
      });

      let serverFeedback: {
        strength?: string;
        improvement?: string;
        independentExpressionsUsed?: string[];
        suggestedNextPractice?: string;
        naturalUpgrade?: NaturalPhrasingUpgrade;
      } = {};

      if ((sessionMode === 'real' || !autoMode) && typeof fetch !== 'undefined') {
        try {
          const res = await fetch('/api/evaluate-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sceneTitle: scene.title,
              initialThought: acceptedExpansions[0] || startingThought,
              expansionSentences: acceptedExpansions.slice(1),
              developmentSentences:
                ideaAnswers.length > 0
                  ? ideaAnswers
                  : [whyOrReasonAnswer, howOrExampleAnswer].filter(Boolean),
              selfTalkTranscript,
              independentRecallTranscript: text,
              hintsUsedCount: hintEvents.length,
              selfTalkDurationSeconds:
                computedMetrics.speechContinuity.totalSpeakingSeconds,
              isDemoSession: false,
            }),
          });
          if (res.ok) {
            serverFeedback = await res.json();
          }
        } catch {
          // Graceful local fallback
        }
      }

      setIsSubmitting(false);

      const detectedExpressions =
        serverFeedback.independentExpressionsUsed &&
        serverFeedback.independentExpressionsUsed.length > 0
          ? serverFeedback.independentExpressionsUsed
          : scene.suggestedExpressions.map((e) => e.phrase);

      const resolvedNaturalUpgrade: NaturalPhrasingUpgrade =
        serverFeedback.naturalUpgrade ||
        buildNaturalUpgrade({
          initialThought: acceptedExpansions[0] || startingThought,
          expandedThought: accumulatedThought,
          selfTalkMonologue: selfTalkTranscript || effectiveSelfTalkMonologue,
          independentRecall: text,
          sceneTitle: scene.title,
        });

      const finalResult: SessionResultData = {
        id: `sess_${Date.now()}`,
        timestamp: Date.now(),
        sceneTitle: scene.title,
        sceneImageUrl: scene.imageUrl,
        isDemoSession: sessionMode === 'demo' && autoMode,
        frameworkUsed: framework,
        objectsLearned: scene.objects,
        expressionsLearned: scene.suggestedExpressions,
        thoughtJourney: {
          initialThought: acceptedExpansions[0] || startingThought,
          expandedThought:
            framework === 'IDEA_REASON_EXAMPLE' && ideaAnswers[0]
              ? ideaAnswers[0]
              : accumulatedThought,
          purposeWhy: whyOrReasonAnswer || fallbackWhy,
          methodHow: howOrExampleAnswer || fallbackHow,
          selfTalkMonologue: selfTalkTranscript || effectiveSelfTalkMonologue,
          independentRecall: text,
        },
        metrics: computedMetrics,
        naturalUpgrade: resolvedNaturalUpgrade,
        selfTalkDuration: computedMetrics.speechContinuity.totalSpeakingSeconds,
        totalHintsUsed: computedMetrics.hintUsage.totalHintsUsed,
        ideasExpressedCount: computedMetrics.meaningfulIdeaUnits,
        independentExpressionsUsed: detectedExpressions,
        communicationStrength:
          serverFeedback.strength || ctx.speakingStrength || evaluation.strength,
        oneThingToImprove:
          serverFeedback.improvement ||
          ctx.actionableImprovement ||
          evaluation.improvement,
        suggestedNextPractice:
          serverFeedback.suggestedNextPractice || ctx.nextPracticeSuggestion,
      };

      onCompleteSession(finalResult);
    }
  };

  const showFastTrack = canFastTrack || userLevel === 'B1';

  const handleSkipToSelfTalk = () => {
    const fastExpanded =
      expansionSteps[expansionSteps.length - 1]?.sample ||
      expansionSteps[0]?.sample ||
      startingThought;
    setInlineFeedback(null);
    setActiveDraft(null);
    setAccumulatedThought(fastExpanded);
    setAcceptedExpansions([startingThought, fastExpanded]);
    setIdeaAnswers(ideaTurns.map((t) => t.sample));
    setWhyOrReasonAnswer(
      ideaTurns.find((t) => t.questionKey === 'Why' || t.questionKey === 'Reason')
        ?.sample || ctx.whySample
    );
    setHowOrExampleAnswer(
      ideaTurns.find((t) => t.questionKey === 'How' || t.questionKey === 'Example')
        ?.sample || ctx.howSample
    );
    setStageKey('GUIDED_SELF_TALK');
  };

  return (
    <div className="relative w-full min-h-[100dvh] bg-[#FAF9F6] text-[#0F1F18] px-4 sm:px-5 pt-3 pb-5 flex flex-col justify-between gap-3 select-none safe-top safe-bottom overflow-x-clip">
      <AmbientMintArc />

      {stageKey === 'EXPANSION' && (
        <ExpansionStage
          scene={scene}
          subStep={subStep}
          userLevel={userLevel}
          autoMode={autoMode}
          onToggleAuto={handleToggleAutoMode}
          onBack={() => {
            if (subStep > 1) {
              setInlineFeedback(null);
              setActiveDraft(null);
              setSubStep((s) => s - 1);
            } else {
              onQuit();
            }
          }}
          initialThought={startingThought}
          acceptedExpansions={acceptedExpansions}
          expansionSteps={expansionSteps}
          inlineFeedback={inlineFeedback}
          playingAudioKey={playingAudioKey}
          onPlaySentence={handlePlaySentence}
          onSubmitAttempt={handleSubmitAttempt}
          onDraftChange={setActiveDraft}
          resetSignal={resetSignal}
          isSubmitting={isSubmitting}
          sessionMode={sessionMode}
          onOpenHint={handleOpenHintSheet}
          onOpenConceptBridge={handleOpenConceptBridge}
          onSkipToSelfTalk={showFastTrack ? handleSkipToSelfTalk : undefined}
        />
      )}

      {stageKey === 'IDEA_DEVELOPMENT' && (
        <IdeaDevelopmentStage
          scene={scene}
          turnStep={ideaTurnStep}
          userLevel={userLevel}
          framework={framework}
          onChangeFramework={(fw) => {
            setFramework(fw);
            setIdeaTurnStep(1);
            setIdeaAnswers([]);
            setWhyOrReasonAnswer('');
            setHowOrExampleAnswer('');
            setInlineFeedback(null);
            setActiveDraft(null);
          }}
          autoMode={autoMode}
          onToggleAuto={handleToggleAutoMode}
          onBack={() => {
            if (ideaTurnStep > 1) {
              setInlineFeedback(null);
              setActiveDraft(null);
              setIdeaTurnStep((t) => t - 1);
            } else {
              setStageKey('EXPANSION');
              setSubStep(
                Math.min(
                  expansionSteps.length,
                  acceptedExpansions.length - 1
                ) || 1
              );
            }
          }}
          expandedThought={accumulatedThought}
          completedAnswers={ideaAnswers}
          turns={ideaTurns}
          inlineFeedback={inlineFeedback}
          playingAudioKey={playingAudioKey}
          onPlaySentence={handlePlaySentence}
          onSubmitAttempt={handleSubmitAttempt}
          onDraftChange={setActiveDraft}
          resetSignal={resetSignal}
          isSubmitting={isSubmitting}
          sessionMode={sessionMode}
          onOpenHint={handleOpenHintSheet}
          onOpenConceptBridge={handleOpenConceptBridge}
        />
      )}

      {stageKey === 'GUIDED_SELF_TALK' && (
        <GuidedSelfTalkStage
          scene={scene}
          storySentences={
            framework === 'IDEA_REASON_EXAMPLE' && ideaAnswers.length > 0
              ? ideaAnswers
              : [accumulatedThought, ...ideaAnswers].filter(Boolean)
          }
          userLevel={userLevel}
          autoMode={autoMode}
          onToggleAuto={handleToggleAutoMode}
          onBack={() => {
            setInlineFeedback(null);
            setStageKey('IDEA_DEVELOPMENT');
            setIdeaTurnStep(ideaTurns.length);
          }}
          selfTalkPrompt={effectiveSelfTalkPrompt}
          selfTalkMonologue={effectiveSelfTalkMonologue}
          thinkingPrompts={ctx.thinkingPrompts}
          inlineFeedback={inlineFeedback}
          onPlaySentence={handlePlaySentence}
          onSubmitAttempt={handleSubmitAttempt}
          isSubmitting={isSubmitting}
          sessionMode={sessionMode}
          onOpenHint={handleOpenHintSheet}
          onOpenConceptBridge={handleOpenConceptBridge}
        />
      )}

      {stageKey === 'INDEPENDENT_RECALL' && (
        <IndependentRecallStage
          userLevel={userLevel}
          autoMode={autoMode}
          onToggleAuto={handleToggleAutoMode}
          onBack={() => {
            setInlineFeedback(null);
            setStageKey('GUIDED_SELF_TALK');
          }}
          topicPrompt={effectiveRecallPrompt}
          recallSample={effectiveRecallSample}
          inlineFeedback={inlineFeedback}
          onSubmitAttempt={handleSubmitAttempt}
          isSubmitting={isSubmitting}
          sessionMode={sessionMode}
          onRecallCueUsed={() =>
            recordHintEvent(1, false, 'INDEPENDENT_RECALL')
          }
        />
      )}

      {(() => {
        const currentExpStep =
          expansionSteps[subStep - 1] || expansionSteps[0];
        const currentIdeaTurn =
          ideaTurns[ideaTurnStep - 1] || ideaTurns[0];

        const stepDefaultHints =
          stageKey === 'EXPANSION'
            ? subStep === 1
              ? {
                  level1: currentExpStep.title,
                  level2: `Start with: "${cleanRootSentence}..."`,
                  level3: currentExpStep.sample,
                  vietnameseRescue:
                    'Gợi ý: Giữ ý chính câu đầu và nói thêm 1 chi tiết cụ thể (bạn đang làm việc gì, với vật gì hoặc ở đâu).',
                }
              : {
                  level1: currentExpStep.title,
                  level2:
                    'Try adding: "...for my project" or "...so I can..."',
                  level3: currentExpStep.sample,
                  vietnameseRescue:
                    'Gợi ý: Nối thêm mục đích hoặc dự án/bối cảnh cụ thể vào cuối câu bạn vừa mở rộng.',
                }
            : stageKey === 'IDEA_DEVELOPMENT'
              ? {
                  level1: currentIdeaTurn.helper,
                  level2:
                    currentIdeaTurn.questionKey === 'Why' ||
                    currentIdeaTurn.questionKey === 'Reason'
                      ? 'Start with: "Because..." or "It helps me..."'
                      : currentIdeaTurn.questionKey === 'How'
                        ? 'Start with: "I\'m using..." or "First, I..."'
                        : 'Start with: "For example, earlier today..."',
                  level3: currentIdeaTurn.sample,
                  vietnameseRescue:
                    currentIdeaTurn.questionKey === 'Why' ||
                    currentIdeaTurn.questionKey === 'Reason'
                      ? 'Gợi ý: Bắt đầu bằng "Because..." để giải thích ngắn gọn lý do hoặc lợi ích.'
                      : 'Gợi ý: Nêu công cụ bạn dùng ("I\'m using...") hoặc 1 ví dụ thực tế ("For example,...").',
                }
              : {
                  level1:
                    'Connect 3 short beats: Notice what is happening → Maybe why → What you will do first.',
                  level2:
                    'Start with: "Something isn\'t working... Maybe... First, I\'ll..."',
                  level3: effectiveSelfTalkMonologue,
                  vietnameseRescue:
                    'Gợi ý: Tự nói thành tiếng theo 3 nhịp: (1) Vấn đề/tình huống hiện tại → (2) Đoán nguyên nhân ("Maybe...") → (3) Bước đầu tiên sẽ làm ("I should...").',
                };

        const resolvedHints = inlineFeedback ? activeHints : stepDefaultHints;

        return (
          <HintSheet
            isOpen={isHintSheetOpen}
            initialTab={hintSheetTab}
            userLevel={userLevel}
            onClose={() => setIsHintSheetOpen(false)}
            prompts={ctx.thinkingPrompts}
            level1={
              stageKey !== 'INDEPENDENT_RECALL'
                ? resolvedHints.level1
                : undefined
            }
            level2={
              stageKey !== 'INDEPENDENT_RECALL'
                ? resolvedHints.level2
                : undefined
            }
            level3={
              stageKey !== 'INDEPENDENT_RECALL'
                ? resolvedHints.level3
                : undefined
            }
            vietnameseRescue={
              stageKey !== 'INDEPENDENT_RECALL'
                ? resolvedHints.vietnameseRescue
                : undefined
            }
            sceneContext={scene.title}
            onUseHint={(lvl, isVn) => recordHintEvent(lvl, isVn)}
            onHintShown={() => recordHintEvent(1, false)}
          />
        );
      })()}
    </div>
  );
};
