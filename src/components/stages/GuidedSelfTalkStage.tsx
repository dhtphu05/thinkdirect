import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Volume2,
  Check,
  Lock,
  AlertCircle,
  Languages,
  Lightbulb,
  MessageSquare,
} from 'lucide-react';
import {
  InputMode,
  SceneData,
  ThinkingPrompt,
  UserLevel,
} from '../../types';
import { VoiceInput, VoiceDraft } from '../VoiceInput';
import { PracticeHeader } from '../ui/PracticeHeader';
import { SurfaceCard } from '../ui/SurfaceCard';
import { YourStoryBanner } from '../ui/YourStoryBanner';
import { MethodRoadmapStrip } from '../ui/MethodRoadmapStrip';
import { MethodGuideSheet } from '../ui/MethodGuideSheet';

interface GuidedSelfTalkStageProps {
  scene: SceneData;
  storySentences?: string[];
  userLevel?: UserLevel;
  apiKeyConnected?: boolean;
  onOpenApiSettings?: () => void;
  hintVocabulary?: string[];
  explicitBeats?: [string, string, string];
  onValidateBeat?: (
    text: string,
    beatStep: number,
    priorBeats: string[]
  ) => Promise<{ isValid: boolean; feedback: string }>;
  onBack: () => void;
  selfTalkPrompt: string;
  selfTalkMonologue: string;
  thinkingPrompts: ThinkingPrompt[];
  inlineFeedback?: { type: 'success' | 'warning'; message: string } | null;
  onPlaySentence: (text: string, key: string) => void;
  onSubmitAttempt: (
    text: string,
    source: InputMode,
    durationSeconds?: number
  ) => void;
  isSubmitting: boolean;
  onOpenHint: () => void;
  onOpenConceptBridge: () => void;
}

function splitMonologueIntoThreeBeats(
  monologue: string
): [string, string, string] {
  const sentences = monologue
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (sentences.length >= 3) {
    return [sentences[0], sentences[1], sentences.slice(2).join(' ')];
  }

  if (sentences.length === 2) {
    const firstParts = sentences[0].split(/,\s+and\s+/i);
    if (firstParts.length >= 2) {
      const b1 = /[.!?]$/.test(firstParts[0])
        ? firstParts[0]
        : `${firstParts[0]}.`;
      const b2Raw = firstParts.slice(1).join(', and ');
      const b2 =
        b2Raw.charAt(0).toUpperCase() +
        b2Raw.slice(1).replace(/[.!?]*$/, '.');
      return [b1, b2, sentences[1]];
    }
  }

  return [
    'Right now, I notice an important detail in front of me.',
    'Maybe a small delay or challenge could come up if I rush.',
    "First, I'll handle the main step carefully.",
  ];
}

function detectThreeBeats(text: string): [boolean, boolean, boolean] {
  const trimmed = text.trim();
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length < 4) return [false, false, false];

  const beat1 = words.length >= 4;
  const beat2 =
    /\b(maybe|might|perhaps|could|probably|possible|in case|wonder|think|because|if|seem|looks like)\b/i.test(
      trimmed
    );
  const beat3 =
    /\b(should|will|i'll|first|next|going to|let me|need to|plan to|check|start|review|make sure)\b/i.test(
      trimmed
    );

  return [beat1, beat2, beat3];
}

export const GuidedSelfTalkStage: React.FC<GuidedSelfTalkStageProps> = ({
  scene,
  storySentences = [],
  userLevel = 'B1',
  apiKeyConnected,
  onOpenApiSettings,
  hintVocabulary = [],
  explicitBeats,
  onValidateBeat,
  onBack,
  selfTalkPrompt,
  selfTalkMonologue,
  inlineFeedback,
  onPlaySentence,
  onSubmitAttempt,
  isSubmitting,
  onOpenHint,
  onOpenConceptBridge,
}) => {
  const [practiceStyle, setPracticeStyle] = useState<'beats' | 'flow'>('flow');
  const [beatStep, setBeatStep] = useState<number>(1);
  const [spokenBeats, setSpokenBeats] = useState<string[]>([]);
  const [isValidatingBeat, setIsValidatingBeat] = useState<boolean>(false);
  const [localWarning, setLocalWarning] = useState<string | null>(null);
  const [selectedStarter, setSelectedStarter] = useState<string>('');
  const [showSample, setShowSample] = useState<boolean>(false);
  const [showMethodGuide, setShowMethodGuide] = useState<boolean>(false);
  const [draft, setDraft] = useState<VoiceDraft | null>(null);

  useEffect(() => {
    setBeatStep(1);
    setSpokenBeats([]);
    setLocalWarning(null);
    setSelectedStarter('');
  }, [selfTalkMonologue]);

  const beatSamples = useMemo(
    () =>
      explicitBeats && explicitBeats.every(Boolean)
        ? explicitBeats
        : splitMonologueIntoThreeBeats(selfTalkMonologue),
    [explicitBeats, selfTalkMonologue]
  );

  const flowBeats = useMemo(
    () => detectThreeBeats(draft?.text || ''),
    [draft?.text]
  );

  const beatConfigs = [
    {
      num: 1,
      code: 'NOTICE',
      label: "Observe what's happening",
      starters: ['Right now,...', 'Looking at this,...'],
      sample: beatSamples[0],
    },
    {
      num: 2,
      code: 'HYPOTHESIZE',
      label: 'Wonder aloud why / what if',
      starters: ['Maybe...', 'It might...'],
      sample: beatSamples[1],
    },
    {
      num: 3,
      code: 'DECIDE',
      label: 'Direct your first move',
      starters: ['I should...', "First, I'll..."],
      sample: beatSamples[2],
    },
  ];

  const activeBeatCfg = beatConfigs[Math.min(beatStep - 1, 2)];

  const handleBeatSubmit = async (
    text: string,
    source: InputMode,
    durationSeconds = 6
  ) => {
    const clean = text.trim();
    const wordCount = clean.split(/\s+/).filter(Boolean).length;
    if (wordCount < 3) {
      setLocalWarning(
        `Say one complete English thought for Beat ${beatStep} (${activeBeatCfg.code}).`
      );
      return;
    }

    if (onValidateBeat) {
      setIsValidatingBeat(true);
      try {
        const res = await onValidateBeat(clean, beatStep, spokenBeats);
        if (!res.isValid) {
          setLocalWarning(res.feedback);
          setIsValidatingBeat(false);
          return;
        }
      } finally {
        setIsValidatingBeat(false);
      }
    }

    setLocalWarning(null);
    setSelectedStarter('');
    const formatted = /[.!?]$/.test(clean) ? clean : `${clean}.`;
    const nextBeats = [...spokenBeats, formatted];

    if (beatStep < 3) {
      setSpokenBeats(nextBeats);
      setBeatStep(beatStep + 1);
      return;
    }

    const combinedMonologue = nextBeats.join(' ');
    onSubmitAttempt(
      combinedMonologue,
      source,
      Math.max(18, durationSeconds * 3)
    );
  };

  const handleInternalBack = () => {
    if (practiceStyle === 'beats' && beatStep > 1) {
      setLocalWarning(null);
      setSpokenBeats((prev) => prev.slice(0, -1));
      setBeatStep((s) => s - 1);
      return;
    }
    onBack();
  };

  const activeWarning = localWarning || inlineFeedback?.message || null;

  return (
    <div className="relative z-10 flex flex-col gap-2 flex-1 justify-between">
      <div className="flex flex-col gap-1.5">
        <PracticeHeader
          onBack={handleInternalBack}
          centerMode="brand"
          rightMode={onOpenApiSettings ? 'api-status' : 'none'}
          apiKeyConnected={apiKeyConnected}
          onOpenApiSettings={onOpenApiSettings}
        />

        <MethodRoadmapStrip
          activeMethod="SELF_TALK"
          onOpenGuide={() => setShowMethodGuide(true)}
        />

        {/* Explicit Method Identity Header + Mode Toggle */}
        <div className="flex flex-col gap-1 pt-0.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#EAF6EE] text-[#148343] text-[10.5px] font-extrabold uppercase tracking-[0.04em]">
              <MessageSquare className="w-3 h-3 stroke-[2.4]" />
              <span>
                {practiceStyle === 'beats'
                  ? `Method 3 · Guided Self-Talk (${beatStep}/3)`
                  : 'Method 3 · Guided Self-Talk (1-Take)'}
              </span>
            </span>

            <div className="bg-[#EFF2EF] p-0.5 rounded-full inline-flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => {
                  setLocalWarning(null);
                  setPracticeStyle('beats');
                }}
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                  practiceStyle === 'beats'
                    ? 'bg-white text-[#148343] apple-shadow-xs font-extrabold'
                    : 'text-[#5A675F]'
                }`}
              >
                3-Beat Step
              </button>
              <button
                type="button"
                onClick={() => {
                  setLocalWarning(null);
                  setPracticeStyle('flow');
                }}
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                  practiceStyle === 'flow'
                    ? 'bg-white text-[#148343] apple-shadow-xs font-extrabold'
                    : 'text-[#5A675F]'
                }`}
              >
                1-Take Flow
              </button>
            </div>
          </div>

          <p className="text-[12px] text-[#4E5B54] leading-snug">
            {userLevel === 'A2'
              ? 'Tự độc thoại 1 mình không cần bạn luyện: Nói thành tiếng qua 3 nhịp phản xạ Notice → Hypothesize → Decide.'
              : 'Solo English reflex (no partner needed): Talk yourself through this moment in 3 thinking beats.'}
          </p>
        </div>

        {/* Continuous Story Bridge from Methods 1 & 2 */}
        {storySentences.length > 0 && (
          <YourStoryBanner
            imageUrl={scene.imageUrl}
            sceneTitle={scene.title}
            storySentences={storySentences}
            highlightLatest={false}
            onListen={(text) => onPlaySentence(text, 'story_selftalk')}
          />
        )}

        {/* Live Situation Card + 3 Solo-Reflex Beats */}
        <SurfaceCard
          tone="sage"
          radius="lg"
          padding="sm"
          className="px-3 py-2 flex flex-col gap-1.5"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-[13px] font-bold text-[#122019] leading-[1.34] flex-1">
              {selfTalkPrompt}
            </p>

            {practiceStyle === 'flow' && (
              <button
                type="button"
                onClick={() => setShowSample((v) => !v)}
                className="text-[10.5px] font-bold text-[#148343] bg-white px-2.5 py-0.5 rounded-full apple-shadow-xs flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap"
              >
                <Sparkles className="w-3 h-3 shrink-0" />
                <span>{showSample ? 'Hide' : 'Example'}</span>
              </button>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            {beatConfigs.map((beat, idx) => {
              if (practiceStyle === 'flow') {
                const isDone = flowBeats[idx];
                return (
                  <div
                    key={beat.num}
                    className={`rounded-[11px] px-2.5 py-1.5 flex items-center justify-between gap-2 transition-colors ${
                      isDone ? 'bg-[#E3F4EA]' : 'bg-white/92'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`w-4.5 h-4.5 rounded-full text-[10px] font-extrabold flex items-center justify-center shrink-0 ${
                          isDone
                            ? 'bg-[#148343] text-white'
                            : 'bg-[#EAF6EE] text-[#148343]'
                        }`}
                      >
                        {isDone ? (
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        ) : (
                          beat.num
                        )}
                      </span>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#148343] whitespace-nowrap">
                        {beat.code}
                      </span>
                      <span className="text-[11.5px] font-bold text-[#14221B] truncate">
                        · {beat.label}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        onPlaySentence(beat.sample, `beat_flow_${beat.num}`)
                      }
                      className="text-[10.5px] font-semibold text-[#148343] inline-flex items-center gap-1 shrink-0 cursor-pointer whitespace-nowrap"
                    >
                      <Volume2 className="w-3 h-3" />
                      <span>{beat.starters[0]}</span>
                    </button>
                  </div>
                );
              }

              const isBeatDone = beat.num < beatStep;
              const isBeatCurrent = beat.num === beatStep;
              const spokenLine = spokenBeats[idx] || beat.sample;

              if (isBeatDone) {
                return (
                  <div
                    key={beat.num}
                    className="rounded-[11px] bg-[#E8F6EE] px-2.5 py-1.5 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <span className="inline-flex items-center gap-1 text-[9.5px] font-extrabold uppercase tracking-wider text-[#148343]">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                        <span>
                          Beat {beat.num} · {beat.code}
                        </span>
                      </span>
                      <p className="text-[12px] font-bold text-[#14221B] leading-snug">
                        “{spokenLine}”
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        onPlaySentence(spokenLine, `spoken_beat_${beat.num}`)
                      }
                      aria-label={`Listen to beat ${beat.num}`}
                      className="w-6.5 h-6.5 rounded-full bg-white text-[#148343] flex items-center justify-center shrink-0 apple-shadow-xs cursor-pointer"
                    >
                      <Volume2 className="w-3 h-3 stroke-[2.2]" />
                    </button>
                  </div>
                );
              }

              if (isBeatCurrent) {
                return (
                  <div
                    key={beat.num}
                    className="rounded-[12px] bg-white ring-2 ring-[#148343]/30 px-2.5 py-2 flex flex-col gap-1.5 apple-shadow-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-[#148343]">
                        <span className="w-4.5 h-4.5 rounded-full bg-[#148343] text-white text-[10px] flex items-center justify-center">
                          {beat.num}
                        </span>
                        <span>
                          {beat.code} · {beat.label}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          onPlaySentence(beat.sample, `model_beat_${beat.num}`)
                        }
                        className="px-2 py-0.5 rounded-full bg-[#EAF6EE] text-[#148343] text-[10px] font-bold inline-flex items-center gap-1 shrink-0 cursor-pointer whitespace-nowrap"
                      >
                        <Volume2 className="w-3 h-3 stroke-[2.2]" />
                        <span>Model</span>
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {beat.starters.map((st) => {
                        const cleanSt = st.replace(/\.+$/, '');
                        const selected = selectedStarter === cleanSt;
                        return (
                          <button
                            key={st}
                            type="button"
                            onClick={() => {
                              setSelectedStarter(cleanSt);
                              onPlaySentence(cleanSt, `st_${st}`);
                            }}
                            className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold inline-flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap ${
                              selected
                                ? 'bg-[#148343] text-white'
                                : 'bg-[#F2F6F3] hover:bg-[#E5EFE8] text-[#148343]'
                            }`}
                          >
                            <Volume2 className="w-2.5 h-2.5 stroke-[2.2]" />
                            <span>{st}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={beat.num}
                  className="rounded-[10px] bg-white/70 px-2.5 py-1.5 flex items-center justify-between gap-2"
                >
                  <span className="text-[11px] font-bold text-[#5E6B64]">
                    {beat.num}. {beat.code} · {beat.label}
                  </span>
                  <Lock className="w-3 h-3 text-[#838F88] shrink-0" />
                </div>
              );
            })}
          </div>

          <AnimatePresence>
            {practiceStyle === 'flow' && showSample && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-0.5 bg-white rounded-[13px] p-2.5 flex flex-col gap-1 apple-shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#148343]">
                      Model Self-Talk Monologue
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        onPlaySentence(selfTalkMonologue, 'monologue')
                      }
                      className="text-[10.5px] font-semibold text-[#148343] bg-[#EAF6EE] px-2 py-0.5 rounded-full flex items-center gap-1 cursor-pointer"
                    >
                      <Volume2 className="w-3 h-3" />
                      <span>Listen</span>
                    </button>
                  </div>
                  <p className="text-[12px] text-[#334139] leading-snug">
                    “{selfTalkMonologue}”
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </SurfaceCard>
      </div>

      {/* Speaking Control Area */}
      <SurfaceCard
        tone="mint"
        radius="lg"
        padding="sm"
        className="px-3.5 py-2 flex flex-col gap-1.5"
      >
        <AnimatePresence>
          {activeWarning && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="rounded-[12px] bg-white/95 px-3 py-2 flex items-start gap-2 text-[12px] font-semibold text-amber-900 apple-shadow-xs"
            >
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
              <span>{activeWarning}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {practiceStyle === 'beats' ? (
          <VoiceInput
            key={`selftalk_beat_${beatStep}`}
            size="compact"
            idleLabel={
              selectedStarter
                ? `Speak starting with "${selectedStarter}..."`
                : `Speak Self-Talk Beat ${beatStep} of 3 (${activeBeatCfg.code})`
            }
            typingPrefill={selectedStarter ? `${selectedStarter} ` : ''}
            sceneContext={scene.title}
            hintVocabulary={hintVocabulary}
            onSubmit={handleBeatSubmit}
            isSubmitting={isSubmitting || isValidatingBeat}
            placeholder={`Say your ${activeBeatCfg.code.toLowerCase()} thought out loud...`}
          />
        ) : (
          <VoiceInput
            key="selftalk_flow_mic"
            size="compact"
            idleLabel="Speak all 3 Self-Talk beats in 1 flow"
            targetDurationLabel="Aim for 20–40 seconds"
            sceneContext={scene.title}
            hintVocabulary={hintVocabulary}
            onSubmit={onSubmitAttempt}
            onDraftChange={setDraft}
            isSubmitting={isSubmitting}
            placeholder="Notice what's happening, hypothesize why, and decide your first move..."
          />
        )}

        <div className="flex items-center justify-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={onOpenHint}
            className="h-7 px-3 rounded-full bg-white hover:bg-[#F3F5F3] text-[#18221D] text-[11px] font-bold inline-flex items-center gap-1.5 apple-shadow-xs transition-colors cursor-pointer whitespace-nowrap"
          >
            <Lightbulb className="w-3 h-3 text-[#148343] stroke-[2.2] shrink-0" />
            <span>{userLevel === 'A2' ? 'Gợi ý cách nói' : 'Need a hint?'}</span>
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

      <MethodGuideSheet
        isOpen={showMethodGuide}
        onClose={() => setShowMethodGuide(false)}
      />
    </div>
  );
};
