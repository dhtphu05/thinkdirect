import React, { useState } from 'react';
import {
  Sparkles,
  EyeOff,
  Lightbulb,
  AudioLines,
  CheckCircle2,
  ArrowDown,
  Volume2,
  ChevronRight,
  RotateCcw,
  X,
  TrendingUp,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SessionResultData, SessionMetrics } from '../types';
import {
  extractThoughtChainNodes,
  buildNaturalUpgrade,
} from '../services/speakingEngine';
import { playPronunciation } from '../utils/audioUtils';
import { AmbientMintArc } from '../components/ui/BrandMark';
import { PracticeHeader } from '../components/ui/PracticeHeader';
import { SurfaceCard } from '../components/ui/SurfaceCard';
import { ThoughtChainStrip } from '../components/ui/ThoughtChainStrip';
import { PracticeActionFooter } from '../components/ui/PillButton';

interface SessionResultsScreenProps {
  result: SessionResultData;
  onStartNewSession: () => void;
  onGoToMyEnglish: () => void;
  onSelectTopic?: (topic: string) => void;
  onNextTopicHub?: () => void;
  onStartTransferChallenge?: () => void;
}

function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

export const SessionResultsScreen: React.FC<SessionResultsScreenProps> = ({
  result,
  onStartNewSession,
  onGoToMyEnglish,
  onSelectTopic,
  onNextTopicHub,
  onStartTransferChallenge,
}) => {
  const [showJourneySheet, setShowJourneySheet] = useState<boolean>(false);

  const journey = result.thoughtJourney || {
    initialThought: "I'm coding.",
    expandedThought: "I'm building a login page for my university project.",
    purposeWhy: 'Students need to sign in securely.',
    methodHow: "I'm using React with an authentication API.",
    selfTalkMonologue:
      "Something isn't working with authentication. Maybe the token has expired. I should check the API response first.",
    independentRecall:
      "I'm building a login page for my university project so students can sign in securely using React and an authentication API. Something isn't working with authentication, maybe because the token has expired, so I'll check the API response first.",
  };

  const initialWords = countWords(journey.initialThought);
  const expandedWords = countWords(journey.expandedThought);
  const recallWords = countWords(journey.independentRecall);
  const isTransferSession = result.sessionType === 'transfer_challenge';
  const isBlindRecallSession = result.sessionType === 'blind_recall';
  const isDailySprintSession = result.sessionType === 'daily_sprint';
  const isFullFourMethodSession =
    !isTransferSession && !isBlindRecallSession && !isDailySprintSession;
  const recallChain = extractThoughtChainNodes(journey.independentRecall);

  const naturalUpgrade =
    result.naturalUpgrade ||
    buildNaturalUpgrade({
      initialThought: journey.initialThought,
      expandedThought: journey.expandedThought,
      selfTalkMonologue: journey.selfTalkMonologue,
      independentRecall: journey.independentRecall,
      sceneTitle: result.sceneTitle,
    });

  const fallbackHints = result.totalHintsUsed || 0;
  const m: SessionMetrics = result.metrics || {
    meaningfulIdeaUnits: result.ideasExpressedCount || 5,
    expansionSuccess: {
      acceptedSteps: 2,
      totalAttempts: 2,
      addedDetailsCount: Math.max(4, expandedWords - initialWords),
      ratePercent: 100,
    },
    hintUsage: {
      totalHintsUsed: fallbackHints,
      maxHintLevel: fallbackHints > 0 ? 1 : 0,
      vietnameseRescueUsed: false,
      recallHintUsed: false,
      dependencyLabel:
        fallbackHints === 0
          ? 'Independent'
          : fallbackHints <= 2
            ? 'Light support'
            : 'Guided support',
    },
    speechContinuity: {
      totalSpeakingSeconds: result.selfTalkDuration || 58,
      selfTalkSeconds: 24,
      recallSeconds: 26,
      recallWordCount: recallWords,
      initialWordCount: initialWords,
      spokenTurnsCount: 6,
      typedTurnsCount: 0,
    },
    independentRecall: {
      recalledUnits: 3,
      targetUnits: 3,
      coveragePercent: 100,
      ideasIdentified: [
        'Core Activity & Context',
        'Purpose & Method',
        'Next Action',
      ],
      usedWithoutHints: fallbackHints === 0,
    },
    sessionCompletion: {
      stagesCompleted: 4,
      totalStages: 4,
      completedCoreJourney: true,
    },
  };

  const showTransferCta =
    Boolean(onStartTransferChallenge) && !isTransferSession;

  return (
    <div className="relative w-full min-h-[100dvh] bg-[#FAF9F6] text-[#0F1F18] px-4 sm:px-5 pt-2.5 pb-5 flex flex-col justify-between gap-2 select-none safe-top safe-bottom overflow-x-clip">
      <AmbientMintArc />

      <div className="relative z-10 flex flex-col gap-2">
        <PracticeHeader
          onBack={onStartNewSession}
          centerMode="title"
          centerTitle={
            isTransferSession ? 'Transfer Verified' : 'Session Complete'
          }
          rightMode="more"
          onMoreClick={() => setShowJourneySheet(true)}
          segments={['solid', 'solid', 'solid', 'solid']}
        />

        {/* Hero Celebration Header */}
        <div className="flex items-center gap-3">
          {result.sceneImageUrl ? (
            <div className="w-10 h-10 rounded-[13px] overflow-hidden bg-[#1B2620] shrink-0 apple-shadow-xs">
              <img
                src={result.sceneImageUrl}
                alt={result.sceneTitle}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-[13px] bg-[#E8F6EC] text-[#148343] flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 stroke-[2.1] fill-[#148343]/15" />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <h1 className="text-[19px] sm:text-[21px] font-extrabold tracking-[-0.028em] text-[#0D1F17] leading-tight">
              {isTransferSession
                ? 'Skill transferred to a new scene!'
                : isBlindRecallSession
                  ? 'Blind recall verified!'
                  : isDailySprintSession
                    ? '90s Daily Sprint complete!'
                    : '5 Speaking Methods Completed!'}
            </h1>
            <p className="text-[12px] text-[#58645D] leading-snug mt-0.5">
              {result.sceneTitle}
            </p>
          </div>
        </div>

        {/* Clean 3-Pill Outcome Summary */}
        <div className="grid grid-cols-3 gap-2">
          <SurfaceCard
            tone="elevated"
            radius="md"
            padding="none"
            className="px-2 py-1.5 flex flex-col items-center text-center"
          >
            <TrendingUp className="w-3.5 h-3.5 text-[#148343] stroke-[2.3] mb-0.5" />
            <span className="text-[12.5px] font-extrabold text-[#101E17] tabular-nums leading-tight">
              {initialWords} → {recallWords}
            </span>
            <span className="text-[10px] font-semibold text-[#5E6B63]">
              words grown
            </span>
          </SurfaceCard>

          <SurfaceCard
            tone="elevated"
            radius="md"
            padding="none"
            className="px-2 py-1.5 flex flex-col items-center text-center"
          >
            <AudioLines className="w-3.5 h-3.5 text-[#148343] stroke-[2.2] mb-0.5" />
            <span className="text-[12.5px] font-extrabold text-[#101E17] tabular-nums leading-tight">
              {m.speechContinuity.totalSpeakingSeconds}s
            </span>
            <span className="text-[10px] font-semibold text-[#5E6B63]">
              total spoken
            </span>
          </SurfaceCard>

          <SurfaceCard
            tone="elevated"
            radius="md"
            padding="none"
            className="px-2 py-1.5 flex flex-col items-center text-center"
          >
            <Lightbulb className="w-3.5 h-3.5 text-[#148343] stroke-[2.2] mb-0.5" />
            <span className="text-[12px] font-extrabold text-[#101E17] leading-tight whitespace-nowrap">
              {m.hintUsage.totalHintsUsed === 0
                ? 'No hints'
                : `${m.hintUsage.totalHintsUsed} hint${
                    m.hintUsage.totalHintsUsed > 1 ? 's' : ''
                  }`}
            </span>
            <span className="text-[10px] font-semibold text-[#5E6B63]">
              {m.hintUsage.dependencyLabel}
            </span>
          </SurfaceCard>
        </div>

        {/* Visible Method-by-Method Transformation Staircase */}
        <SurfaceCard
          tone="elevated"
          radius="xl"
          padding="sm"
          className="flex flex-col gap-1.5 p-3"
        >
          <div className="flex items-center justify-between gap-2 px-0.5">
            <span className="text-[10px] font-extrabold uppercase tracking-[0.05em] text-[#148343]">
              {isFullFourMethodSession
                ? 'Method-by-Method Growth Ladder'
                : 'Before → After Transformation'}
            </span>
            <button
              type="button"
              onClick={() => setShowJourneySheet(true)}
              className="inline-flex items-center gap-0.5 text-[11px] font-bold text-[#148343] hover:opacity-80 cursor-pointer whitespace-nowrap"
            >
              <span>Full breakdown</span>
              <ChevronRight className="w-3 h-3 stroke-[2.3]" />
            </button>
          </div>

          {/* Method 0: Direct Label Seed */}
          <div className="rounded-[11px] bg-[#F3F5F2] px-2.5 py-1.5 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="block text-[9px] font-extrabold uppercase tracking-wider text-[#5B6860]">
                {isTransferSession ? 'Prior baseline' : 'M0 · Direct Label'}
              </span>
              <p className="text-[12.5px] font-bold text-[#25322B] leading-snug">
                “{journey.initialThought}”
              </p>
            </div>
            <span className="text-[10px] font-semibold text-[#65726A] bg-white/90 px-2 py-0.5 rounded-full tabular-nums shrink-0 whitespace-nowrap">
              {initialWords}w
            </span>
          </div>

          {/* Visible Intermediate Method Rungs for Full 4-Step Sessions */}
          {isFullFourMethodSession ? (
            <>
              <div className="ml-2 rounded-[11px] bg-[#F1F7F3] px-2.5 py-1.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="block text-[9px] font-extrabold uppercase tracking-wider text-[#148343]">
                    M1 · Sentence Expansion
                  </span>
                  <p className="text-[12px] font-semibold text-[#1E2C25] leading-snug">
                    “{journey.expandedThought}”
                  </p>
                </div>
                <span className="text-[10px] font-bold text-[#148343] bg-white/90 px-2 py-0.5 rounded-full tabular-nums shrink-0 whitespace-nowrap">
                  {expandedWords}w
                </span>
              </div>

              <div className="ml-4 rounded-[11px] bg-[#EDF6F0] px-2.5 py-1.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="block text-[9px] font-extrabold uppercase tracking-wider text-[#148343]">
                    M2 · 5W1H / P.R.E + M3 · Self-Talk
                  </span>
                  <p className="text-[11.5px] font-semibold text-[#1E2C25] leading-snug">
                    + Why/How & 3-beat solo monologue linked
                  </p>
                </div>
                <CheckCircle2 className="w-3.5 h-3.5 text-[#148343] shrink-0" />
              </div>
            </>
          ) : (
            <div className="flex items-center gap-1 bg-[#EAF6EE] text-[#148343] px-2.5 py-0.5 rounded-full text-[10px] font-bold self-start">
              <ArrowDown className="w-3 h-3 stroke-[2.4] shrink-0" />
              <span>
                {isTransferSession
                  ? 'Unseen photo · Zero prompts'
                  : '90s Sprint · Active Recall'}
              </span>
            </div>
          )}

          {/* Method 4: Final Active Recall + Semantic Thought-Chain Map */}
          <div
            className={`${
              isFullFourMethodSession ? 'ml-5' : ''
            } rounded-[14px] bg-[#E5F5EB] px-3 py-2 flex flex-col gap-1.5`}
          >
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-[#148343]">
                <EyeOff className="w-3 h-3 stroke-[2.2] shrink-0" />
                <span>M4 · Active Recall (No Prompts)</span>
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-[#148343] bg-white/90 px-2 py-0.5 rounded-full tabular-nums whitespace-nowrap">
                  {recallWords}w
                </span>
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  type="button"
                  onClick={() => playPronunciation(journey.independentRecall)}
                  className="w-6 h-6 rounded-full bg-white text-[#148343] flex items-center justify-center shadow-[0_2px_8px_rgba(15,35,25,0.06)] cursor-pointer shrink-0"
                  title="Listen to independent speech"
                >
                  <Volume2 className="w-3 h-3 stroke-[2.2]" />
                </motion.button>
              </div>
            </div>

            <p className="text-[12px] font-bold text-[#0F1F18] leading-[1.38]">
              “{journey.independentRecall}”
            </p>

            <div className="rounded-[10px] bg-white/88 px-2.5 py-1.5">
              <ThoughtChainStrip nodes={recallChain.nodes} compact />
            </div>
          </div>
        </SurfaceCard>

        {/* Natural Rephrase (Same Idea) */}
        <SurfaceCard
          tone="sage"
          radius="lg"
          padding="sm"
          className="px-3.5 py-2 flex flex-col gap-1.5"
        >
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-[#148343]">
              <Sparkles className="w-3 h-3 stroke-[2.3] shrink-0" />
              <span>Natural rephrase · same idea</span>
            </span>
            <span className="text-[10px] font-bold bg-white/90 text-[#148343] px-2 py-0.5 rounded-full">
              {naturalUpgrade.upgradedChunk}
            </span>
          </div>

          <div className="rounded-[11px] bg-white px-3 py-1.5 flex items-center justify-between gap-2 apple-shadow-xs">
            <p className="text-[12px] font-bold text-[#101E17] leading-snug">
              “{naturalUpgrade.naturalPhrasing}”
            </p>
            <motion.button
              whileTap={{ scale: 0.9 }}
              type="button"
              onClick={() => playPronunciation(naturalUpgrade.naturalPhrasing)}
              className="w-7 h-7 rounded-full bg-[#EAF6EE] text-[#148343] flex items-center justify-center shrink-0 cursor-pointer"
              title="Hear natural phrasing"
            >
              <Volume2 className="w-3.5 h-3.5 stroke-[2.2]" />
            </motion.button>
          </div>
        </SurfaceCard>
      </div>

      {/* Bottom Action Bar */}
      <div className="relative z-10 mt-1">
        <PracticeActionFooter
          secondaryLabel="My English"
          onSecondary={onGoToMyEnglish}
          primaryLabel={showTransferCta ? 'Transfer Check' : 'Next topic'}
          onPrimary={() => {
            if (showTransferCta && onStartTransferChallenge) {
              onStartTransferChallenge();
            } else if (onNextTopicHub) {
              onNextTopicHub();
            } else {
              onStartNewSession();
            }
          }}
        />
      </div>

      {/* Full 5-Method Thought Journey Drawer */}
      <AnimatePresence>
        {showJourneySheet && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0"
              onClick={() => setShowJourneySheet(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="relative w-full max-w-[430px] bg-[#FAF9F6] rounded-t-[30px] p-5 safe-bottom z-10 flex flex-col gap-2.5 apple-shadow-md max-h-[85dvh] overflow-y-auto"
            >
              <div className="w-10 h-1 rounded-full bg-black/15 mx-auto" />
              <div className="flex items-center justify-between">
                <span className="text-[16px] font-bold text-[#101E17]">
                  Full 5-Method Breakdown
                </span>
                <button
                  type="button"
                  onClick={() => setShowJourneySheet(false)}
                  className="w-8 h-8 rounded-full bg-[#EFEFEF] flex items-center justify-center text-[#55625B] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <SurfaceCard tone="sage" radius="md" padding="sm">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#5A665F]">
                  Method 0 · Direct Labeling
                </span>
                <p className="text-[13px] font-semibold text-[#18221D] mt-0.5">
                  “{journey.initialThought}”
                </p>
              </SurfaceCard>

              <SurfaceCard tone="elevated" radius="md" padding="sm">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#148343]">
                  Method 1 · Sentence Expansion
                </span>
                <p className="text-[13px] font-semibold text-[#18221D] mt-0.5">
                  “{journey.expandedThought}”
                </p>
              </SurfaceCard>

              <SurfaceCard tone="elevated" radius="md" padding="sm">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#148343]">
                  Method 2 · 5W1H / P.R.E Framework
                </span>
                <p className="text-[13px] font-semibold text-[#18221D] mt-0.5">
                  “{journey.purposeWhy} {journey.methodHow}”
                </p>
              </SurfaceCard>

              <SurfaceCard tone="elevated" radius="md" padding="sm">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#148343]">
                  Method 3 · Guided Self-Talk
                </span>
                <p className="text-[13px] font-semibold text-[#18221D] mt-0.5">
                  “{journey.selfTalkMonologue}”
                </p>
              </SurfaceCard>

              <SurfaceCard tone="mint" radius="md" padding="sm">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#148343] flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Method 4 · Active Recall (No Prompts)
                </span>
                <p className="text-[13px] font-bold text-[#101E17] mt-1 leading-relaxed">
                  “{journey.independentRecall}”
                </p>
              </SurfaceCard>

              {onSelectTopic && (
                <button
                  type="button"
                  onClick={() => {
                    setShowJourneySheet(false);
                    onSelectTopic(result.sceneTitle);
                  }}
                  className="mt-1 w-full py-3 rounded-full bg-[#EFEFEF] text-[#18221D] text-[13.5px] font-bold inline-flex items-center justify-center gap-2 cursor-pointer hover:bg-[#E5E7E4] transition-colors"
                >
                  <RotateCcw className="w-4 h-4 stroke-[2.2]" />
                  Practice this scene again
                </button>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
