import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Check,
  Lock,
  AlertCircle,
  Lightbulb,
  Volume2,
  Languages,
  Layers,
} from 'lucide-react';
import {
  FrameworkType,
  IdeaQuestionKey,
  InputMode,
  SceneData,
  UserLevel,
} from '../../types';
import { VoiceInput, VoiceDraft } from '../VoiceInput';
import { PracticeHeader } from '../ui/PracticeHeader';
import { SurfaceCard } from '../ui/SurfaceCard';
import { MethodRoadmapStrip } from '../ui/MethodRoadmapStrip';
import { MethodGuideSheet } from '../ui/MethodGuideSheet';

export interface IdeaTurnConfig {
  turnNum: number;
  questionKey: IdeaQuestionKey;
  prompt: string;
  helper: string;
  sample: string;
}

const CONNECTOR_STARTERS: Record<IdeaQuestionKey, string[]> = {
  Why: ['Because...', 'It helps me...', 'So that...'],
  How: ["I'm using...", 'First, I...', 'By...'],
  Point: ['I prefer...', 'I believe...', 'My priority is...'],
  Reason: ['Because...', 'The main reason is...', 'It helps me...'],
  Example: ['For example,...', 'Yesterday, I...', 'Earlier today, I...'],
};

interface IdeaDevelopmentStageProps {
  scene: SceneData;
  turnStep: number;
  userLevel?: UserLevel;
  framework: FrameworkType;
  onChangeFramework: (fw: FrameworkType) => void;
  apiKeyConnected?: boolean;
  onOpenApiSettings?: () => void;
  hintVocabulary?: string[];
  onBack: () => void;
  expandedThought: string;
  completedAnswers: string[];
  turns: IdeaTurnConfig[];
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
}

export const IdeaDevelopmentStage: React.FC<IdeaDevelopmentStageProps> = ({
  scene,
  turnStep,
  userLevel = 'B1',
  framework,
  onChangeFramework,
  apiKeyConnected,
  onOpenApiSettings,
  hintVocabulary = [],
  onBack,
  expandedThought,
  completedAnswers,
  turns,
  inlineFeedback,
  onPlaySentence,
  onSubmitAttempt,
  onDraftChange,
  resetSignal,
  isSubmitting,
  onOpenHint,
  onOpenConceptBridge,
}) => {
  const [selectedConnector, setSelectedConnector] = useState<string>('');
  const [showMethodGuide, setShowMethodGuide] = useState<boolean>(false);

  const isOpinionMode = framework === 'IDEA_REASON_EXAMPLE';
  const totalBlocks = isOpinionMode ? turns.length : turns.length + 1;

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
          activeMethod="FRAMEWORK"
          frameworkLabel={isOpinionMode ? 'P.R.E' : '5W1H'}
          onOpenGuide={() => setShowMethodGuide(true)}
        />

        {/* Explicit Method Badge + Dual-Framework Switcher */}
        <div className="flex flex-col gap-1.5 pt-0.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#EAF6EE] text-[#148343] text-[10.5px] font-extrabold uppercase tracking-[0.04em]">
              <Layers className="w-3 h-3 stroke-[2.4]" />
              <span>
                {isOpinionMode
                  ? `Method 2 · P.R.E (${turnStep}/${turns.length})`
                  : `Method 2 · 5W1H (${turnStep}/${turns.length})`}
              </span>
            </span>

            <span className="text-[10.5px] font-bold text-[#5A6760]">
              {isOpinionMode
                ? 'Point + Reason + Example'
                : 'What/Where/When + Why + How'}
            </span>
          </div>

          {/* 2-Framework Switcher (5W1H vs P.R.E) */}
          <div className="bg-[#EFF2EF] p-1 rounded-[14px] grid grid-cols-2 gap-1">
            <button
              type="button"
              onClick={() => {
                setSelectedConnector('');
                onChangeFramework('5W1H');
              }}
              className={`py-1.5 px-2 rounded-[10px] text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                !isOpinionMode
                  ? 'bg-white text-[#148343] apple-shadow-xs font-extrabold'
                  : 'text-[#5A675F] hover:text-[#101E17]'
              }`}
            >
              5W1H · Why & How
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedConnector('');
                onChangeFramework('IDEA_REASON_EXAMPLE');
              }}
              className={`py-1.5 px-2 rounded-[10px] text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                isOpinionMode
                  ? 'bg-white text-[#148343] apple-shadow-xs font-extrabold'
                  : 'text-[#5A675F] hover:text-[#101E17]'
              }`}
            >
              P.R.E · Opinion (3)
            </button>
          </div>
        </div>

        {/* 3-Block Speaking Formula Stack */}
        <div className="flex flex-col gap-1.5">
          {/* In 5W1H mode, Block 1 is What + Where + When already built in Method 1 */}
          {!isOpinionMode && (
            <SurfaceCard
              tone="sage"
              radius="md"
              padding="sm"
              className="px-3 py-1.5 flex items-center justify-between gap-2.5"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {scene.imageUrl && (
                  <div className="w-8 h-8 rounded-[9px] overflow-hidden bg-[#1D2621] shrink-0">
                    <img
                      src={scene.imageUrl}
                      alt={scene.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="min-w-0">
                  <span className="inline-flex items-center gap-1 text-[9.5px] font-extrabold uppercase tracking-wider text-[#148343]">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                    <span>1. WHAT · WHERE · WHEN (From M1)</span>
                  </span>
                  <p className="text-[12.5px] font-bold text-[#14221B] leading-snug">
                    “{expandedThought}”
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onPlaySentence(expandedThought, 'what_base')}
                aria-label="Listen to base idea"
                className="w-7 h-7 rounded-full bg-white text-[#148343] flex items-center justify-center shrink-0 apple-shadow-xs cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5 stroke-[2.2]" />
              </button>
            </SurfaceCard>
          )}

          {/* Dynamic Formula Turns (Why->How for 5W1H, OR Point->Reason->Example for P.R.E) */}
          {turns.map((turn, idx) => {
            const isDone = turn.turnNum < turnStep;
            const isCurrent = turn.turnNum === turnStep;
            const starters = CONNECTOR_STARTERS[turn.questionKey] || [];
            const blockNumber = isOpinionMode ? idx + 1 : idx + 2;
            const spokenForTurn = completedAnswers[idx] || turn.sample;
            const labelPrefix =
              isOpinionMode && idx === 0
                ? `${blockNumber}. ${turn.questionKey.toUpperCase()}`
                : `${blockNumber}. + ${turn.questionKey.toUpperCase()}`;

            if (isDone) {
              return (
                <SurfaceCard
                  key={turn.questionKey}
                  tone="sage"
                  radius="md"
                  padding="sm"
                  className="px-3 py-1.5 flex items-center justify-between gap-2.5"
                >
                  <div className="min-w-0">
                    <span className="inline-flex items-center gap-1 text-[9.5px] font-extrabold uppercase tracking-wider text-[#148343]">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                      <span>{labelPrefix}</span>
                    </span>
                    <p className="text-[12.5px] font-bold text-[#101E17] leading-snug">
                      “{spokenForTurn}”
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onPlaySentence(spokenForTurn, `done_${turn.questionKey}`)
                    }
                    aria-label={`Listen to ${turn.questionKey}`}
                    className="w-7 h-7 rounded-full bg-white text-[#148343] flex items-center justify-center shrink-0 apple-shadow-xs cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5 stroke-[2.2]" />
                  </button>
                </SurfaceCard>
              );
            }

            if (isCurrent) {
              return (
                <SurfaceCard
                  key={turn.questionKey}
                  tone="mint"
                  radius="lg"
                  padding="sm"
                  className="px-3.5 py-2 flex flex-col gap-1.5"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className="inline-block text-[10px] font-extrabold uppercase tracking-[0.04em] text-[#148343] bg-white/90 px-2.5 py-0.5 rounded-full">
                        {labelPrefix} · Block {blockNumber}/{totalBlocks}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          onPlaySentence(turn.sample, `sample_${turn.questionKey}`)
                        }
                        className="px-2 py-0.5 rounded-full bg-white text-[#148343] text-[10px] font-bold inline-flex items-center gap-1 shrink-0 cursor-pointer apple-shadow-xs whitespace-nowrap"
                      >
                        <Volume2 className="w-3 h-3 stroke-[2.2]" />
                        <span>Model</span>
                      </button>
                    </div>
                    <h3 className="text-[14px] font-bold text-[#101E17] leading-snug">
                      {turn.prompt}
                    </h3>
                  </div>

                  {/* Discourse-Marker Starter Chips */}
                  {starters.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {starters.map((chip) => {
                        const cleanPhrase = chip.replace(/\.+$/, '');
                        const isSelected = selectedConnector === cleanPhrase;
                        return (
                          <button
                            key={chip}
                            type="button"
                            onClick={() => {
                              setSelectedConnector(cleanPhrase);
                              onPlaySentence(cleanPhrase, `conn_${chip}`);
                            }}
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold inline-flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap ${
                              isSelected
                                ? 'bg-[#148343] text-white shadow-xs'
                                : 'bg-white/95 hover:bg-white text-[#148343] apple-shadow-xs'
                            }`}
                          >
                            <Volume2 className="w-3 h-3 stroke-[2.2] shrink-0" />
                            <span>{chip}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

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
                    key={`idea_voice_${framework}_${turn.questionKey}`}
                    size="compact"
                    idleLabel={
                      selectedConnector
                        ? `Speak starting with "${selectedConnector}..."`
                        : `Speak your ${turn.questionKey.toLowerCase()} (${turnStep}/${turns.length})`
                    }
                    typingPrefill={selectedConnector ? `${selectedConnector} ` : ''}
                    sceneContext={scene.title}
                    hintVocabulary={hintVocabulary}
                    onSubmit={(text, src, dur) => {
                      setSelectedConnector('');
                      onSubmitAttempt(text, src, dur);
                    }}
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
                        {userLevel === 'A2'
                          ? 'Bí từ? · Bridge'
                          : 'Stuck on a word?'}
                      </span>
                    </button>
                  </div>
                </SurfaceCard>
              );
            }

            return (
              <SurfaceCard
                key={turn.questionKey}
                tone="muted"
                radius="md"
                padding="sm"
                className="flex items-center justify-between gap-3 py-1.5 px-3"
              >
                <span className="text-[11.5px] font-bold text-[#535E58] leading-snug">
                  {labelPrefix}: {turn.prompt}
                </span>
                <Lock className="w-3.5 h-3.5 text-[#7D8781] stroke-[2] shrink-0" />
              </SurfaceCard>
            );
          })}
        </div>
      </div>

      <MethodGuideSheet
        isOpen={showMethodGuide}
        onClose={() => setShowMethodGuide(false)}
      />
    </div>
  );
};
