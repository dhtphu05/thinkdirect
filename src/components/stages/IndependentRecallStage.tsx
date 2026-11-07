import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Goal, EyeOff, Lightbulb, X, Check, AlertCircle } from 'lucide-react';
import { InputMode, UserLevel } from '../../types';
import { extractThoughtChainNodes } from '../../services/speakingEngine';
import { VoiceInput, VoiceDraft } from '../VoiceInput';
import { PracticeHeader } from '../ui/PracticeHeader';
import { SurfaceCard } from '../ui/SurfaceCard';
import { ThoughtChainStrip } from '../ui/ThoughtChainStrip';
import { MethodRoadmapStrip } from '../ui/MethodRoadmapStrip';
import { MethodGuideSheet } from '../ui/MethodGuideSheet';

interface IndependentRecallStageProps {
  userLevel?: UserLevel;
  sceneContext?: string;
  hintVocabulary?: string[];
  memoryCueText?: string;
  apiKeyConnected?: boolean;
  onOpenApiSettings?: () => void;
  onBack: () => void;
  topicPrompt: string;
  inlineFeedback?: { type: 'success' | 'warning'; message: string } | null;
  onSubmitAttempt: (
    text: string,
    source: InputMode,
    durationSeconds?: number
  ) => void;
  isSubmitting: boolean;
  onRecallCueUsed: () => void;
}

export const IndependentRecallStage: React.FC<IndependentRecallStageProps> = ({
  userLevel = 'B1',
  sceneContext,
  hintVocabulary = [],
  memoryCueText,
  apiKeyConnected,
  onOpenApiSettings,
  onBack,
  topicPrompt,
  inlineFeedback,
  onSubmitAttempt,
  isSubmitting,
  onRecallCueUsed,
}) => {
  const [cueRevealed, setCueRevealed] = useState<boolean>(false);
  const [showMethodGuide, setShowMethodGuide] = useState<boolean>(false);
  const [draft, setDraft] = useState<VoiceDraft | null>(null);

  const liveChain = extractThoughtChainNodes(draft?.text || '');

  const handleRevealCue = () => {
    if (!cueRevealed) {
      setCueRevealed(true);
      onRecallCueUsed();
    }
  };

  return (
    <div className="relative z-10 flex flex-col gap-2.5 flex-1 justify-between">
      <div className="flex flex-col gap-2">
        <PracticeHeader
          onBack={onBack}
          centerMode="brand"
          rightMode={onOpenApiSettings ? 'api-status' : 'none'}
          apiKeyConnected={apiKeyConnected}
          onOpenApiSettings={onOpenApiSettings}
        />

        <MethodRoadmapStrip
          activeMethod="RECALL"
          onOpenGuide={() => setShowMethodGuide(true)}
        />

        {/* Explicit Method 4 Identity + Fading Scaffolding Contrast */}
        <div className="flex flex-col gap-1.5 pt-0.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#EAF6EE] text-[#148343] text-[10.5px] font-extrabold uppercase tracking-[0.04em]">
              <EyeOff className="w-3 h-3 stroke-[2.4]" />
              <span>Method 4 · Active Recall (1-Take Climax)</span>
            </span>
            <span className="text-[10.5px] font-bold text-[#5A6760]">
              {userLevel === 'A2'
                ? 'Rút giàn giáo · Nói liền 1 mạch'
                : 'Fading scaffolding'}
            </span>
          </div>

          {/* Visual Proof of Faded Scaffolding */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F1F3F0] text-[#5B6860] text-[10.5px] font-bold">
              <X className="w-2.5 h-2.5 stroke-[2.6] text-[#7A867E]" />
              <span>Photo hidden</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F1F3F0] text-[#5B6860] text-[10.5px] font-bold">
              <X className="w-2.5 h-2.5 stroke-[2.6] text-[#7A867E]" />
              <span>Prompts hidden</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#EAF6EE] text-[#148343] text-[10.5px] font-extrabold">
              <Check className="w-2.5 h-2.5 stroke-[3]" />
              <span>Full story in own words</span>
            </span>
          </div>

          <p className="text-[12.5px] text-[#4E5B54] leading-snug">
            {userLevel === 'A2'
              ? 'Ảnh và câu mẫu đã ẩn — hãy tự xâu chuỗi toàn bộ ý từ Bước 0–3 thành 1 bài nói liền mạch.'
              : 'All visual & text scaffolds are gone — unite everything from Methods 0–3 in one smooth flow.'}
          </p>
        </div>

        {/* Clean Unassisted Topic Card + Live Semantic Thought-Chain Nodes */}
        <SurfaceCard
          tone="sage"
          radius="lg"
          padding="md"
          className="flex flex-col gap-2"
        >
          <div className="flex items-center gap-1.5 text-[#148343]">
            <Goal className="w-4 h-4 stroke-[2.2]" />
            <span className="text-[12px] font-bold">Active Recall Goal</span>
          </div>
          <p className="text-[14.5px] font-bold text-[#122019] leading-[1.35]">
            {topicPrompt}
          </p>
          <div className="rounded-[13px] bg-white/92 px-3 py-2 apple-shadow-xs">
            <ThoughtChainStrip
              nodes={liveChain.nodes}
              missingPrompt={liveChain.missingPrompt}
              showMissingPrompt
              compact
            />
          </div>
        </SurfaceCard>
      </div>

      {/* Centerpiece Hero Microphone + Validation Feedback */}
      <div className="my-auto py-1 flex flex-col gap-2">
        <AnimatePresence>
          {inlineFeedback && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="rounded-[12px] bg-amber-50 px-3 py-2 flex items-start gap-2 text-[12px] font-semibold text-amber-900 apple-shadow-xs"
            >
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
              <span>{inlineFeedback.message}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <VoiceInput
          key="independent_hero_mic"
          size="hero"
          idleLabel="Tap for Active Recall"
          targetDurationLabel="Aim for 30–60 seconds"
          sceneContext={sceneContext}
          hintVocabulary={hintVocabulary}
          onSubmit={onSubmitAttempt}
          onDraftChange={setDraft}
          isSubmitting={isSubmitting}
          placeholder="Express your activity, why it matters, the challenge, and your next step..."
        />
      </div>

      {/* Compact Optional Memory Cue */}
      <div className="flex justify-center">
        {!cueRevealed ? (
          <button
            type="button"
            onClick={handleRevealCue}
            className="h-8 px-3.5 rounded-full bg-white hover:bg-[#F2F4F1] text-[#3D4B43] text-[11.5px] font-bold inline-flex items-center gap-1.5 apple-shadow-xs transition-colors cursor-pointer"
          >
            <Lightbulb className="w-3.5 h-3.5 text-[#148343] stroke-[2.2]" />
            <span>
              {userLevel === 'A2'
                ? 'Quên ý? Xem sườn 3 phần'
                : 'Need a 3-part memory cue?'}
            </span>
          </button>
        ) : (
          <SurfaceCard
            tone="sage"
            radius="lg"
            padding="sm"
            className="w-full px-3.5 py-2"
          >
            <span className="block text-[11px] font-bold text-[#148343]">
              3-part memory cue
            </span>
            <p className="text-[12px] text-[#36443C] mt-0.5 leading-snug">
              {memoryCueText ||
                '1. Activity & why · 2. What challenge came up · 3. Your first move.'}
            </p>
          </SurfaceCard>
        )}
      </div>

      <MethodGuideSheet
        isOpen={showMethodGuide}
        onClose={() => setShowMethodGuide(false)}
      />
    </div>
  );
};
