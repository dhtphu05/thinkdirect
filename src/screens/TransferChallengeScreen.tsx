import React, { useState, useEffect } from 'react';
import {
  EyeOff,
  Timer,
  Sparkles,
  Goal,
  AlertCircle,
  ArrowRight,
  Eye,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  SceneData,
  SessionResultData,
  SessionMode,
  InputMode,
} from '../types';
import {
  extractThoughtChainNodes,
  evaluateTransferAttempt,
  computeSessionMetrics,
  buildNaturalUpgrade,
} from '../services/speakingEngine';
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
  sessionMode?: SessionMode;
  initialAutoMode?: boolean;
  onAutoModeChange?: (next: boolean) => void;
  priorInitialThought?: string;
  onBack: () => void;
  onCompleteTransfer: (result: SessionResultData) => void;
}

const TRANSFER_SAMPLE_SPEECH: Record<string, string> = {
  coffee:
    "I'm having coffee before my morning class because I have a team presentation today. Traffic might be heavy this morning, so I'll review my slides and leave ten minutes early.",
  planning:
    "I'm organizing my schedule for this week because two major assignments are due soon. I might feel overwhelmed by deadlines, so first I'll silence notifications and finish the hardest task.",
  default:
    "I'm building a login page for my university project because students need to sign in securely. Something isn't working with authentication, maybe the token has expired, so I'll check the API response first.",
};

export const TransferChallengeScreen: React.FC<TransferChallengeScreenProps> = ({
  scene,
  challengeMode = 'transfer',
  originSessionId,
  sessionMode = 'demo',
  initialAutoMode = true,
  onAutoModeChange,
  priorInitialThought,
  onBack,
  onCompleteTransfer,
}) => {
  const [phase, setPhase] = useState<'OBSERVE' | 'SPEAK_BLIND'>(
    challengeMode === 'blind_recall' ? 'SPEAK_BLIND' : 'OBSERVE'
  );
  const [countdown, setCountdown] = useState<number>(5);
  const [autoMode, setAutoMode] = useState<boolean>(initialAutoMode);
  const [draft, setDraft] = useState<VoiceDraft | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  const handleToggleAuto = () => {
    setAutoMode((prev) => {
      const next = !prev;
      onAutoModeChange?.(next);
      return next;
    });
  };

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

  const sampleKey = /coffee|morning/i.test(scene.title)
    ? 'coffee'
    : /plan|week/i.test(scene.title)
      ? 'planning'
      : 'default';
  const sampleSpeech = TRANSFER_SAMPLE_SPEECH[sampleKey];

  const liveChain = extractThoughtChainNodes(draft?.text || '');

  const handleSubmit = (
    text: string,
    source: InputMode,
    durationSeconds = 28
  ) => {
    const evalRes = evaluateTransferAttempt(text, scene.title);
    if (!evalRes.isValid) {
      setWarningMessage(evalRes.feedback);
      return;
    }

    setWarningMessage(null);
    const initialBaseline =
      priorInitialThought ||
      scene.initialSuggestedThought ||
      "I'm drinking coffee.";

    const metrics = computeSessionMetrics({
      initialThought: initialBaseline,
      acceptedExpansions: [initialBaseline, text],
      expansionTotalAttempts: 1,
      whyAnswer: text,
      howAnswer: '',
      selfTalkTranscript: text,
      independentRecallTranscript: text,
      recallIdeasIdentified: evalRes.nodes
        .filter((n) => n.isComplete)
        .map((n) => n.label),
      hintEvents: [],
      attempts: [
        {
          source,
          durationSeconds: Math.max(24, durationSeconds),
          isValid: true,
        },
      ],
      selfTalkDurationSeconds: 0,
      recallDurationSeconds: Math.max(24, durationSeconds),
      stagesCompleted: 4,
    });

    const naturalUpgrade = buildNaturalUpgrade({
      initialThought: initialBaseline,
      independentRecall: text,
      sceneTitle: scene.title,
    });

    const result: SessionResultData = {
      id: `${challengeMode}_${Date.now()}`,
      timestamp: Date.now(),
      sceneTitle: scene.title,
      sceneImageUrl: scene.imageUrl,
      isDemoSession: sessionMode === 'demo' && autoMode,
      sessionType:
        challengeMode === 'transfer' ? 'transfer_challenge' : 'blind_recall',
      originSessionId,
      objectsLearned: scene.objects,
      expressionsLearned: scene.suggestedExpressions,
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
      selfTalkDuration: Math.max(24, durationSeconds),
      totalHintsUsed: 0,
      ideasExpressedCount: Math.max(4, evalRes.pillarsTransferred + 1),
      independentExpressionsUsed: evalRes.independentExpressionsUsed,
      communicationStrength: evalRes.feedback,
      oneThingToImprove:
        evalRes.missingPillarPrompt ||
        'Keep testing new everyday scenes with zero prompts to solidify automatic English thinking.',
      suggestedNextPractice:
        'Try capturing a live photo of your workspace or street view for another 30s Transfer Check.',
    };

    onCompleteTransfer(result);
  };

  return (
    <div className="relative w-full min-h-[100dvh] bg-[#FAF9F6] text-[#0F1F18] px-4 sm:px-5 pt-3 pb-5 flex flex-col justify-between gap-3 select-none safe-top safe-bottom overflow-x-clip">
      <AmbientMintArc />

      <div className="relative z-10 flex flex-col gap-3">
        <PracticeHeader
          onBack={onBack}
          centerMode="brand"
          rightMode="auto-sparkles"
          autoActive={autoMode}
          onToggleAuto={handleToggleAuto}
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
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAF6EE] text-[#148343] text-[11.5px] font-bold mb-1.5 tabular-nums">
                  <Eye className="w-3.5 h-3.5 stroke-[2.2]" />
                  <span>Observe unseen scene · Hiding in {countdown}s</span>
                </div>
                <h1 className="text-[26px] sm:text-[29px] font-extrabold text-[#0D1F17] tracking-[-0.028em] leading-[1.14]">
                  New context. No prompts.
                </h1>
                <p className="text-[13.5px] text-[#55625B] leading-[1.45] mt-1">
                  Take a 5-second look at this new scene. When it disappears, build a full English thought on your own.
                </p>
              </div>

              {/* Unseen Photo Preview with ZERO English Labels */}
              <div className="relative w-full aspect-[4/3] rounded-[26px] overflow-hidden apple-shadow-md bg-[#E8ECE9]">
                <img
                  src={scene.imageUrl}
                  alt={scene.title}
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
                  <span className="text-[14.5px] font-bold">{scene.title}</span>
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
                  Topic: <strong className="text-[#101E17]">{scene.title}</strong> — express what’s happening, why it matters, a challenge, and your next move.
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
                  key={`transfer_mic_${challengeMode}`}
                  size="hero"
                  idleLabel="Tap for 30s unassisted speech"
                  targetDurationLabel="30s · Zero hints · Own words"
                  onSubmit={handleSubmit}
                  onDraftChange={setDraft}
                  sampleResponse={sampleSpeech}
                  isDemoMode={sessionMode === 'demo'}
                  autoHappyPath={autoMode}
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
                  <strong className="text-[#101E17]">Fluency check:</strong> Connects Action → Context → Purpose → Next step in a new scene without memorized prompts.
                </p>
              </SurfaceCard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {phase === 'SPEAK_BLIND' && challengeMode === 'transfer' && (
        <div className="relative z-10 flex justify-center pt-1">
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
        </div>
      )}
    </div>
  );
};
