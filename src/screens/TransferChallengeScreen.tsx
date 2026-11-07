import React, { useState, useEffect, useRef } from 'react';
import {
  EyeOff,
  Timer,
  Sparkles,
  Goal,
  AlertCircle,
  ArrowRight,
  Eye,
  Upload,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  SceneData,
  SessionResultData,
  InputMode,
  NaturalPhrasingUpgrade,
} from '../types';
import {
  extractThoughtChainNodes,
  evaluateTransferAttempt,
  computeSessionMetrics,
  buildNaturalUpgrade,
} from '../services/speakingEngine';
import { apiFetch } from '../services/apiClient';
import { VoiceInput, VoiceDraft } from '../components/VoiceInput';
import { AmbientMintArc } from '../components/ui/BrandMark';
import { PracticeHeader } from '../components/ui/PracticeHeader';
import { SurfaceCard } from '../components/ui/SurfaceCard';
import { ThoughtChainStrip } from '../components/ui/ThoughtChainStrip';
import { PillButton } from '../components/ui/PillButton';

interface TransferChallengeScreenProps {
  scene: SceneData;
  challengeMode?: 'transfer' | 'blind_recall';
  originSessionId?: string;
  priorInitialThought?: string;
  apiKeyConnected?: boolean;
  onOpenApiSettings?: () => void;
  onBack: () => void;
  onCompleteTransfer: (result: SessionResultData) => void;
}

export const TransferChallengeScreen: React.FC<
  TransferChallengeScreenProps
> = ({
  scene,
  challengeMode = 'transfer',
  originSessionId,
  priorInitialThought,
  apiKeyConnected,
  onOpenApiSettings,
  onBack,
  onCompleteTransfer,
}) => {
  const [activeScene, setActiveScene] = useState<SceneData>(scene);
  const [phase, setPhase] = useState<'OBSERVE' | 'SPEAK_BLIND'>(
    challengeMode === 'blind_recall' ? 'SPEAK_BLIND' : 'OBSERVE'
  );
  const [countdown, setCountdown] = useState<number>(6);
  const [draft, setDraft] = useState<VoiceDraft | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setActiveScene(scene);
  }, [scene]);

  useEffect(() => {
    if (phase !== 'OBSERVE') return;
    if (countdown <= 0) {
      setPhase('SPEAK_BLIND');
      return;
    }
    const t = window.setTimeout(() => {
      setCountdown((c) => c - 1);
    }, 1000);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  const handleUploadCustomUnseenPhoto = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const cleanName = file.name
        .replace(/\.[^.]+$/, '')
        .replace(/[-_]+/g, ' ')
        .trim();
      setActiveScene({
        title:
          cleanName && cleanName.length <= 32
            ? `Unseen Photo · ${cleanName}`
            : 'Custom Unseen Photo',
        description: 'Unassisted 30-second transfer check on your own photo.',
        imageUrl: dataUrl,
        objects: [],
        suggestedExpressions: [],
        openingQuestion: 'What is happening here and what will you do next?',
        suggestedFramework: '5W1H',
        isSample: false,
      });
      setCountdown(6);
      setPhase('OBSERVE');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const liveChain = extractThoughtChainNodes(draft?.text || '');

  const handleSubmit = async (
    text: string,
    source: InputMode,
    durationSeconds = 26
  ) => {
    const clean = text.trim();
    const wordCount = clean.split(/\s+/).filter(Boolean).length;
    if (wordCount < 6) {
      setWarningMessage(
        'Speak at least two connected English sentences covering what is happening, why it matters, and your next move.'
      );
      return;
    }

    const localEval = evaluateTransferAttempt(clean, activeScene.title);

    setWarningMessage(null);
    setIsSubmitting(true);

    let coachFeedback = localEval.feedback;
    let coachImprovement =
      localEval.missingPillarPrompt ||
      'Keep testing new everyday scenes with zero prompts to solidify automatic English thinking.';
    let evaluatedByServer = false;

    try {
      const coachRes = await apiFetch('/api/coach-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: 'TRANSFER_CHALLENGE',
          sceneContext: activeScene.title,
          sceneObjects: activeScene.objects.map((o) => o.name),
          latestTranscript: clean,
        }),
      });
      if (coachRes.ok) {
        const coachData = await coachRes.json();
        evaluatedByServer = true;
        if (!coachData.isValid) {
          setIsSubmitting(false);
          setWarningMessage(
            coachData.feedback ||
              'Try connecting what is happening, why it matters, and your next step.'
          );
          return;
        }
        if (coachData.feedback) coachFeedback = coachData.feedback;
        if (coachData.hintL1) coachImprovement = coachData.hintL1;
      }
    } catch {
      // Fall back to local transfer evaluation below when offline
    }

    if (!evaluatedByServer && !localEval.isValid) {
      setIsSubmitting(false);
      setWarningMessage(localEval.feedback);
      return;
    }

    const initialBaseline =
      priorInitialThought ||
      activeScene.initialSuggestedThought ||
      'Started with zero prompts.';

    const metrics = computeSessionMetrics({
      initialThought: initialBaseline,
      acceptedExpansions: [initialBaseline, text],
      expansionTotalAttempts: 1,
      whyAnswer: text,
      howAnswer: '',
      selfTalkTranscript: text,
      independentRecallTranscript: text,
      recallIdeasIdentified: localEval.nodes
        .filter((n) => n.isComplete)
        .map((n) => n.label),
      hintEvents: [],
      attempts: [
        {
          source,
          durationSeconds: Math.max(20, durationSeconds),
          isValid: true,
        },
      ],
      selfTalkDurationSeconds: 0,
      recallDurationSeconds: Math.max(20, durationSeconds),
      stagesCompleted: 4,
    });

    let serverEval: {
      strength?: string;
      improvement?: string;
      independentExpressionsUsed?: string[];
      suggestedNextPractice?: string;
      naturalUpgrade?: NaturalPhrasingUpgrade;
    } = {};

    try {
      const evalRes = await apiFetch('/api/evaluate-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sceneTitle: activeScene.title,
          initialThought: initialBaseline,
          expansionSentences: [text],
          developmentSentences: [],
          selfTalkTranscript: text,
          independentRecallTranscript: text,
          hintsUsedCount: 0,
          selfTalkDurationSeconds: Math.max(20, durationSeconds),
        }),
      });
      if (evalRes.ok) {
        serverEval = await evalRes.json();
      }
    } catch {
      // Keep local naturalUpgrade fallback
    } finally {
      setIsSubmitting(false);
    }

    const naturalUpgrade =
      serverEval.naturalUpgrade ||
      buildNaturalUpgrade({
        initialThought: initialBaseline,
        independentRecall: text,
        sceneTitle: activeScene.title,
      });

    const result: SessionResultData = {
      id: `${challengeMode}_${Date.now()}`,
      timestamp: Date.now(),
      sceneTitle: activeScene.title,
      sceneImageUrl: activeScene.imageUrl,
      isDemoSession: false,
      sessionType:
        challengeMode === 'transfer' ? 'transfer_challenge' : 'blind_recall',
      originSessionId,
      objectsLearned: activeScene.objects,
      expressionsLearned: activeScene.suggestedExpressions,
      thoughtJourney: {
        initialThought: initialBaseline,
        expandedThought: text,
        purposeWhy: 'Transferred directly without guided prompts.',
        methodHow: 'Zero Step 1–3 scaffolding.',
        selfTalkMonologue: text,
        independentRecall: text,
      },
      metrics,
      naturalUpgrade,
      selfTalkDuration: Math.max(20, durationSeconds),
      totalHintsUsed: 0,
      ideasExpressedCount: Math.max(4, localEval.pillarsTransferred + 1),
      independentExpressionsUsed:
        serverEval.independentExpressionsUsed &&
        serverEval.independentExpressionsUsed.length > 0
          ? serverEval.independentExpressionsUsed
          : localEval.independentExpressionsUsed,
      communicationStrength: serverEval.strength || coachFeedback,
      oneThingToImprove: serverEval.improvement || coachImprovement,
      suggestedNextPractice:
        serverEval.suggestedNextPractice ||
        'Try capturing a live photo of your workspace or street view for another 30s Transfer Check.',
    };

    onCompleteTransfer(result);
  };

  return (
    <div className="relative w-full min-h-[100dvh] bg-[#FAF9F6] text-[#0F1F18] px-4 sm:px-5 pt-3 pb-5 flex flex-col justify-between gap-3 select-none safe-top safe-bottom overflow-x-clip">
      <AmbientMintArc />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleUploadCustomUnseenPhoto}
        className="hidden"
      />

      <div className="relative z-10 flex flex-col gap-3">
        <PracticeHeader
          onBack={onBack}
          centerMode="brand"
          rightMode={onOpenApiSettings ? 'api-status' : 'none'}
          apiKeyConnected={apiKeyConnected}
          onOpenApiSettings={onOpenApiSettings}
          stepLabel={
            challengeMode === 'transfer'
              ? 'Skill Transfer Check'
              : '24h Delayed Recall'
          }
          stageSubtitle={
            challengeMode === 'transfer'
              ? 'Unseen Scene · Zero Scaffolding'
              : 'Blind Memory Recall'
          }
          segments={['solid', 'solid', 'solid', 'solid']}
        />

        <AnimatePresence mode="wait">
          {phase === 'OBSERVE' ? (
            <motion.div
              key="observe_phase"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="flex flex-col gap-3.5"
            >
              <div>
                <div className="flex items-center justify-between gap-2 flex-wrap mb-1.5">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAF6EE] text-[#148343] text-[11.5px] font-bold tabular-nums">
                    <Eye className="w-3.5 h-3.5 stroke-[2.2]" />
                    <span>Observe unseen scene · Hiding in {countdown}s</span>
                  </div>

                  {challengeMode === 'transfer' && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="h-7 px-2.5 rounded-full bg-white hover:bg-[#EAF6EE] text-[#148343] text-[11px] font-bold inline-flex items-center gap-1 apple-shadow-xs cursor-pointer"
                    >
                      <Upload className="w-3 h-3 stroke-[2.2]" />
                      <span>Use my photo</span>
                    </button>
                  )}
                </div>

                <h1 className="text-[26px] sm:text-[29px] font-extrabold text-[#0D1F17] tracking-[-0.028em] leading-[1.14]">
                  New context. No prompts.
                </h1>
                <p className="text-[13.5px] text-[#55625B] leading-[1.45] mt-1">
                  Take a quick look at this unseen scene. When it disappears, build a full English thought on your own.
                </p>
              </div>

              {/* Unseen Photo Preview with ZERO English Labels */}
              <div className="relative w-full aspect-[4/3] rounded-[26px] overflow-hidden apple-shadow-md bg-[#E8ECE9]">
                <img
                  src={activeScene.imageUrl}
                  alt={activeScene.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 right-3 px-3 py-1.5 rounded-full bg-black/65 backdrop-blur-md text-white text-[12px] font-bold inline-flex items-center gap-1.5 tabular-nums">
                  <Timer className="w-3.5 h-3.5 text-[#7AE5A4]" />
                  <span>{countdown}s left</span>
                </div>
                <div className="absolute bottom-3 left-3 right-3 rounded-[16px] bg-black/60 backdrop-blur-md px-3.5 py-2.5 text-white">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#8CE6A8] block">
                    Unseen topic
                  </span>
                  <span className="text-[14.5px] font-bold">
                    {activeScene.title}
                  </span>
                </div>
              </div>

              <SurfaceCard tone="sage" radius="lg" padding="md">
                <span className="text-[11.5px] font-bold text-[#148343] block">
                  How Transfer Check proves fluency
                </span>
                <p className="text-[12.5px] text-[#3E4B44] mt-0.5 leading-relaxed">
                  No English object tags and no Step 1–3 coaching. Connect Action → Context → Purpose → Challenge → Next step directly.
                </p>
              </SurfaceCard>

              <PillButton
                variant="primary"
                size="lg"
                fullWidth
                onClick={() => setPhase('SPEAK_BLIND')}
                rightIcon={<ArrowRight className="w-4 h-4 stroke-[2.3]" />}
              >
                Hide photo & speak now
              </PillButton>
            </motion.div>
          ) : (
            <motion.div
              key="speak_blind_phase"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="flex flex-col gap-3"
            >
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAF6EE] text-[#148343] text-[11.5px] font-bold mb-1.5">
                  <EyeOff className="w-3.5 h-3.5 stroke-[2.2]" />
                  <span>
                    {challengeMode === 'transfer'
                      ? 'Scene hidden · Zero Step 1–3 prompts'
                      : '24h Blind Recall · No visual cues'}
                  </span>
                </div>
                <h1 className="text-[26px] sm:text-[29px] font-extrabold text-[#0D1F17] tracking-[-0.028em] leading-[1.14]">
                  {challengeMode === 'transfer'
                    ? 'Transfer your thinking.'
                    : 'Recall from memory.'}
                </h1>
                <p className="text-[13.5px] text-[#55625B] leading-[1.45] mt-1">
                  Topic:{' '}
                  <strong className="text-[#101E17]">
                    {activeScene.title}
                  </strong>{' '}
                  — express what’s happening, why it matters, a challenge, and your next move.
                </p>
              </div>

              {/* Live Semantic Thought-Chain Map */}
              <SurfaceCard
                tone="elevated"
                radius="lg"
                padding="md"
                className="px-3.5 py-3"
              >
                <ThoughtChainStrip
                  nodes={liveChain.nodes}
                  missingPrompt={liveChain.missingPrompt}
                  showMissingPrompt
                />
              </SurfaceCard>

              {warningMessage && (
                <SurfaceCard
                  tone="muted"
                  radius="md"
                  padding="sm"
                  className="bg-amber-50/90 flex items-start gap-2 px-3.5 py-2.5"
                >
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span className="text-[12px] font-semibold text-amber-900 leading-snug">
                    {warningMessage}
                  </span>
                </SurfaceCard>
              )}

              <div className="py-1">
                <VoiceInput
                  key={`transfer_mic_${challengeMode}_${activeScene.title}`}
                  size="hero"
                  idleLabel="Tap for 30s unassisted speech"
                  targetDurationLabel="30s · Zero hints · Own words"
                  sceneContext={activeScene.title}
                  hintVocabulary={activeScene.objects.map((o) => o.name)}
                  isSubmitting={isSubmitting}
                  onSubmit={handleSubmit}
                  onDraftChange={setDraft}
                  placeholder="Speak directly in English: what you're doing, why, any obstacle, and what you'll do first..."
                />
              </div>

              <SurfaceCard
                tone="sage"
                radius="lg"
                padding="sm"
                className="px-3.5 py-2.5 flex items-center gap-2.5"
              >
                <div className="w-7 h-7 rounded-[9px] bg-white text-[#148343] flex items-center justify-center shrink-0 apple-shadow-xs">
                  <Goal className="w-4 h-4 stroke-[2.2]" />
                </div>
                <p className="text-[12px] text-[#3E4B44] leading-snug">
                  <strong className="text-[#101E17]">Fluency check:</strong>{' '}
                  Connects Action → Context → Purpose → Next step in an unseen scene without memorized prompts.
                </p>
              </SurfaceCard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {phase === 'SPEAK_BLIND' && challengeMode === 'transfer' && (
        <div className="relative z-10 flex items-center justify-center gap-4 pt-1">
          <button
            type="button"
            onClick={() => {
              setCountdown(5);
              setPhase('OBSERVE');
            }}
            className="text-[12px] font-semibold text-[#5E6B63] hover:text-[#148343] inline-flex items-center gap-1 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Peek scene again (5s)</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-[12px] font-semibold text-[#148343] hover:opacity-80 inline-flex items-center gap-1 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload new photo</span>
          </button>
        </div>
      )}
    </div>
  );
};
