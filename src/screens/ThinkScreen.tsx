import React, { useState } from 'react';
import {
  Laptop,
  GraduationCap,
  Coffee,
  ChevronRight,
  RefreshCw,
  EyeOff,
  Zap,
} from 'lucide-react';
import { SceneData, SessionResultData, PracticeContextKey } from '../types';
import {
  DAILY_SPEAKING_PROMPTS,
  PromptCategory,
  DailyPromptItem,
} from '../data/dailyPromptsData';
import { SAMPLE_STUDY_SCENE } from '../data/sampleSceneData';
import { AmbientMintArc } from '../components/ui/BrandMark';
import { PracticeHeader } from '../components/ui/PracticeHeader';
import { SurfaceCard } from '../components/ui/SurfaceCard';

interface ThinkScreenProps {
  onSelectScene: (scene: SceneData, contextKey?: PracticeContextKey) => void;
  onStartFreeSelfTalk: () => void;
  onStartDailySprint?: (scene?: SceneData) => void;
  onStartTransferChallenge?: () => void;
  latestResult?: SessionResultData | null;
  streakDays?: number;
}

const CATEGORY_TABS: Array<{ id: PromptCategory; label: string }> = [
  { id: 'all', label: 'All (12)' },
  { id: 'work_tech', label: 'Work & Tech' },
  { id: 'campus_study', label: 'Campus' },
  { id: 'daily_life', label: 'Daily Life' },
];

function getCategoryIcon(category: DailyPromptItem['category']) {
  if (category === 'work_tech') return Laptop;
  if (category === 'campus_study') return GraduationCap;
  return Coffee;
}

export const ThinkScreen: React.FC<ThinkScreenProps> = ({
  onSelectScene,
  onStartDailySprint,
  onStartTransferChallenge,
  streakDays = 3,
}) => {
  const [selectedCategory, setSelectedCategory] =
    useState<PromptCategory>('all');

  const visiblePrompts =
    selectedCategory === 'all'
      ? DAILY_SPEAKING_PROMPTS
      : DAILY_SPEAKING_PROMPTS.filter((p) => p.category === selectedCategory);

  const handleRandomTopic = () => {
    const pool =
      visiblePrompts.length > 0 ? visiblePrompts : DAILY_SPEAKING_PROMPTS;
    const randomPick = pool[Math.floor(Math.random() * pool.length)];
    onSelectScene(randomPick.scene, randomPick.contextKey);
  };

  return (
    <div className="relative w-full flex-1 bg-[#FAF9F6] text-[#0F1F18] px-4 sm:px-5 pt-3 pb-24 flex flex-col gap-3 select-none safe-top overflow-x-clip">
      <AmbientMintArc />

      <div className="relative z-10 flex flex-col gap-3">
        <PracticeHeader rightMode="streak" streakDays={streakDays} />

        <div>
          <h1 className="text-[26px] sm:text-[28px] font-extrabold tracking-[-0.028em] text-[#0D1F17] leading-tight">
            Daily <span className="text-[#148343]">Practice</span>.
          </h1>
          <p className="text-[13.5px] text-[#58645D] mt-0.5 leading-snug">
            Short workouts when you don’t want to open the camera.
          </p>
        </div>

        {/* Fast Daily Habits: 90s Daily Sprint + 30s Unseen Scene Transfer */}
        <div className="grid grid-cols-2 gap-2">
          {onStartDailySprint && (
            <SurfaceCard
              tone="elevated"
              radius="lg"
              padding="sm"
              interactive
              onClick={() => onStartDailySprint(SAMPLE_STUDY_SCENE)}
              className="px-3.5 py-3 flex flex-col justify-between gap-2"
            >
              <div className="flex items-center justify-between gap-1.5">
                <div className="w-8 h-8 rounded-[11px] bg-[#EAF6EE] text-[#148343] flex items-center justify-center shrink-0">
                  <Zap className="w-4 h-4 stroke-[2.2]" />
                </div>
                <span className="text-[10px] font-bold text-[#148343] bg-[#EAF6EE] px-2 py-0.5 rounded-full whitespace-nowrap">
                  Busy day
                </span>
              </div>
              <div>
                <h3 className="text-[13.5px] font-extrabold text-[#0F1F18] leading-snug">
                  90s Daily Sprint
                </h3>
                <p className="text-[11px] text-[#58645D] leading-snug mt-0.5">
                  Label aloud → 45s blind recall.
                </p>
              </div>
            </SurfaceCard>
          )}

          {onStartTransferChallenge && (
            <SurfaceCard
              tone="mint"
              radius="lg"
              padding="sm"
              interactive
              onClick={onStartTransferChallenge}
              className="bg-gradient-to-br from-[#E6F6EC] to-[#D8F0E1] px-3.5 py-3 flex flex-col justify-between gap-2"
            >
              <div className="flex items-center justify-between gap-1.5">
                <div className="w-8 h-8 rounded-[11px] bg-[#148343] text-white flex items-center justify-center shrink-0">
                  <EyeOff className="w-4 h-4 stroke-[2.1]" />
                </div>
                <span className="text-[10px] font-bold text-[#148343] bg-white/85 px-2 py-0.5 rounded-full whitespace-nowrap">
                  Zero hints
                </span>
              </div>
              <div>
                <h3 className="text-[13.5px] font-extrabold text-[#0F1F18] leading-snug">
                  30s Transfer Check
                </h3>
                <p className="text-[11px] text-[#3F5147] leading-snug mt-0.5">
                  Unseen photo · 0 prompts.
                </p>
              </div>
            </SurfaceCard>
          )}
        </div>

        {/* No-Camera Daily Prompts Library (12 Scenarios) */}
        <div className="flex flex-col gap-2.5 pt-0.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h2 className="text-[16.5px] font-extrabold tracking-[-0.02em] text-[#0D1F17] leading-tight">
                No-camera daily prompts
              </h2>
              <p className="text-[11.5px] text-[#5C6861] mt-0.5">
                Pick a real-life moment and build your story in 4 steps.
              </p>
            </div>

            <button
              type="button"
              onClick={handleRandomTopic}
              className="h-8 px-3 rounded-full bg-[#EAF6EE] hover:bg-[#DCF0E4] text-[#148343] text-[11.5px] font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 whitespace-nowrap"
            >
              <RefreshCw className="w-3.5 h-3.5 stroke-[2.2]" />
              <span>Surprise me</span>
            </button>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {CATEGORY_TABS.map((tab) => {
              const isSelected = selectedCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedCategory(tab.id)}
                  className={`h-7 px-3 rounded-full text-[11.5px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                    isSelected
                      ? 'bg-[#148343] text-white apple-shadow-xs'
                      : 'bg-[#F2F4F1] text-[#55625B] hover:text-[#101E17]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-2">
            {visiblePrompts.map((topic) => {
              const Icon = getCategoryIcon(topic.category);
              return (
                <SurfaceCard
                  key={topic.id}
                  tone="elevated"
                  radius="lg"
                  padding="sm"
                  interactive
                  onClick={() => onSelectScene(topic.scene, topic.contextKey)}
                  className="flex items-center gap-3 px-3.5 py-2.5"
                >
                  <div className="w-9 h-9 rounded-[12px] bg-[#EAF6EE] text-[#148343] flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 stroke-[2.1]" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="text-[13.5px] font-bold text-[#101E17] leading-snug">
                        {topic.title}
                      </h3>
                      <span className="text-[10px] font-semibold text-[#148343] bg-[#EAF6EE] px-2 py-0.5 rounded-full whitespace-nowrap">
                        {topic.durationBadge}
                      </span>
                    </div>
                    <p className="text-[11.5px] text-[#5C6861] leading-[1.35] mt-0.5">
                      {topic.subtitle}
                    </p>
                  </div>

                  <ChevronRight className="w-4 h-4 text-[#69756E] shrink-0" />
                </SurfaceCard>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
