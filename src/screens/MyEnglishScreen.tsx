import React, { useState } from 'react';
import {
  BookOpen,
  Sparkles,
  Clock,
  ArrowRight,
  Volume2,
  Trash2,
  Layers,
  CheckCircle2,
  TrendingUp,
  EyeOff,
  Mic,
  CalendarClock,
} from 'lucide-react';
import { motion } from 'motion/react';
import { SessionResultData, UserPreferences } from '../types';
import { playPronunciation } from '../utils/audioUtils';
import {
  clearStoredSessions,
  computePortfolioSummary,
  computeScaffoldingDecay,
  getSessionSrsInfo,
} from '../utils/storageUtils';
import { AmbientMintArc } from '../components/ui/BrandMark';
import { PracticeHeader } from '../components/ui/PracticeHeader';
import { SurfaceCard } from '../components/ui/SurfaceCard';
import { PillButton } from '../components/ui/PillButton';

interface MyEnglishScreenProps {
  sessions: SessionResultData[];
  userPreferences: UserPreferences;
  autoDemoMic?: boolean;
  onToggleAutoDemoMic?: () => void;
  onToggleLevel?: () => void;
  onToggleHideSamples?: () => void;
  onSelectSession: (session: SessionResultData) => void;
  onStartBlindRecall?: (session: SessionResultData) => void;
  onPracticeExpression?: (phrase: string, sceneTitle?: string) => void;
  onStartNewWorkout: () => void;
  onClearHistory: () => void;
}

export const MyEnglishScreen: React.FC<MyEnglishScreenProps> = ({
  sessions,
  userPreferences,
  autoDemoMic = true,
  onToggleAutoDemoMic,
  onToggleLevel,
  onToggleHideSamples,
  onSelectSession,
  onStartBlindRecall,
  onPracticeExpression,
  onStartNewWorkout,
  onClearHistory,
}) => {
  const [activeTab, setActiveTab] = useState<'sessions' | 'chunks'>('sessions');

  const portfolio = computePortfolioSummary(sessions);
  const visibleSessions = portfolio.filteredSessions;
  const decaySteps = computeScaffoldingDecay(visibleSessions);
  const topDueSession = portfolio.dueRecallSessions[0] || null;

  const coreSelfTalkStarters = [
    {
      phrase: "Something isn't working with...",
      meaning: 'Notice an issue aloud without translating first.',
      source: 'Self-Talk Starter',
      isNew: false,
      spokenCount: 1,
      masteryStatus: 'spoken_once' as const,
      masteryLabel: 'Core starter',
    },
    {
      phrase: 'Maybe I should check...',
      meaning: 'Reason through a practical hypothesis in English.',
      source: 'Self-Talk Starter',
      isNew: false,
      spokenCount: 1,
      masteryStatus: 'spoken_once' as const,
      masteryLabel: 'Core starter',
    },
    {
      phrase: "First, I'll focus on...",
      meaning: 'Decide your immediate next action clearly.',
      source: 'Self-Talk Starter',
      isNew: false,
      spokenCount: 1,
      masteryStatus: 'spoken_once' as const,
      masteryLabel: 'Core starter',
    },
  ];

  const learnedAndStarters = [
    ...portfolio.learnedExpressions.map((item) => ({
      phrase: item.phrase,
      meaning: item.meaning || item.example,
      source: item.sceneTitle,
      isNew: Boolean(item.isNew),
      spokenCount: item.spokenCount,
      masteryStatus: item.masteryStatus,
      masteryLabel: item.masteryLabel,
    })),
    ...coreSelfTalkStarters,
  ];

  const nextPracticeSuggestion =
    visibleSessions[0]?.suggestedNextPractice ||
    'Capture a scene around you and connect what you see directly to spoken English.';

  return (
    <div className="relative w-full flex-1 bg-[#FAF9F6] text-[#0F1F18] px-4 sm:px-5 pt-3 pb-24 flex flex-col gap-3.5 select-none safe-top overflow-x-clip">
      <AmbientMintArc />

      <div className="relative z-10 flex flex-col gap-3">
        <PracticeHeader rightMode="streak" streakDays={portfolio.streakDays} />

        {/* Calm Editorial Header + Persistent Learner Settings */}
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <h1 className="text-[26px] sm:text-[28px] font-extrabold tracking-[-0.028em] text-[#0D1F17] leading-[1.14]">
              My English.
            </h1>
            <p className="text-[13px] text-[#55625B] leading-[1.42] mt-0.5">
              Your spoken ideas, saved phrases, and growing independence.
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
            <button
              type="button"
              onClick={onToggleLevel}
              title="Switch between A2 (Vietnamese guidance) and B1 (English prompts)"
              className="text-[11.5px] font-bold bg-[#EAF6EE] hover:bg-[#DEF0E4] text-[#148343] px-2.5 py-1 rounded-full shrink-0 transition-colors cursor-pointer whitespace-nowrap"
            >
              {userPreferences.level === 'A2'
                ? 'A2 · Guided'
                : `${userPreferences.level} · English`}
            </button>
          </div>
        </div>

        {/* Observable Portfolio Summary Strip */}
        <SurfaceCard
          tone="mint"
          radius="lg"
          padding="none"
          className="grid grid-cols-3 gap-2 py-3 px-2.5 text-center"
        >
          <div className="flex flex-col items-center px-1">
            <Layers className="w-4 h-4 text-[#148343] stroke-[2.2] mb-1" />
            <span className="text-[17px] font-extrabold text-[#101E17] leading-none tabular-nums">
              {portfolio.totalIdeas}
            </span>
            <span className="text-[11px] text-[#58645D] mt-1 font-medium leading-tight">
              Ideas expressed
            </span>
          </div>

          <div className="flex flex-col items-center px-1">
            <Clock className="w-4 h-4 text-[#148343] stroke-[2.1] mb-1" />
            <span className="text-[17px] font-extrabold text-[#101E17] leading-none tabular-nums">
              {portfolio.totalSpeakingMinutes}
              <span className="text-[12px] font-medium text-[#18221D] ml-0.5">
                min
              </span>
            </span>
            <span className="text-[11px] text-[#58645D] mt-1 font-medium leading-tight">
              Total spoken
            </span>
          </div>

          <div className="flex flex-col items-center px-1">
            <CheckCircle2 className="w-4 h-4 text-[#148343] stroke-[2.2] mb-1" />
            <span className="text-[17px] font-extrabold text-[#101E17] leading-none tabular-nums">
              {portfolio.totalSessions}
            </span>
            <span className="text-[11px] text-[#58645D] mt-1 font-medium leading-tight">
              Sessions done
            </span>
          </div>
        </SurfaceCard>

        {/* Active Spaced Repetition (1d -> 3d -> 7d) Due Today Banner */}
        {topDueSession && onStartBlindRecall && (
          <SurfaceCard
            tone="mint"
            radius="lg"
            padding="sm"
            interactive
            onClick={() => onStartBlindRecall(topDueSession)}
            className="bg-gradient-to-br from-[#E6F6EC] to-[#D8F0E1] px-3.5 py-3 flex items-center justify-between gap-2.5"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-[12px] bg-[#148343] text-white flex items-center justify-center shrink-0">
                <CalendarClock className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div className="min-w-0">
                <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-[#148343] block">
                  Quick memory check · 30s
                </span>
                <p className="text-[13px] font-bold text-[#0F1F18] leading-snug">
                  {topDueSession.sceneTitle} — say it again without looking
                </p>
              </div>
            </div>
            <span className="text-[11.5px] font-bold bg-white text-[#148343] px-2.5 py-1 rounded-full shrink-0 whitespace-nowrap inline-flex items-center gap-1">
              <span>Speak</span>
              <ArrowRight className="w-3 h-3 stroke-[2.4]" />
            </span>
          </SurfaceCard>
        )}

        {/* Speaking Independence Progression */}
        {decaySteps.length >= 2 && (
          <SurfaceCard
            tone="elevated"
            radius="lg"
            padding="sm"
            className="px-3.5 py-3 flex flex-col gap-2"
          >
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[#148343] whitespace-nowrap">
                <TrendingUp className="w-3.5 h-3.5 stroke-[2.3] shrink-0" />
                <span>Speaking independence</span>
              </span>
              <span className="text-[10.5px] font-bold bg-[#EAF6EE] text-[#148343] px-2.5 py-0.5 rounded-full whitespace-nowrap">
                Fewer hints needed
              </span>
            </div>

            <div className="grid grid-cols-4 gap-1.5 items-stretch">
              {decaySteps.map((step, idx) => {
                const isZeroHint = step.hintsUsed === 0;
                const bottomTag = isZeroHint
                  ? 'No hints'
                  : `${step.hintsUsed} hint${step.hintsUsed > 1 ? 's' : ''}`;
                return (
                  <div
                    key={step.id}
                    className="rounded-[12px] bg-[#F5F7F5] px-2 py-2 flex flex-col justify-between gap-1 min-w-0"
                  >
                    <span className="text-[10px] font-bold text-[#5A675F] whitespace-nowrap">
                      Session {idx + 1}
                    </span>
                    <div className="w-full h-1.5 rounded-full bg-[#E3E7E4] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#148343] transition-all duration-500"
                        style={{ width: `${step.independencePercent}%` }}
                      />
                    </div>
                    <span
                      className={`text-[10px] font-extrabold leading-tight whitespace-nowrap ${
                        isZeroHint ? 'text-[#148343]' : 'text-[#2D3B33]'
                      }`}
                    >
                      {bottomTag}
                    </span>
                  </div>
                );
              })}
            </div>
          </SurfaceCard>
        )}

        {/* Apple Segmented Control + Sample Filter Toggle */}
        <div className="flex flex-col gap-1.5">
          <div className="flex bg-[#F2F3F1] p-1 rounded-full">
            <button
              type="button"
              onClick={() => setActiveTab('sessions')}
              className={`flex-1 py-1.5 text-[12.5px] font-bold rounded-full transition-all cursor-pointer tabular-nums ${
                activeTab === 'sessions'
                  ? 'bg-white text-[#101E17] apple-shadow-xs'
                  : 'text-[#5D6962] hover:text-[#101E17]'
              }`}
            >
              Sessions ({visibleSessions.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('chunks')}
              className={`flex-1 py-1.5 text-[12.5px] font-bold rounded-full transition-all cursor-pointer tabular-nums ${
                activeTab === 'chunks'
                  ? 'bg-white text-[#101E17] apple-shadow-xs'
                  : 'text-[#5D6962] hover:text-[#101E17]'
              }`}
            >
              Expressions ({learnedAndStarters.length})
            </button>
          </div>
        </div>

        {/* Sessions List */}
        {activeTab === 'sessions' && (
          <div className="flex flex-col gap-2">
            {visibleSessions.length === 0 ? (
              <SurfaceCard
                tone="elevated"
                radius="xl"
                padding="lg"
                className="flex flex-col items-center justify-center text-center gap-3 py-6"
              >
                <div className="w-12 h-12 rounded-full bg-[#EAF6EE] text-[#148343] flex items-center justify-center">
                  <BookOpen className="w-5 h-5 stroke-[2.1]" />
                </div>
                <div>
                  <h3 className="text-[16px] font-bold text-[#101E17]">
                    Ready for your first session
                  </h3>
                  <p className="text-[13px] text-[#58645D] max-w-[260px] leading-[1.45] mt-1">
                    Capture a scene around you or pick a daily prompt to log your own English thoughts.
                  </p>
                </div>
                <PillButton
                  variant="primary"
                  size="md"
                  onClick={onStartNewWorkout}
                  rightIcon={<ArrowRight className="w-4 h-4 stroke-[2.2]" />}
                  className="mt-1"
                >
                  Start speaking
                </PillButton>
              </SurfaceCard>
            ) : (
              <>
                {visibleSessions.map((item) => {
                  const ideas =
                    item.metrics?.meaningfulIdeaUnits ??
                    item.ideasExpressedCount ??
                    5;
                  const spokenSec =
                    item.metrics?.speechContinuity.totalSpeakingSeconds ??
                    item.selfTalkDuration ??
                    56;
                  const supportLabel =
                    item.sessionType === 'transfer_challenge'
                      ? 'Transfer Verified'
                      : item.sessionType === 'blind_recall'
                        ? 'SRS Recall'
                        : item.sessionType === 'daily_sprint'
                          ? '90s Sprint'
                          : item.metrics?.hintUsage.dependencyLabel ??
                            ((item.totalHintsUsed || 0) === 0
                              ? 'Independent'
                              : 'Light support');

                  const srs = getSessionSrsInfo(item);

                  return (
                    <SurfaceCard
                      key={item.id}
                      tone="elevated"
                      radius="lg"
                      padding="md"
                      interactive
                      onClick={() => onSelectSession(item)}
                      className="flex flex-col gap-1.5 px-3.5 py-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                          <span className="text-[14px] font-bold text-[#101E17] leading-snug">
                            {item.sceneTitle}
                          </span>
                          {item.isNewlyCompleted && (
                            <span className="text-[10px] font-bold bg-[#148343] text-white px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap">
                              Just completed
                            </span>
                          )}
                        </div>
                        <span className="text-[11.5px] text-[#647069] flex items-center gap-1 font-medium tabular-nums shrink-0 mt-0.5">
                          <Clock className="w-3 h-3" />
                          {spokenSec}s
                        </span>
                      </div>

                      <p className="text-[12.5px] font-semibold text-[#1A2821] leading-snug">
                        “
                        {item.thoughtJourney?.independentRecall ||
                          item.finalThought ||
                          item.initialThought ||
                          ''}
                        ”
                      </p>

                      <div className="flex items-center justify-between pt-0.5 gap-2 flex-wrap">
                        <span className="text-[10.5px] bg-[#EAF6EE] text-[#148343] font-bold px-2.5 py-0.5 rounded-full tabular-nums whitespace-nowrap">
                          {ideas} ideas · {supportLabel}
                        </span>

                        <div className="flex items-center gap-2 shrink-0 ml-auto">
                          {onStartBlindRecall &&
                            item.sessionType !== 'blind_recall' && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onStartBlindRecall(item);
                                }}
                                className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full cursor-pointer transition-colors whitespace-nowrap ${
                                  srs.isDue
                                    ? 'bg-[#148343] text-white hover:bg-[#106B37]'
                                    : 'bg-[#F2F4F1] hover:bg-[#E7ECE6] text-[#1D2B24]'
                                }`}
                              >
                                <EyeOff
                                  className={`w-3 h-3 stroke-[2.2] shrink-0 ${
                                    srs.isDue ? 'text-white' : 'text-[#148343]'
                                  }`}
                                />
                                <span>{srs.badgeLabel}</span>
                              </button>
                            )}

                          <span className="text-[12px] font-bold text-[#148343] flex items-center gap-0.5 whitespace-nowrap">
                            Review <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                          </span>
                        </div>
                      </div>
                    </SurfaceCard>
                  );
                })}

                <div className="flex justify-end pt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Clear your completed session history?')) {
                        clearStoredSessions();
                        onClearHistory();
                      }
                    }}
                    className="text-xs text-rose-600 hover:opacity-80 flex items-center gap-1 px-2 py-1 font-semibold cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Clear history
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Active Learned Expressions & Self-Talk Starters */}
        {activeTab === 'chunks' && (
          <div className="flex flex-col gap-2">
            {learnedAndStarters.map((chunk, idx) => {
              const isMastered = chunk.masteryStatus === 'mastered';
              const needsPractice = chunk.masteryStatus === 'try_aloud';

              return (
                <SurfaceCard
                  key={`${chunk.phrase}-${idx}`}
                  tone="elevated"
                  radius="lg"
                  padding="sm"
                  className="flex items-center justify-between gap-2.5 px-3.5 py-3"
                >
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[13.5px] font-bold text-[#101E17] leading-snug">
                        “{chunk.phrase}”
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap ${
                          isMastered
                            ? 'bg-[#148343] text-white'
                            : needsPractice
                              ? 'bg-amber-100/90 text-amber-900'
                              : 'bg-[#EAF6EE] text-[#148343]'
                        }`}
                      >
                        {chunk.masteryLabel}
                      </span>
                    </div>
                    <span className="text-[11.5px] text-[#58645D] mt-0.5 leading-snug">
                      {chunk.meaning}
                    </span>
                    <span className="text-[10.5px] font-medium text-[#75827B] mt-0.5">
                      {chunk.source}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {onPracticeExpression &&
                      chunk.source !== 'Self-Talk Starter' && (
                        <button
                          type="button"
                          onClick={() =>
                            onPracticeExpression(chunk.phrase, chunk.source)
                          }
                          className="h-8 px-2.5 rounded-full bg-[#F2F4F1] hover:bg-[#EAF6EE] text-[#148343] text-[11px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
                          title="Practice speaking with this expression"
                        >
                          <span>Speak</span>
                          <ArrowRight className="w-3 h-3 stroke-[2.3]" />
                        </button>
                      )}

                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      type="button"
                      onClick={() => playPronunciation(chunk.phrase)}
                      className="w-8 h-8 rounded-full bg-[#EAF6EE] text-[#148343] flex items-center justify-center shrink-0 cursor-pointer"
                      title="Listen"
                    >
                      <Volume2 className="w-3.5 h-3.5 stroke-[2.2]" />
                    </motion.button>
                  </div>
                </SurfaceCard>
              );
            })}
          </div>
        )}

        {/* Personalized Suggested Next Practice Card */}
        <SurfaceCard
          tone="sage"
          radius="lg"
          padding="md"
          interactive
          onClick={onStartNewWorkout}
          className="flex items-center justify-between gap-3 mt-0.5"
        >
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-9 h-9 rounded-[12px] bg-[#EAF6EE] text-[#148343] flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#148343]">
                Suggested next practice
              </span>
              <p className="text-[13px] font-semibold text-[#18221D] leading-[1.38] mt-0.5">
                {nextPracticeSuggestion}
              </p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-[#148343] shrink-0" />
        </SurfaceCard>
      </div>
    </div>
  );
};
