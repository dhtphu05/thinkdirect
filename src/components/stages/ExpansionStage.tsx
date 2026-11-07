import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Check,
  Lock,
  AlertCircle,
  Languages,
  ArrowRight,
  Zap,
  Lightbulb,
  Volume2,
  CornerDownRight,
  Maximize2,
} from 'lucide-react';
import { InputMode, SceneData, UserLevel } from '../../types';
import { VoiceInput, VoiceDraft } from '../VoiceInput';
import { PracticeHeader } from '../ui/PracticeHeader';
import { SurfaceCard } from '../ui/SurfaceCard';
import { MethodRoadmapStrip } from '../ui/MethodRoadmapStrip';
import { MethodGuideSheet } from '../ui/MethodGuideSheet';

export interface ExpansionStepConfig {
  stepNum: number;
  title: string;
  example: string;
  sample: string;
  repeatTrap?: string;
}

interface ExpansionStageProps {
  scene: SceneData;
  subStep: number;
  userLevel?: UserLevel;
  apiKeyConnected?: boolean;
  onOpenApiSettings?: () => void;
  hintVocabulary?: string[];
  onBack: () => void;
  initialThought: string;
  acceptedExpansions: string[];
  expansionSteps: ExpansionStepConfig[];
  inlineFeedback: { type: 'success' | 'warning'; message: string } | null;
  playingAudioKey: string | null;
  onPlaySentence: (text: string, key: string) => void;
  onSubmitAttempt: (
    text: string,
    source: InputMode,
    durationSeconds?: number
  ) => void;
  onDraftChange: (draft: VoiceDraft | null) => void;
  resetSignal: number;
  isSubmitting: boolean;
  onOpenHint: () => void;
  onOpenConceptBridge: () => void;
  onSkipToSelfTalk?: () => void;
}

/**
 * Splits an expanded sentence against the previous rung so the learner
 * visually sees: [Previous sentence] + [Newly added short chunk].
 */
function splitExpansionRung(
  prevSentence: string,
  targetSentence: string
): { basePart: string; addedPart: string } {
  const cleanPrev = prevSentence.trim().replace(/[.!?]+$/, '');
  const full = targetSentence.trim();

  if (
    cleanPrev &&
    full.toLowerCase().startsWith(cleanPrev.toLowerCase()) &&
    full.length > cleanPrev.length
  ) {
    return {
      basePart: full.slice(0, cleanPrev.length).trim(),
      addedPart: full.slice(cleanPrev.length).trim(),
    };
  }

  const prevWords = cleanPrev.split(/\s+/);
  const fullWords = full.split(/\s+/);
  let sharedCount = 0;
  while (
    sharedCount < prevWords.length &&
    sharedCount < fullWords.length &&
    prevWords[sharedCount].toLowerCase().replace(/[^a-z']/g, '') ===
      fullWords[sharedCount].toLowerCase().replace(/[^a-z']/g, '')
  ) {
    sharedCount++;
  }

  if (sharedCount > 0 && sharedCount < fullWords.length) {
    return {
      basePart: fullWords.slice(0, sharedCount).join(' '),
      addedPart: fullWords.slice(sharedCount).join(' '),
    };
  }

  return {
    basePart: '',
    addedPart: full,
  };
}

/**
 * Ensures an un-spoken target rung always builds directly on top of what the
 * learner ACTUALLY spoke on the previous rung, even if they customized their phrasing.
 */
function alignTargetWithSpokenPrev(
  spokenPrev: string,
  stepCfg: ExpansionStepConfig,
  prevTemplateSample: string
): string {
  const cleanSpokenPrev = spokenPrev.trim().replace(/[.!?]+$/, '');
  const rawSample = stepCfg.sample.trim();
  if (rawSample.toLowerCase().startsWith(cleanSpokenPrev.toLowerCase())) {
    return rawSample;
  }
  const templateDelta = splitExpansionRung(prevTemplateSample, rawSample);
  if (templateDelta.basePart && templateDelta.addedPart) {
    return `${cleanSpokenPrev} ${templateDelta.addedPart}`;
  }
  const cleanExample = stepCfg.example
    .replace(/^e\.g\.?\s*/i, '')
    .replace(/[.…]+$/, '')
    .replace(/[“”"]/g, '')
    .split(',')[0]
    .trim();
  if (cleanExample) {
    return `${cleanSpokenPrev} ${cleanExample}.`;
  }
  return rawSample;
}

function countWords(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

const INDENT_CLASSES = ['ml-1.5', 'ml-3', 'ml-4.5'];

export const ExpansionStage: React.FC<ExpansionStageProps> = ({
  scene,
  subStep,
  userLevel = 'B1',
  apiKeyConnected,
  onOpenApiSettings,
  hintVocabulary = [],
  onBack,
  initialThought,
  acceptedExpansions,
  expansionSteps,
  inlineFeedback,
  onPlaySentence,
  onSubmitAttempt,
  onDraftChange,
  resetSignal,
  isSubmitting,
  onOpenHint,
  onOpenConceptBridge,
  onSkipToSelfTalk,
}) => {
  const [showMethodGuide, setShowMethodGuide] = useState<boolean>(false);

  const rootSentence = acceptedExpansions[0] || initialThought;
  const totalRungs = expansionSteps.length;

  // Build dynamic N-rung staircase anchored to learner's spoken sentences
  const resolvedRungSentences: string[] = [];
  for (let i = 0; i < totalRungs; i++) {
    const prev = i === 0 ? rootSentence : resolvedRungSentences[i - 1];
    const accepted = acceptedExpansions[i + 1];
    if (accepted) {
      resolvedRungSentences.push(accepted);
    } else if (expansionSteps[i]) {
      const prevTemplate =
        i === 0
          ? initialThought
          : expansionSteps[i - 1]?.sample || initialThought;
      resolvedRungSentences.push(
        alignTargetWithSpokenPrev(prev, expansionSteps[i], prevTemplate)
      );
    } else {
      resolvedRungSentences.push(prev);
    }
  }

  const activeIdx = Math.min(Math.max(0, subStep - 1), totalRungs - 1);
  const activeTargetSentence =
    resolvedRungSentences[activeIdx] || rootSentence;
  const prevForActive =
    activeIdx === 0 ? rootSentence : resolvedRungSentences[activeIdx - 1];
  const activeSplit = splitExpansionRung(prevForActive, activeTargetSentence);
  const activeBasePrefix =
    activeSplit.basePart || prevForActive.replace(/[.!?]+$/, '');

  return (
    <div className="relative z-10 flex flex-col gap-2 flex-1 justify-between">
      <div className="flex flex-col gap-1.5">
        <PracticeHeader
          onBack={onBack}
          centerMode="brand"
          rightMode={onOpenApiSettings ? 'api-status' : 'none'}
          apiKeyConnected={apiKeyConnected}
          onOpenApiSettings={onOpenApiSettings}
        />

        <MethodRoadmapStrip
          activeMethod="EXPANSION"
          onOpenGuide={() => setShowMethodGuide(true)}
        />

        {/* Explicit Method Identity Header */}
        <div className="flex flex-col gap-1 pt-0.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#EAF6EE] text-[#148343] text-[10.5px] font-extrabold uppercase tracking-[0.04em]">
              <Maximize2 className="w-3 h-3 stroke-[2.4]" />
              <span>
                Method 1 · Sentence Expansion ({subStep}/{totalRungs})
              </span>
            </span>

            {subStep === 1 && onSkipToSelfTalk && (
              <button
                type="button"
                onClick={onSkipToSelfTalk}
                className="h-6 px-2.5 rounded-full bg-[#F1F4F1] hover:bg-[#E4ECE6] text-[#148343] text-[10.5px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Zap className="w-3 h-3 stroke-[2.4] shrink-0" />
                <span>Fast-track</span>
                <ArrowRight className="w-2.5 h-2.5 stroke-[2.4] shrink-0" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {scene.imageUrl && (
              <div className="w-9 h-9 rounded-[10px] overflow-hidden bg-[#1D2621] shrink-0 apple-shadow-xs">
                <img
                  src={scene.imageUrl}
                  alt={scene.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <p className="text-[12px] text-[#4E5B54] leading-snug">
              {userLevel === 'A2'
                ? 'Mô hình bậc thang 3 tầng: Đọc lại nguyên câu ở trên + tự nối thêm 1 cụm ngắn theo ý bạn.'
                : '3-rung staircase: Say the full line above + tack on your own short detail per rung.'}
            </p>
          </div>
        </div>

        {/* THE TRUE 4-LINE (SEED + 3 RUNGS) SENTENCE EXPANSION STAIRCASE */}
        <SurfaceCard
          tone="elevated"
          radius="xl"
          padding="sm"
          className="p-2.5 flex flex-col gap-1.5"
        >
          {/* Rung 0: Core Seed Sentence */}
          <div className="rounded-[12px] bg-[#F3F5F2] px-2.5 py-1.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-4.5 h-4.5 rounded-full bg-[#148343] text-white flex items-center justify-center shrink-0">
                <Check className="w-2.5 h-2.5 stroke-[3]" />
              </span>
              <p className="text-[13px] font-bold text-[#18241E] leading-snug">
                {rootSentence}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onPlaySentence(rootSentence, 'rung_0')}
              className="px-2 py-0.5 rounded-full bg-white text-[#55625B] text-[10px] font-bold inline-flex items-center gap-1 shrink-0 cursor-pointer apple-shadow-xs tabular-nums"
            >
              <Volume2 className="w-3 h-3 text-[#148343]" />
              <span>{countWords(rootSentence)}w</span>
            </button>
          </div>

          {/* Dynamic Rungs 1..N (3 Spoken Staircase Rungs) */}
          {expansionSteps.map((stepCfg, idx) => {
            const rungNumber = idx + 1;
            const isCompleted = rungNumber < subStep;
            const isCurrent = rungNumber === subStep;
            const indentClass =
              INDENT_CLASSES[Math.min(idx, INDENT_CLASSES.length - 1)];
            const prevSent =
              idx === 0 ? rootSentence : resolvedRungSentences[idx - 1];
            const thisSent = resolvedRungSentences[idx];
            const split = splitExpansionRung(prevSent, thisSent);

            if (isCompleted) {
              return (
                <div
                  key={rungNumber}
                  className={`${indentClass} rounded-[12px] bg-[#F1F7F3] px-2.5 py-1.5 flex flex-col gap-0.5`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 text-[9.5px] font-extrabold uppercase tracking-wider text-[#148343]">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                      <span>Bậc {rungNumber} · Spoken</span>
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        onPlaySentence(thisSent, `rung_${rungNumber}`)
                      }
                      className="px-2 py-0.5 rounded-full bg-white text-[#148343] text-[10px] font-bold inline-flex items-center gap-1 shrink-0 cursor-pointer apple-shadow-xs tabular-nums"
                    >
                      <Volume2 className="w-2.5 h-2.5 stroke-[2.2]" />
                      <span>{countWords(thisSent)}w</span>
                    </button>
                  </div>
                  <p className="text-[12.5px] leading-[1.35] text-[#24322B] font-semibold">
                    {split.basePart && <span>{split.basePart} </span>}
                    <span className="inline bg-[#D5F0DF] text-[#0C6330] font-extrabold px-1 py-0.5 rounded-[5px]">
                      + {split.addedPart}
                    </span>
                  </p>
                </div>
              );
            }

            if (isCurrent) {
              return (
                <div
                  key={rungNumber}
                  className={`${indentClass} rounded-[13px] bg-[#E7F6ED] ring-2 ring-[#148343]/30 px-2.5 py-2 flex flex-col gap-1`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-[#148343]">
                      <CornerDownRight className="w-3 h-3 stroke-[2.5] shrink-0" />
                      <span>
                        Expand +{rungNumber} · {stepCfg.title.replace(/\.$/, '')}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        onPlaySentence(thisSent, `rung_${rungNumber}`)
                      }
                      className="px-2 py-0.5 rounded-full bg-white text-[#148343] text-[10px] font-bold inline-flex items-center gap-1 shrink-0 cursor-pointer apple-shadow-xs tabular-nums whitespace-nowrap"
                    >
                      <Volume2 className="w-3 h-3 stroke-[2.2]" />
                      <span>Model · {countWords(thisSent)}w</span>
                    </button>
                  </div>

                  <p className="text-[13.5px] leading-[1.38] text-[#24322B] font-semibold">
                    {split.basePart && <span>{split.basePart} </span>}
                    <span className="inline bg-[#CBEED8] text-[#0C6330] font-extrabold px-1.5 py-0.5 rounded-[6px]">
                      + {split.addedPart}
                    </span>
                  </p>
                  {stepCfg.example && (
                    <span className="text-[11px] font-medium text-[#466353]">
                      Idea cue: {stepCfg.example}
                    </span>
                  )}
                </div>
              );
            }

            return (
              <div
                key={rungNumber}
                className={`${indentClass} rounded-[11px] bg-[#F5F6F4] px-2.5 py-1.5 flex items-center justify-between gap-2`}
              >
                <div className="flex items-center gap-1.5 min-w-0 text-[#66736C]">
                  <CornerDownRight className="w-3 h-3 stroke-[2.2] shrink-0" />
                  <span className="text-[11.5px] font-semibold leading-snug">
                    Expand +{rungNumber}: repeat line above{' '}
                    <span className="font-bold text-[#148343]">
                      + {stepCfg.title.toLowerCase().replace(/\.$/, '')}
                    </span>
                  </span>
                </div>
                <Lock className="w-3 h-3 text-[#8A948E] shrink-0" />
              </div>
            );
          })}
        </SurfaceCard>

        {/* Active Speaking Box */}
        <SurfaceCard
          tone="mint"
          radius="lg"
          padding="sm"
          className="px-3.5 py-2 flex flex-col gap-1.5"
        >
          <AnimatePresence>
            {inlineFeedback && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="rounded-[12px] bg-white/95 px-3 py-2 flex items-start gap-2 text-[12px] font-semibold text-amber-900 apple-shadow-xs"
              >
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
                <span>{inlineFeedback.message}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <VoiceInput
            key={`exp_voice_${subStep}`}
            size="compact"
            idleLabel={`Speak Expanded Rung ${subStep} of ${totalRungs}`}
            typingPrefill={`${activeBasePrefix} `}
            sceneContext={scene.title}
            hintVocabulary={hintVocabulary}
            onSubmit={onSubmitAttempt}
            onDraftChange={onDraftChange}
            resetSignal={resetSignal}
            isSubmitting={isSubmitting}
          />

          <div className="flex items-center justify-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={onOpenHint}
              className="h-7 px-3 rounded-full bg-white hover:bg-[#F3F5F3] text-[#18221D] text-[11px] font-bold inline-flex items-center gap-1.5 apple-shadow-xs transition-colors cursor-pointer whitespace-nowrap"
            >
              <Lightbulb className="w-3 h-3 text-[#148343] stroke-[2.2] shrink-0" />
              <span>
                {userLevel === 'A2' ? 'Gợi ý cách nói' : 'Need a hint?'}
              </span>
            </button>

            <button
              type="button"
              onClick={onOpenConceptBridge}
              className="h-7 px-3 rounded-full bg-white/80 hover:bg-white text-[#148343] text-[11px] font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Languages className="w-3 h-3 stroke-[2.2] shrink-0" />
              <span>
                {userLevel === 'A2' ? 'Bí từ? · Bridge' : 'Stuck on a word?'}
              </span>
            </button>
          </div>
        </SurfaceCard>
      </div>

      <MethodGuideSheet
        isOpen={showMethodGuide}
        onClose={() => setShowMethodGuide(false)}
      />
    </div>
  );
};
