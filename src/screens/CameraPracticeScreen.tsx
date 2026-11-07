import React, { useState, useMemo } from 'react';
import {
  Goal,
  Lightbulb,
  Languages,
  EyeOff,
  Check,
  Zap,
  AlertCircle,
} from 'lucide-react';
import { motion } from 'motion/react';
import {
  SceneData,
  DetectedObject,
  ContextualExpression,
  InputMode,
  SessionResultData,
  UserLevel,
  NaturalPhrasingUpgrade,
} from '../types';
import {
  computeSessionMetrics,
  extractThoughtChainNodes,
  buildNaturalUpgrade,
} from '../services/speakingEngine';
import { apiFetch } from '../services/apiClient';
import { VoiceInput, VoiceDraft } from '../components/VoiceInput';
import { HintSheet } from '../components/HintSheet';
import { WordDetailSheet } from '../components/WordDetailSheet';
import { RadiantRays } from '../components/RadiantRays';
import { AmbientMintArc } from '../components/ui/BrandMark';
import { PracticeHeader, SegmentStatus } from '../components/ui/PracticeHeader';
import { SurfaceCard } from '../components/ui/SurfaceCard';
import { ThoughtChainStrip } from '../components/ui/ThoughtChainStrip';
import { playPronunciation } from '../utils/audioUtils';

interface CameraPracticeScreenProps {
  scene: SceneData;
  userLevel?: UserLevel;
  apiKeyConnected?: boolean;
  onOpenApiSettings?: () => void;
  streakDays?: number;
  onBack: () => void;
  onCompleteSession: (result: SessionResultData) => void;
}

const FALLBACK_PIN_COORDS = [
  { x: 50, y: 36 },
  { x: 22, y: 64 },
  { x: 78, y: 56 },
  { x: 76, y: 77 },
];

/**
 * 90s Daily Sprint Workout (Busy-Day Retention Mode):
 * Step 1 (Label & Connect · 40s): Say 2+ labels aloud + state what's happening & why.
 * Step 2 (Blind Recall · 45s): Photo hides -> express the full thought & next move unassisted.
 */
export const CameraPracticeScreen: React.FC<CameraPracticeScreenProps> = ({
  scene,
  userLevel = 'B1',
  apiKeyConnected,
  onOpenApiSettings,
  onBack,
  onCompleteSession,
}) => {
  const [stepIdx, setStepIdx] = useState<number>(0);
  const [responses, setResponses] = useState<string[]>([]);
  const [spokenLabels, setSpokenLabels] = useState<Set<string>>(new Set());
  const [hintsUsed, setHintsUsed] = useState<number>(0);
  const [isHintOpen, setIsHintOpen] = useState<boolean>(false);
  const [hintTab, setHintTab] = useState<'hints' | 'bridge'>('hints');
  const [draft, setDraft] = useState<VoiceDraft | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [selectedWord, setSelectedWord] = useState<
    DetectedObject | ContextualExpression | null
  >(null);

  const hintVocabulary = useMemo(() => {
    const words = [
      ...scene.objects.map((o) => o.name),
      ...scene.suggestedExpressions.map((e) => e.phrase),
    ].filter(Boolean);
    return Array.from(new Set(words)).slice(0, 10);
  }, [scene]);

  const blueprint = scene.practiceBlueprint;
  const seedBase = (
    scene.initialSuggestedThought ||
    scene.objects[0]?.contextualSentence ||
    `I'm focusing on ${scene.title.toLowerCase()}.`
  ).replace(/[.!?]+$/, '');

  const sprintSamples = {
    step1:
      blueprint?.recall.sprintStep1Sample ||
      `${seedBase} right now because it helps me stay on top of my day.`,
    step2:
      blueprint?.recall.sprintStep2Sample ||
      `${seedBase} right now because it matters today. Maybe a small distraction could come up, so first I'll focus on the main step carefully.`,
  };

  const tasks = [
    {
      step: 1,
      badge: 'Step 1 of 2 · Label & Connect (40s)',
      prompt: `Tap 2 labels aloud, then say what you're doing in "${scene.title}" and why.`,
      viCue:
        'Nhiệm vụ: Chạm đọc to 2 nhãn trên ảnh, rồi nói 1–2 câu bạn đang làm gì và vì sao.',
      sample: sprintSamples.step1,
    },
    {
      step: 2,
      badge: 'Step 2 of 2 · Blind Sprint Recall (45s)',
      prompt:
        'Without looking at the photo, connect what is happening, any challenge, and your next step.',
      viCue:
        'Nhiệm vụ: Ảnh đã ẩn — tự nói lại mạch ý trọn vẹn kèm bước tiếp theo bạn sẽ làm.',
      sample: sprintSamples.step2,
    },
  ];

  const currentTask = tasks[stepIdx] || tasks[0];
  const segments: SegmentStatus[] = tasks.map((_, idx) =>
    idx <= stepIdx ? 'solid' : 'empty'
  );

  const pins = (scene.objects.length > 0 ? scene.objects : [])
    .slice(0, 4)
    .map((obj, idx) => {
      const fb = FALLBACK_PIN_COORDS[idx % FALLBACK_PIN_COORDS.length];
      const left = Math.min(80, Math.max(20, obj.xPercent ?? fb.x));
      const top = Math.min(78, Math.max(18, obj.yPercent ?? fb.y));
      return {
        label: obj.name.toLowerCase(),
        style: { left: `${left}%`, top: `${top}%` } as React.CSSProperties,
        item: obj,
      };
    });

  const handlePinTap = (pin: (typeof pins)[number]) => {
    playPronunciation(pin.label);
    setSpokenLabels((prev) => {
      const next = new Set(prev);
      next.add(pin.label);
      return next;
    });
    setSelectedWord(pin.item);
  };

  const liveChain = extractThoughtChainNodes(draft?.text || '');

  const handleResponseSubmit = async (
    text: string,
    source: InputMode,
    durationSeconds: number
  ) => {
    const clean = text.trim();
    const wordCount = clean.split(/\s+/).filter(Boolean).length;
    if (wordCount < 4) {
      setWarningMessage(
        stepIdx === 0
          ? 'Please speak at least one complete English sentence connecting what you see and why.'
          : 'Please speak at least 2 connected English ideas from memory.'
      );
      return;
    }

    setWarningMessage(null);
    const nextResponses = [...responses, clean];
    setResponses(nextResponses);
    setDraft(null);

    if (stepIdx < tasks.length - 1) {
      setStepIdx((prev) => prev + 1);
      return;
    }

    setIsSubmitting(true);
    const firstTurn = nextResponses[0] || clean;
    const finalTurn = nextResponses[1] || clean;

    const metrics = computeSessionMetrics({
      initialThought: scene.initialSuggestedThought || firstTurn,
      acceptedExpansions: [scene.initialSuggestedThought || firstTurn, firstTurn],
      expansionTotalAttempts: 1,
      whyAnswer: firstTurn,
      howAnswer: finalTurn,
      selfTalkTranscript: finalTurn,
      independentRecallTranscript: finalTurn,
      recallIdeasIdentified: [
        'Core Activity & Context',
        'Purpose & Reasoning',
        'Next Immediate Step',
      ],
      hintEvents: Array.from({ length: hintsUsed }, (_, i) => ({
        stageKey: 'EXPANSION' as const,
        questionId: `SPRINT_${i}`,
        hintLevel: 1 as const,
        isVietnameseRescue: false,
        timestamp: Date.now(),
      })),
      attempts: nextResponses.map((_, idx) => ({
        source,
        durationSeconds: Math.max(idx === 0 ? 12 : 20, durationSeconds),
        isValid: true,
      })),
      selfTalkDurationSeconds: Math.max(12, durationSeconds),
      recallDurationSeconds: Math.max(20, durationSeconds),
      stagesCompleted: 4,
    });

    let serverFeedback: {
      strength?: string;
      improvement?: string;
      independentExpressionsUsed?: string[];
      suggestedNextPractice?: string;
      naturalUpgrade?: NaturalPhrasingUpgrade;
    } = {};

    try {
      const res = await apiFetch('/api/evaluate-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sceneTitle: scene.title,
          initialThought: firstTurn,
          expansionSentences: [firstTurn],
          developmentSentences: [firstTurn],
          selfTalkTranscript: finalTurn,
          independentRecallTranscript: finalTurn,
          hintsUsedCount: hintsUsed,
          selfTalkDurationSeconds: metrics.speechContinuity.totalSpeakingSeconds,
        }),
      });
      if (res.ok) {
        serverFeedback = await res.json();
      }
    } catch {
      // Graceful local fallback
    } finally {
      setIsSubmitting(false);
    }

    const naturalUpgrade =
      serverFeedback.naturalUpgrade ||
      buildNaturalUpgrade({
        initialThought: firstTurn,
        independentRecall: finalTurn,
        sceneTitle: scene.title,
      });

    const result: SessionResultData = {
      id: `sprint_${Date.now()}`,
      timestamp: Date.now(),
      sceneTitle: `${scene.title} · 90s Sprint`,
      sceneImageUrl: scene.imageUrl,
      isDemoSession: false,
      sessionType: 'daily_sprint',
      objectsLearned: scene.objects,
      expressionsLearned: scene.suggestedExpressions,
      thoughtJourney: {
        initialThought: firstTurn,
        expandedThought: firstTurn,
        purposeWhy: 'Connected directly in 90s Daily Sprint.',
        methodHow: `${spokenLabels.size} scene labels spoken aloud.`,
        selfTalkMonologue: finalTurn,
        independentRecall: finalTurn,
      },
      metrics,
      naturalUpgrade,
      selfTalkDuration: metrics.speechContinuity.totalSpeakingSeconds,
      totalHintsUsed: hintsUsed,
      ideasExpressedCount: Math.max(4, metrics.meaningfulIdeaUnits),
      independentExpressionsUsed:
        serverFeedback.independentExpressionsUsed &&
        serverFeedback.independentExpressionsUsed.length > 0
          ? serverFeedback.independentExpressionsUsed
          : scene.suggestedExpressions.slice(0, 3).map((e) => e.phrase),
      communicationStrength:
        serverFeedback.strength ||
        'Completed a 90s Daily Sprint — anchored scene labels directly into blind spoken recall.',
      oneThingToImprove:
        serverFeedback.improvement || naturalUpgrade.whyItHelps,
      suggestedNextPractice:
        serverFeedback.suggestedNextPractice ||
        'When you have 4 minutes, run the full 5-method workout on a new photo.',
    };

    onCompleteSession(result);
  };

  return (
    <div className="relative w-full flex-1 bg-[#FAF9F6] text-[#0F1F18] px-4 sm:px-5 pt-3 pb-5 flex flex-col justify-between gap-3 safe-top select-none overflow-x-clip">
      <AmbientMintArc />

      <div className="relative z-10 flex flex-col gap-3">
        <PracticeHeader
          onBack={() => {
            if (stepIdx > 0) {
              setStepIdx((s) => s - 1);
            } else {
              onBack();
            }
          }}
          centerMode="brand"
          rightMode={onOpenApiSettings ? 'api-status' : 'none'}
          apiKeyConnected={apiKeyConnected}
          onOpenApiSettings={onOpenApiSettings}
          stepLabel="90s Daily Sprint"
          stageSubtitle={`Step ${stepIdx + 1} of ${tasks.length}`}
          segments={segments}
        />

        <div className="mt-0.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#EAF6EE] text-[#148343] text-[11px] font-bold mb-1">
            {stepIdx === 0 ? (
              <Zap className="w-3 h-3 stroke-[2.4] shrink-0" />
            ) : (
              <EyeOff className="w-3 h-3 stroke-[2.3] shrink-0" />
            )}
            <span>{currentTask.badge}</span>
          </div>
          <h1 className="text-[25px] sm:text-[28px] font-extrabold tracking-[-0.028em] text-[#0D1F17] leading-[1.14] inline-flex items-start">
            <span>
              {stepIdx === 0 ? 'Label & connect fast.' : 'Speak from memory.'}
            </span>
            <RadiantRays className="w-6 h-6 -mt-2 ml-0.5" />
          </h1>
        </div>

        {stepIdx === 0 ? (
          <div className="relative w-full aspect-[16/9.6] rounded-[22px] overflow-hidden bg-[#1D2621] apple-shadow-md">
            {scene.imageUrl ? (
              <img
                src={scene.imageUrl}
                alt={scene.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#173024] to-[#0D1E16]" />
            )}
            <div className="absolute inset-0 bg-black/[0.05] pointer-events-none" />

            <div className="absolute top-2.5 left-2.5 z-10 bg-black/55 backdrop-blur-md text-white text-[11px] font-bold px-2.5 py-1 rounded-full tabular-nums">
              Labels spoken · {spokenLabels.size}/{pins.length}
            </div>

            {pins.map((pin) => {
              const isSpoken = spokenLabels.has(pin.label);
              return (
                <motion.button
                  key={pin.label}
                  whileTap={{ scale: 0.94 }}
                  type="button"
                  style={pin.style}
                  onClick={() => handlePinTap(pin)}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 z-10 text-[12px] font-bold px-3 py-1 rounded-full shadow-[0_4px_14px_rgba(0,0,0,0.13)] flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap ${
                    isSpoken
                      ? 'bg-[#148343] text-white'
                      : 'bg-white/96 backdrop-blur-md text-[#101E17] hover:bg-white'
                  }`}
                >
                  {isSpoken ? (
                    <Check className="w-3 h-3 stroke-[3] shrink-0" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#148343] shrink-0" />
                  )}
                  <span>{pin.label}</span>
                </motion.button>
              );
            })}
          </div>
        ) : (
          <SurfaceCard
            tone="elevated"
            radius="lg"
            padding="md"
            className="flex flex-col gap-2 px-3.5 py-3"
          >
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 text-[11.5px] font-bold text-[#148343]">
                <EyeOff className="w-3.5 h-3.5 stroke-[2.2]" />
                <span>Photo & labels hidden</span>
              </span>
              <span className="text-[11px] font-semibold text-[#5B6860]">
                Recall your full chain
              </span>
            </div>
            <ThoughtChainStrip
              nodes={liveChain.nodes}
              missingPrompt={liveChain.missingPrompt}
              showMissingPrompt
            />
          </SurfaceCard>
        )}

        <SurfaceCard
          tone="sage"
          radius="lg"
          padding="md"
          className="flex flex-col gap-1 px-4 py-3"
        >
          <div className="flex items-center gap-2 text-[#148343]">
            <Goal className="w-[17px] h-[17px] stroke-[2.2]" />
            <span className="text-[13px] font-bold">Sprint prompt</span>
          </div>
          <p className="text-[15px] sm:text-[16px] font-bold text-[#101E17] leading-[1.34]">
            {currentTask.prompt}
          </p>
          {userLevel === 'A2' && (
            <p className="text-[12px] font-medium text-[#4D5C54] leading-snug mt-0.5">
              {currentTask.viCue}
            </p>
          )}
        </SurfaceCard>
      </div>

      <div className="relative z-10 flex flex-col items-center gap-2.5 pt-1">
        {warningMessage && (
          <div className="w-full rounded-[12px] bg-amber-50 px-3 py-2 flex items-start gap-2 text-[12px] font-semibold text-amber-900 apple-shadow-xs">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
            <span>{warningMessage}</span>
          </div>
        )}

        <VoiceInput
          key={`cam_sprint_step_${stepIdx}`}
          size="medium"
          idleLabel={
            stepIdx === 0 ? 'Tap to connect aloud' : 'Tap for 45s blind recall'
          }
          sceneContext={scene.title}
          hintVocabulary={hintVocabulary}
          isSubmitting={isSubmitting}
          onSubmit={handleResponseSubmit}
          onDraftChange={setDraft}
          placeholder="Speak directly in English..."
        />

        <div className="flex items-center justify-center gap-2 flex-wrap pt-0.5">
          <button
            type="button"
            onClick={() => {
              setHintsUsed((h) => h + 1);
              setHintTab('hints');
              setIsHintOpen(true);
            }}
            className="h-9 px-3.5 rounded-full bg-white hover:bg-[#F3F5F3] text-[#18221D] text-[12px] font-bold inline-flex items-center gap-1.5 apple-shadow-xs transition-colors cursor-pointer whitespace-nowrap"
          >
            <Lightbulb className="w-3.5 h-3.5 text-[#148343] stroke-[2.2] shrink-0" />
            <span>
              {userLevel === 'A2' ? 'Gợi ý cách nói' : 'Need a hint?'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setHintsUsed((h) => h + 1);
              setHintTab('bridge');
              setIsHintOpen(true);
            }}
            className="h-9 px-3.5 rounded-full bg-[#EAF6EE] hover:bg-[#DCF0E4] text-[#148343] text-[12px] font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Languages className="w-3.5 h-3.5 stroke-[2.2] shrink-0" />
            <span>
              {userLevel === 'A2' ? 'Bí từ? · Bridge' : 'Stuck on a word?'}
            </span>
          </button>
        </div>
      </div>

      <HintSheet
        isOpen={isHintOpen}
        onClose={() => setIsHintOpen(false)}
        initialTab={hintTab}
        userLevel={userLevel}
        sceneContext={scene.title}
        quickVietnameseIdeas={blueprint?.quickVietnameseBridgeChips}
        level1={
          stepIdx === 0
            ? 'Name 1–2 objects you see and say why you are here.'
            : 'Recall what you are doing, why it matters, and your next move.'
        }
        level2={
          stepIdx === 0
            ? `Start with: "${currentTask.sample.split(/\s+/).slice(0, 4).join(' ')}..."`
            : 'Start with: "I\'m... so... First, I\'ll..."'
        }
        level3={currentTask.sample}
        vietnameseRescue={currentTask.viCue}
        prompts={[
          {
            category: 'NOTICE',
            categoryLabel: 'Objects',
            question: 'What objects are right in front of you?',
            helperText: scene.objects
              .slice(0, 3)
              .map((o) => o.name)
              .join(', '),
          },
          {
            category: 'CONSIDER',
            categoryLabel: 'Purpose',
            question: 'Why does this moment or task matter today?',
            helperText:
              scene.suggestedExpressions[0]?.phrase || 'stay focused and clear',
          },
          {
            category: 'DECIDE',
            categoryLabel: 'Next Move',
            question: 'What is the very first thing you will do next?',
            helperText: "Start with: First, I'll...",
          },
        ]}
      />

      <WordDetailSheet
        item={selectedWord}
        onClose={() => setSelectedWord(null)}
      />
    </div>
  );
};
