import React, { useState } from 'react';
import {
  Sparkles,
  Goal,
  Check,
  Volume2,
  Tag,
  Pencil,
  Mic,
} from 'lucide-react';
import { motion } from 'motion/react';
import {
  SceneData,
  DetectedObject,
  ContextualExpression,
  PracticeContextKey,
  UserLevel,
} from '../types';
import { PRACTICE_CONTEXTS } from '../services/practiceAdapters';
import { WordDetailSheet } from '../components/WordDetailSheet';
import { playPronunciation } from '../utils/audioUtils';
import { RadiantRays } from '../components/RadiantRays';
import { AmbientMintArc } from '../components/ui/BrandMark';
import { PracticeHeader } from '../components/ui/PracticeHeader';
import { SurfaceCard } from '../components/ui/SurfaceCard';
import { PracticeActionFooter } from '../components/ui/PillButton';
import { MethodRoadmapStrip } from '../components/ui/MethodRoadmapStrip';
import { MethodGuideSheet } from '../components/ui/MethodGuideSheet';

interface SceneExplorerScreenProps {
  scene: SceneData;
  userLevel?: UserLevel;
  apiKeyConnected?: boolean;
  onOpenApiSettings?: () => void;
  onStartSpeaking: (
    contextKey?: PracticeContextKey,
    initialRootThought?: string,
    resolvedScene?: SceneData
  ) => void;
  onBack?: () => void;
}

const FALLBACK_COORDS: { x: number; y: number }[] = [
  { x: 50, y: 36 },
  { x: 23, y: 64 },
  { x: 76, y: 55 },
  { x: 74, y: 77 },
  { x: 34, y: 24 },
];

function getClampedPinStyle(
  obj: DetectedObject,
  idx: number
): React.CSSProperties {
  const fallback = FALLBACK_COORDS[idx % FALLBACK_COORDS.length];
  const rawX = typeof obj.xPercent === 'number' ? obj.xPercent : fallback.x;
  const rawY = typeof obj.yPercent === 'number' ? obj.yPercent : fallback.y;
  const clampedX = Math.min(82, Math.max(18, rawX));
  const clampedY = Math.min(80, Math.max(18, rawY));
  return {
    left: `${clampedX}%`,
    top: `${clampedY}%`,
  };
}

function inferInitialContextKey(title: string): PracticeContextKey {
  const lower = title.toLowerCase();
  if (
    lower.includes('coffee') ||
    lower.includes('morning') ||
    lower.includes('drink') ||
    lower.includes('rain') ||
    lower.includes('café')
  ) {
    return 'MORNING_COFFEE';
  }
  if (
    lower.includes('plan') ||
    lower.includes('week') ||
    lower.includes('deadline') ||
    lower.includes('lesson') ||
    lower.includes('evening')
  ) {
    return 'PLANNING_DAY';
  }
  return 'STUDY_WORKSPACE';
}

export const SceneExplorerScreen: React.FC<SceneExplorerScreenProps> = ({
  scene,
  userLevel = 'B1',
  apiKeyConnected,
  onOpenApiSettings,
  onStartSpeaking,
  onBack,
}) => {
  const selectedContextKey = inferInitialContextKey(scene.title);

  const [isEditingStarter, setIsEditingStarter] = useState<boolean>(false);
  const [customStarter, setCustomStarter] = useState<string>('');
  const [starterFromLabel, setStarterFromLabel] = useState<boolean>(false);
  const [spokenLabels, setSpokenLabels] = useState<string[]>([]);
  const [showMethodGuide, setShowMethodGuide] = useState<boolean>(false);
  const [selectedItem, setSelectedItem] = useState<
    DetectedObject | ContextualExpression | null
  >(null);

  const displayScene = scene;

  const fallbackStarter =
    PRACTICE_CONTEXTS[selectedContextKey]?.initialThought ||
    PRACTICE_CONTEXTS.STUDY_WORKSPACE.initialThought;

  const defaultStarter =
    displayScene.initialSuggestedThought ||
    displayScene.objects[0]?.contextualSentence ||
    fallbackStarter;

  const initialThoughtToUse = customStarter.trim() || defaultStarter;

  const displayObjects = displayScene.objects.slice(0, 5);
  const displayExpressions = displayScene.suggestedExpressions.slice(0, 3);

  const markLabelSpoken = (key: string) => {
    const normalized = key.trim().toLowerCase();
    if (!normalized) return;
    setSpokenLabels((prev) =>
      prev.includes(normalized) ? prev : [...prev, normalized]
    );
  };

  const namedObjectsCount = displayObjects.filter((obj) =>
    spokenLabels.includes(obj.name.toLowerCase())
  ).length;

  const handleObjectTap = (obj: DetectedObject) => {
    playPronunciation(obj.name);
    markLabelSpoken(obj.name);
    setSelectedItem(obj);
  };

  const handleExpressionTap = (expr: ContextualExpression) => {
    playPronunciation(expr.phrase);
    markLabelSpoken(expr.phrase);
    setSelectedItem(expr);
  };

  const handleQuickPracticeAllLabels = () => {
    const phraseList = displayObjects.map((o) => o.name).join('. ');
    playPronunciation(phraseList);
    displayObjects.forEach((o) => markLabelSpoken(o.name));
  };

  return (
    <div className="relative w-full min-h-[100dvh] bg-[#FAF9F6] text-[#0F1F18] px-4 sm:px-5 pt-3 pb-5 flex flex-col justify-between gap-2.5 select-none safe-top safe-bottom overflow-x-clip">
      <AmbientMintArc />

      <div className="relative z-10 flex flex-col gap-2.5">
        <PracticeHeader
          onBack={
            onBack
              ? onBack
              : () =>
                  onStartSpeaking(
                    selectedContextKey,
                    initialThoughtToUse,
                    displayScene
                  )
          }
          centerMode="brand"
          rightMode={onOpenApiSettings ? 'api-status' : 'none'}
          apiKeyConnected={apiKeyConnected}
          onOpenApiSettings={onOpenApiSettings}
        />

        <MethodRoadmapStrip
          activeMethod="LABEL"
          onOpenGuide={() => setShowMethodGuide(true)}
        />

        <div className="flex flex-col gap-1 pt-0.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#EAF6EE] text-[#148343] text-[10.5px] font-extrabold uppercase tracking-[0.04em]">
              <Tag className="w-3 h-3 stroke-[2.4]" />
              <span>Method 0 · Direct Labeling</span>
            </span>
            <span className="text-[10.5px] font-bold text-[#5A6760] truncate max-w-[190px]">
              {displayScene.title}
            </span>
          </div>

          <h1 className="text-[24px] sm:text-[27px] font-extrabold text-[#0D1F17] tracking-[-0.028em] leading-[1.14] inline-flex items-start mt-0.5">
            <span>Here’s what I see.</span>
            <RadiantRays className="w-5 h-5 -mt-1.5 ml-0.5" />
          </h1>
          <p className="text-[12.5px] text-[#55625B] leading-[1.4]">
            {userLevel === 'A2'
              ? 'Gắn nhãn trực tiếp (không dịch ngầm): Chạm đồ vật để nghe & đọc to cụm tiếng Anh, hoặc sửa câu gốc theo ý bạn.'
              : 'Direct object-to-English link: Tap detected objects to hear & say them aloud — then grow your starter sentence.'}
          </p>

          {displayScene.userGoal && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#EAF6EE] text-[#0E6D3B] text-[11px] font-bold w-fit mt-0.5">
              <Goal className="w-3 h-3 stroke-[2.3] shrink-0" />
              <span>Goal: {displayScene.userGoal}</span>
            </div>
          )}
        </div>

        {/* Scene Photo Card with Object-Anchored Floating Labels */}
        <div className="relative w-full aspect-[16/10] rounded-[24px] overflow-hidden bg-[#1D2621] apple-shadow-md">
          {displayScene.imageUrl ? (
            <img
              src={displayScene.imageUrl}
              alt={displayScene.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#173024] to-[#0D1E16]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/20 pointer-events-none" />

          {/* Active Label-Anything Micro-Habit Bar */}
          {displayObjects.length > 0 && (
            <div className="absolute top-2.5 left-2.5 right-2.5 z-20 flex items-center justify-between gap-2 pointer-events-none">
              <div className="bg-black/55 backdrop-blur-md text-white text-[11px] font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 whitespace-nowrap">
                {namedObjectsCount >= displayObjects.length ? (
                  <Check className="w-3 h-3 text-emerald-300 stroke-[2.8] shrink-0" />
                ) : (
                  <Mic className="w-3 h-3 text-emerald-300 stroke-[2.2] shrink-0" />
                )}
                <span>
                  Say aloud · {namedObjectsCount}/{displayObjects.length}
                </span>
              </div>

              {namedObjectsCount < displayObjects.length && (
                <button
                  type="button"
                  onClick={handleQuickPracticeAllLabels}
                  className="pointer-events-auto bg-white/92 hover:bg-white text-[#148343] text-[11px] font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1 shadow-xs transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Volume2 className="w-3 h-3 stroke-[2.2] shrink-0" />
                  <span>Hear all {displayObjects.length}</span>
                </button>
              )}
            </div>
          )}

          {displayObjects.map((obj, idx) => {
            const isNamed = spokenLabels.includes(obj.name.toLowerCase());
            return (
              <div
                key={`${obj.name}_${idx}`}
                style={getClampedPinStyle(obj, idx)}
                className="absolute -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center"
              >
                <motion.button
                  whileTap={{ scale: 0.94 }}
                  type="button"
                  onClick={() => handleObjectTap(obj)}
                  className={`backdrop-blur-md text-[11.5px] font-bold px-2.5 py-1 rounded-full shadow-[0_4px_16px_rgba(0,0,0,0.16)] flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap ${
                    isNamed
                      ? 'bg-[#EAF6EE]/96 text-[#0F5E30]'
                      : 'bg-white/96 hover:bg-white text-[#14201A]'
                  }`}
                >
                  {isNamed ? (
                    <span className="w-3.5 h-3.5 rounded-full bg-[#148343] text-white inline-flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </span>
                  ) : (
                    <Tag className="w-3 h-3 text-[#148343] stroke-[2.2] shrink-0" />
                  )}
                  <span>{obj.name.toLowerCase()}</span>
                </motion.button>
                <div className="w-[1.5px] h-1.5 bg-white/85" />
                <div className="w-2 h-2 rounded-full bg-[#148343] ring-2 ring-white shadow-xs" />
              </div>
            );
          })}
        </div>

        {/* Connected Starting Seed + Key Phrases Card */}
        <SurfaceCard
          tone="sage"
          radius="lg"
          padding="md"
          className="flex flex-col gap-3"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-start gap-2.5 min-w-0 flex-1">
              <Goal className="w-[18px] h-[18px] text-[#148343] stroke-[2.2] shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11.5px] font-bold text-[#148343]">
                    Your starting seed
                  </span>
                  {starterFromLabel && !isEditingStarter && (
                    <span className="text-[10px] font-bold bg-[#EAF6EE] text-[#148343] px-2 py-0.5 rounded-full whitespace-nowrap">
                      From label
                    </span>
                  )}
                </div>
                {!isEditingStarter ? (
                  <p className="text-[16px] font-extrabold text-[#101E17] leading-snug mt-0.5">
                    “{initialThoughtToUse}”
                  </p>
                ) : (
                  <input
                    type="text"
                    value={customStarter || defaultStarter}
                    onChange={(e) => {
                      setCustomStarter(e.target.value);
                      setStarterFromLabel(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') setIsEditingStarter(false);
                    }}
                    placeholder="e.g. I'm ordering iced matcha."
                    autoFocus
                    className="mt-1 w-full h-9 rounded-[12px] bg-white px-3 text-[14px] font-bold text-[#101E17] apple-shadow-xs focus:outline-none focus:ring-2 focus:ring-[#148343]/25"
                  />
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (!isEditingStarter && !customStarter) {
                    setCustomStarter(defaultStarter);
                  }
                  setIsEditingStarter((v) => !v);
                }}
                className="h-8 px-2.5 rounded-full bg-white/90 hover:bg-white text-[#4A5850] text-[11px] font-bold inline-flex items-center gap-1 apple-shadow-xs cursor-pointer whitespace-nowrap"
                aria-label="Customize starter sentence"
              >
                <Pencil className="w-3 h-3 text-[#148343] stroke-[2.2]" />
                <span>{isEditingStarter ? 'Done' : 'Edit'}</span>
              </button>

              <button
                type="button"
                onClick={() => playPronunciation(initialThoughtToUse)}
                className="w-8 h-8 rounded-full bg-white text-[#148343] flex items-center justify-center shrink-0 apple-shadow-xs cursor-pointer"
                aria-label="Listen to starter sentence"
              >
                <Volume2 className="w-4 h-4 stroke-[2.1]" />
              </button>
            </div>
          </div>

          {displayExpressions.length > 0 && (
            <div className="flex flex-col gap-1.5 pt-0.5">
              <span className="text-[11px] font-semibold text-[#58645D] flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#148343] stroke-[2.2]" />
                <span>Phrases we’ll weave into this sentence next:</span>
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {displayExpressions.map((expr) => {
                  const isUsed = spokenLabels.includes(
                    expr.phrase.toLowerCase()
                  );
                  return (
                    <motion.button
                      key={expr.phrase}
                      whileTap={{ scale: 0.96 }}
                      type="button"
                      onClick={() => handleExpressionTap(expr)}
                      className={`px-2.5 py-1 rounded-full apple-shadow-xs flex items-center gap-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                        isUsed
                          ? 'bg-[#EAF6EE] text-[#148343]'
                          : 'bg-white hover:bg-[#EAF6EE] text-[#122019]'
                      }`}
                    >
                      <Volume2 className="w-3 h-3 text-[#148343] stroke-[2.1] shrink-0" />
                      <span>{expr.phrase}</span>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          )}
        </SurfaceCard>
      </div>

      {/* Bottom Continue CTA -> Launches Method 1 (Sentence Expansion) */}
      <div className="relative z-10 mt-2">
        <PracticeActionFooter
          primaryLabel="Grow this thought"
          onPrimary={() =>
            onStartSpeaking(
              selectedContextKey,
              initialThoughtToUse,
              displayScene
            )
          }
        />
      </div>

      <WordDetailSheet
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onMarkSpoken={markLabelSpoken}
        onUseAsStarter={(sentence) => {
          setCustomStarter(sentence);
          setStarterFromLabel(true);
          setIsEditingStarter(false);
        }}
      />

      <MethodGuideSheet
        isOpen={showMethodGuide}
        onClose={() => setShowMethodGuide(false)}
      />
    </div>
  );
};
