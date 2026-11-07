import React, { useState, useEffect } from 'react';
import {
  X,
  RefreshCw,
  Lightbulb,
  Languages,
  Sparkles,
  Volume2,
  ArrowRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ThinkingPrompt, ConceptBridgeResult, UserLevel } from '../types';
import { resolveConceptBridgeFallback } from '../services/speakingEngine';
import { apiFetch } from '../services/apiClient';
import { playPronunciation } from '../utils/audioUtils';
import { SurfaceCard } from './ui/SurfaceCard';
import { PillButton } from './ui/PillButton';

interface HintSheetProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'hints' | 'bridge';
  userLevel?: UserLevel;
  prompts?: ThinkingPrompt[];
  onHintShown?: (promptIndex: number) => void;
  level1?: string;
  level2?: string;
  level3?: string;
  vietnameseRescue?: string;
  sceneContext?: string;
  quickVietnameseIdeas?: string[];
  onUseHint?: (level: 1 | 2 | 3, isVietnameseRescue: boolean) => void;
}

const DEFAULT_PROMPTS: ThinkingPrompt[] = [
  {
    category: 'NOTICE',
    categoryLabel: 'Notice',
    question: "What is happening right in front of you?",
    helperText: 'State your active focus or situation in one simple sentence.',
  },
  {
    category: 'QUESTION',
    categoryLabel: 'Question',
    question: 'Why does this moment or task matter?',
    helperText: 'Ask yourself a short question in English.',
  },
  {
    category: 'CONSIDER',
    categoryLabel: 'Consider',
    question: 'What is a likely challenge or option?',
    helperText: "Use 'Maybe...' or 'I think...' to reason aloud.",
  },
  {
    category: 'DECIDE',
    categoryLabel: 'Decide',
    question: 'What should I check or do first?',
    helperText:
      "Commit to one concrete next step with 'I should...' or 'First, I'll...'",
  },
];

function getFallbackVietnameseIdeas(sceneContext: string): string[] {
  const lower = sceneContext.toLowerCase();
  if (lower.includes('coffee') || lower.includes('morning')) {
    return ['kẹt xe buổi sáng', 'thuyết trình nhóm', 'ôn lại slide'];
  }
  if (lower.includes('plan') || lower.includes('week')) {
    return ['quá tải deadline', 'tắt thông báo', 'ưu tiên việc khó'];
  }
  if (
    lower.includes('study workspace') ||
    lower.includes('coding') ||
    lower.includes('login')
  ) {
    return ['token hết hạn', 'đăng nhập bảo mật', 'kiểm tra phản hồi API'];
  }
  return ['tập trung làm xong', 'tránh bị xao nhãng', 'kiểm tra bước đầu tiên'];
}

export const HintSheet: React.FC<HintSheetProps> = ({
  isOpen,
  onClose,
  initialTab = 'hints',
  userLevel = 'B1',
  prompts = DEFAULT_PROMPTS,
  onHintShown,
  level1,
  level2,
  level3,
  vietnameseRescue,
  sceneContext = 'Everyday Speaking Scene',
  quickVietnameseIdeas: customVietnameseIdeas,
  onUseHint,
}) => {
  const resolvedQuickIdeas =
    customVietnameseIdeas && customVietnameseIdeas.length > 0
      ? customVietnameseIdeas.slice(0, 4)
      : getFallbackVietnameseIdeas(sceneContext);
  const defaultIdea = resolvedQuickIdeas[0] || 'tập trung làm xong';

  const [sheetTab, setSheetTab] = useState<'hints' | 'bridge'>(initialTab);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [unlockedLevel, setUnlockedLevel] = useState<1 | 2 | 3>(
    userLevel === 'A2' ? 2 : 1
  );
  const [showVietnamese, setShowVietnamese] = useState<boolean>(
    userLevel === 'A2'
  );

  // Concept Bridge state (breaks Vietnamese-to-English mental translation bottleneck)
  const [viInput, setViInput] = useState<string>(defaultIdea);
  const [isBridging, setIsBridging] = useState<boolean>(false);
  const [bridgeResult, setBridgeResult] = useState<ConceptBridgeResult>(() =>
    resolveConceptBridgeFallback(defaultIdea, sceneContext)
  );

  const isTieredMode = Boolean(level1 || level2 || level3);

  useEffect(() => {
    if (isOpen) {
      setSheetTab(initialTab);
      setUnlockedLevel(userLevel === 'A2' ? 2 : 1);
      setShowVietnamese(userLevel === 'A2');
      const nextList =
        customVietnameseIdeas && customVietnameseIdeas.length > 0
          ? customVietnameseIdeas
          : getFallbackVietnameseIdeas(sceneContext);
      const nextDefault = nextList[0] || 'tập trung làm xong';
      setViInput(nextDefault);
      setBridgeResult(resolveConceptBridgeFallback(nextDefault, sceneContext));
      void handleLookupConceptBridgeSilently(nextDefault, sceneContext);
    }
  }, [
    isOpen,
    initialTab,
    userLevel,
    sceneContext,
    customVietnameseIdeas,
    level1,
    level2,
    level3,
  ]);

  const handleLookupConceptBridgeSilently = async (
    idea: string,
    context: string
  ) => {
    const trimmed = idea.trim();
    if (!trimmed) return;
    try {
      const res = await apiFetch('/api/concept-bridge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vietnameseIdea: trimmed,
          sceneContext: context,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.englishChunk) {
          setBridgeResult((prev) => ({
            vietnameseIdea: trimmed,
            englishChunk: data.englishChunk,
            contextAnchor: data.contextAnchor || prev.contextAnchor,
            selfBuildPrompt: data.selfBuildPrompt || prev.selfBuildPrompt,
          }));
        }
      }
    } catch {
      // Keep instant fallback if offline or API key not set yet
    }
  };

  if (!isOpen) return null;

  const activePrompt = prompts[currentIndex % prompts.length];

  const handleNextPrompt = () => {
    const nextIdx = (currentIndex + 1) % prompts.length;
    setCurrentIndex(nextIdx);
    onHintShown?.(nextIdx);
  };

  const handleRevealNextTier = () => {
    if (unlockedLevel === 1 && level2) {
      setUnlockedLevel(2);
      onUseHint?.(2, false);
    } else if (unlockedLevel <= 2 && level3) {
      setUnlockedLevel(3);
      onUseHint?.(3, false);
    }
  };

  const handleToggleVietnamese = () => {
    const next = !showVietnamese;
    setShowVietnamese(next);
    if (next) {
      onUseHint?.(unlockedLevel, true);
    }
  };

  const handleLookupConceptBridge = async (ideaToBridge: string) => {
    const trimmed = ideaToBridge.trim();
    if (!trimmed) return;
    setViInput(trimmed);
    onUseHint?.(1, true);

    const instant = resolveConceptBridgeFallback(trimmed, sceneContext);
    setBridgeResult(instant);
    setIsBridging(true);

    try {
      const res = await apiFetch('/api/concept-bridge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vietnameseIdea: trimmed,
          sceneContext,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.englishChunk) {
          setBridgeResult({
            vietnameseIdea: trimmed,
            englishChunk: data.englishChunk,
            contextAnchor: data.contextAnchor || instant.contextAnchor,
            selfBuildPrompt: data.selfBuildPrompt || instant.selfBuildPrompt,
          });
        }
      }
    } catch {
      // Keep instant local Concept Bridge fallback
    } finally {
      setIsBridging(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:p-4 bg-black/35 backdrop-blur-xs select-none">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0"
          onClick={onClose}
        />

        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          className="relative w-full max-w-[430px] max-h-[88dvh] overflow-y-auto bg-[#FAF9F6] rounded-t-[30px] sm:rounded-[30px] p-5 apple-shadow-md flex flex-col gap-3 z-10 safe-bottom"
        >
          <div className="w-10 h-1 bg-black/15 rounded-full mx-auto -mt-1 sm:hidden shrink-0" />

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 text-[#148343] min-w-0">
              <div className="w-8 h-8 rounded-[11px] bg-[#EAF6EE] flex items-center justify-center shrink-0">
                <Lightbulb className="w-4 h-4 stroke-[2.2]" />
              </div>
              <h3 className="text-[14.5px] sm:text-[15.5px] font-bold text-[#101E17] leading-snug">
                {sheetTab === 'bridge'
                  ? 'Concept Bridge · No Translation'
                  : isTieredMode
                    ? 'Step-by-Step Coaching Hint'
                    : 'Self-Talk Thinking Prompts'}
              </h3>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#EFEFEF] text-[#55625B] hover:text-[#101E17] flex items-center justify-center transition-colors cursor-pointer shrink-0"
              aria-label="Close hint drawer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Apple Segmented Mode Switch: Progressive Hints vs Stuck Vietnamese Concept Bridge */}
          <div className="flex bg-[#EFF1EE] p-1 rounded-full shrink-0">
            <button
              type="button"
              onClick={() => setSheetTab('hints')}
              className={`flex-1 py-1.5 px-2 text-[12px] font-bold rounded-full transition-all cursor-pointer whitespace-nowrap ${
                sheetTab === 'hints'
                  ? 'bg-white text-[#101E17] apple-shadow-xs'
                  : 'text-[#5A675F] hover:text-[#101E17]'
              }`}
            >
              Coaching hints
            </button>
            <button
              type="button"
              onClick={() => {
                setSheetTab('bridge');
                onUseHint?.(1, true);
              }}
              className={`flex-1 py-1.5 px-2 text-[12px] font-bold rounded-full transition-all inline-flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap ${
                sheetTab === 'bridge'
                  ? 'bg-white text-[#148343] apple-shadow-xs'
                  : 'text-[#5A675F] hover:text-[#101E17]'
              }`}
            >
              <Languages className="w-3.5 h-3.5 stroke-[2.2] shrink-0" />
              <span>
                {userLevel === 'A2' ? 'Bí từ? · Bridge' : 'Stuck on a word?'}
              </span>
            </button>
          </div>

          {sheetTab === 'bridge' ? (
            <div className="flex flex-col gap-2.5">
              <p className="text-[12px] text-[#55625B] leading-snug">
                Type any Vietnamese word or phrase you’re stuck on. Gemini gives a natural 2–5 word English chunk — never a full translated sentence.
              </p>

              {/* Scene-Adapted Quick Concept Pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {resolvedQuickIdeas.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => handleLookupConceptBridge(chip)}
                    className={`px-2.5 py-1 rounded-full text-[11.5px] font-semibold transition-colors cursor-pointer ${
                      viInput === chip
                        ? 'bg-[#148343] text-white'
                        : 'bg-[#EFF1EE] text-[#46534B] hover:bg-[#E4E7E3]'
                    }`}
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Input Row */}
              <div className="flex items-center gap-2 min-w-0">
                <input
                  type="text"
                  value={viInput}
                  onChange={(e) => setViInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleLookupConceptBridge(viInput);
                  }}
                  placeholder="Nhập cụm tiếng Việt bạn đang bí..."
                  className="flex-1 min-w-0 h-10 rounded-full bg-white px-4 text-[13px] font-semibold text-[#101E17] apple-shadow-xs focus:outline-none focus:ring-2 focus:ring-[#148343]/25"
                />
                <button
                  type="button"
                  onClick={() => handleLookupConceptBridge(viInput)}
                  disabled={isBridging}
                  className="h-10 px-4 rounded-full bg-[#148343] text-white text-[12.5px] font-bold inline-flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap disabled:opacity-60"
                >
                  <span>{isBridging ? 'Bridging...' : 'Bridge'}</span>
                  <ArrowRight className="w-3.5 h-3.5 stroke-[2.3]" />
                </button>
              </div>

              {/* Concept Bridge Result Card */}
              <SurfaceCard
                tone="mint"
                radius="lg"
                padding="md"
                className="flex flex-col gap-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#148343] block">
                      English concept chunk
                    </span>
                    <span className="text-[17px] font-extrabold text-[#0F1F18] leading-snug">
                      “{bridgeResult.englishChunk}”
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => playPronunciation(bridgeResult.englishChunk)}
                    className="w-9 h-9 rounded-full bg-white text-[#148343] flex items-center justify-center apple-shadow-xs cursor-pointer shrink-0"
                    title="Listen to English chunk"
                  >
                    <Volume2 className="w-4 h-4 stroke-[2.2]" />
                  </button>
                </div>

                <p className="text-[12px] text-[#4A5850] leading-snug">
                  {bridgeResult.contextAnchor}
                </p>

                <div className="rounded-[12px] bg-white/90 px-3 py-2">
                  <span className="text-[10.5px] font-bold text-[#148343] block">
                    Your turn (build your own sentence)
                  </span>
                  <p className="text-[12.5px] font-bold text-[#15231C] mt-0.5 leading-snug">
                    {bridgeResult.selfBuildPrompt}
                  </p>
                </div>
              </SurfaceCard>

              <div className="flex justify-end">
                <PillButton variant="primary" size="sm" onClick={onClose}>
                  Use this chunk
                </PillButton>
              </div>
            </div>
          ) : isTieredMode ? (
            <div className="flex flex-col gap-2.5">
              {level1 && (
                <SurfaceCard
                  tone="mint"
                  radius="lg"
                  padding="md"
                  className="flex flex-col gap-1"
                >
                  <span className="text-[11px] font-bold text-[#148343]">
                    Hint 1 · Thinking direction
                  </span>
                  <p className="text-[14.5px] font-bold text-[#101E17] leading-snug">
                    {level1}
                  </p>
                </SurfaceCard>
              )}

              {unlockedLevel >= 2 && level2 && (
                <SurfaceCard
                  tone="sage"
                  radius="lg"
                  padding="md"
                  className="flex flex-col gap-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-[#148343]">
                      Hint 2 · Sentence starter
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        playPronunciation(
                          level2.replace(/^(Start with:|Try adding:)\s*/i, '')
                        )
                      }
                      className="px-2.5 py-0.5 rounded-full bg-white text-[#148343] text-[11px] font-semibold inline-flex items-center gap-1 apple-shadow-xs cursor-pointer shrink-0"
                    >
                      <Volume2 className="w-3 h-3" />
                      <span>Listen</span>
                    </button>
                  </div>
                  <p className="text-[14.5px] font-bold text-[#101E17] leading-snug">
                    {level2}
                  </p>
                </SurfaceCard>
              )}

              {unlockedLevel >= 3 && level3 && (
                <SurfaceCard
                  tone="elevated"
                  radius="lg"
                  padding="md"
                  className="flex flex-col gap-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-[#55625B]">
                      Hint 3 · Model example
                    </span>
                    <button
                      type="button"
                      onClick={() => playPronunciation(level3)}
                      className="px-2.5 py-0.5 rounded-full bg-[#EAF6EE] text-[#148343] text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <Volume2 className="w-3 h-3" />
                      <span>Listen</span>
                    </button>
                  </div>
                  <p className="text-[14px] font-semibold text-[#101E17] leading-snug">
                    “{level3}”
                  </p>
                </SurfaceCard>
              )}

              {showVietnamese && vietnameseRescue && (
                <SurfaceCard
                  tone="muted"
                  radius="md"
                  padding="sm"
                  className="flex flex-col gap-0.5"
                >
                  <span className="text-[11px] font-bold text-[#49564F]">
                    Gợi ý tiếng Việt
                  </span>
                  <p className="text-[13px] text-[#2A3630] leading-relaxed">
                    {vietnameseRescue}
                  </p>
                </SurfaceCard>
              )}

              <div className="flex items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-2">
                  {((unlockedLevel === 1 && level2) ||
                    (unlockedLevel === 2 && level3)) && (
                    <PillButton
                      variant="secondary"
                      size="sm"
                      onClick={handleRevealNextTier}
                      leftIcon={
                        <Sparkles className="w-3.5 h-3.5 text-[#148343]" />
                      }
                    >
                      {unlockedLevel === 1 ? 'Show starter' : 'Show example'}
                    </PillButton>
                  )}

                  {vietnameseRescue && !showVietnamese && (
                    <PillButton
                      variant="ghost"
                      size="sm"
                      onClick={handleToggleVietnamese}
                      leftIcon={
                        <Languages className="w-3.5 h-3.5 text-[#55625B]" />
                      }
                    >
                      Tiếng Việt
                    </PillButton>
                  )}
                </div>

                <PillButton variant="primary" size="sm" onClick={onClose}>
                  Got it
                </PillButton>
              </div>
            </div>
          ) : (
            <>
              <SurfaceCard
                tone="mint"
                radius="lg"
                padding="md"
                className="flex flex-col gap-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11.5px] font-bold text-[#148343]">
                    {activePrompt.categoryLabel}
                  </span>
                  <span className="text-[11px] font-semibold text-[#647069] tabular-nums">
                    {currentIndex + 1} of {prompts.length}
                  </span>
                </div>

                <p className="text-[16.5px] font-bold text-[#101E17] leading-snug">
                  “{activePrompt.question}”
                </p>

                {activePrompt.helperText && (
                  <p className="text-[13px] text-[#525E57] mt-0.5 leading-relaxed">
                    {activePrompt.helperText}
                  </p>
                )}
              </SurfaceCard>

              <div className="flex items-center justify-between gap-3 pt-1">
                <PillButton
                  variant="secondary"
                  size="md"
                  onClick={handleNextPrompt}
                  leftIcon={
                    <RefreshCw className="w-3.5 h-3.5 text-[#148343]" />
                  }
                  className="text-[13.5px]"
                >
                  Next prompt
                </PillButton>

                <PillButton
                  variant="primary"
                  size="md"
                  onClick={onClose}
                  className="flex-1"
                >
                  Got it
                </PillButton>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
