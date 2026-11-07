import React, { useState } from 'react';
import {
  Laptop,
  GraduationCap,
  Coffee,
  ChevronRight,
  RefreshCw,
  EyeOff,
  Zap,
  Sparkles,
  Loader2,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import {
  SceneData,
  SessionResultData,
  PracticeContextKey,
  UserLevel,
} from '../types';
import {
  DAILY_SPEAKING_PROMPTS,
  PromptCategory,
  DailyPromptItem,
} from '../data/dailyPromptsData';
import { SAMPLE_STUDY_SCENE } from '../data/sampleSceneData';
import { apiFetch } from '../services/apiClient';
import { AmbientMintArc } from '../components/ui/BrandMark';
import { PracticeHeader } from '../components/ui/PracticeHeader';
import { SurfaceCard } from '../components/ui/SurfaceCard';

interface ThinkScreenProps {
  onSelectScene: (scene: SceneData, contextKey?: PracticeContextKey) => void;
  onStartFreeSelfTalk?: () => void;
  onStartDailySprint?: (scene?: SceneData) => void;
  onStartTransferChallenge?: () => void;
  latestResult?: SessionResultData | null;
  streakDays?: number;
  userLevel?: UserLevel;
  apiKeyConnected?: boolean;
  onOpenApiSettings?: () => void;
}

const CATEGORY_TABS: Array<{ id: PromptCategory; label: string }> = [
  { id: 'all', label: 'All (12)' },
  { id: 'work_tech', label: 'Work & Tech' },
  { id: 'campus_study', label: 'Campus' },
  { id: 'daily_life', label: 'Daily Life' },
];

const QUICK_CUSTOM_IDEAS = [
  'Phỏng vấn vị trí Backend Node.js',
  'Đặt món và hỏi thành phần ở nhà hàng',
  'Họp daily standup báo lỗi API',
  'Check-in khách sạn & đổi phòng',
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
  streakDays = 1,
  userLevel = 'B1',
  apiKeyConnected,
  onOpenApiSettings,
}) => {
  const [selectedCategory, setSelectedCategory] =
    useState<PromptCategory>('all');
  const [customSituation, setCustomSituation] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [genError, setGenError] = useState<string | null>(null);

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

  const handleGenerateCustomUseCase = async (overrideText?: string) => {
    const situation = (overrideText ?? customSituation).trim();
    if (!situation || isGenerating) return;
    setCustomSituation(situation);
    setGenError(null);
    setIsGenerating(true);

    try {
      const res = await apiFetch('/api/generate-usecase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          situation,
          userLevel,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setGenError(
          data.message ||
            'Could not generate speaking blueprint. Check your Gemini API key in AI Settings.'
        );
        return;
      }

      const generatedScene: SceneData = {
        title: data.title || situation,
        description: data.description || situation,
        imageUrl: SAMPLE_STUDY_SCENE.imageUrl,
        objects: data.objects || [],
        suggestedExpressions: data.suggestedExpressions || [],
        openingQuestion:
          data.openingQuestion || 'What is your goal in this situation?',
        suggestedFramework: data.suggestedFramework || '5W1H',
        isSample: false,
        initialSuggestedThought: data.initialSuggestedThought,
        userGoal: situation,
        practiceBlueprint: data.practiceBlueprint,
      };

      onSelectScene(generatedScene, 'STUDY_WORKSPACE');
    } catch {
      setGenError(
        'Network error while connecting to backend. Make sure the Node.js server is running.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="relative w-full flex-1 bg-[#FAF9F6] text-[#0F1F18] px-4 sm:px-5 pt-3 pb-24 flex flex-col gap-3 select-none safe-top overflow-x-clip">
      <AmbientMintArc />

      <div className="relative z-10 flex flex-col gap-3">
        <PracticeHeader
          rightMode={onOpenApiSettings ? 'api-status' : 'streak'}
          streakDays={streakDays}
          apiKeyConnected={apiKeyConnected}
          onOpenApiSettings={onOpenApiSettings}
        />

        <div>
          <h1 className="text-[26px] sm:text-[28px] font-extrabold tracking-[-0.028em] text-[#0D1F17] leading-tight">
            Practice <span className="text-[#148343]">Any Use-Case</span>.
          </h1>
          <p className="text-[13.5px] text-[#58645D] mt-0.5 leading-snug">
            Create any custom situation with AI or pick a quick daily scenario when your camera is off.
          </p>
        </div>

        {/* Custom AI Use-Case Generator Card (Any Topic in Vietnamese or English) */}
        <SurfaceCard
          tone="mint"
          radius="xl"
          padding="md"
          className="flex flex-col gap-2.5"
        >
          <div className="flex items-center gap-2 text-[#148343]">
            <div className="w-7 h-7 rounded-[10px] bg-white flex items-center justify-center apple-shadow-xs shrink-0">
              <Sparkles className="w-3.5 h-3.5 stroke-[2.3]" />
            </div>
            <div>
              <span className="text-[12.5px] font-extrabold text-[#0F1F18] block leading-tight">
                Custom AI Situation Builder
              </span>
              <span className="text-[11px] text-[#4C5C53]">
                Nhập bất kỳ tình huống thực tế nào (tiếng Việt hoặc Anh) → AI tạo trọn bộ 5 bước
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={customSituation}
              onChange={(e) => setCustomSituation(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  void handleGenerateCustomUseCase();
                }
              }}
              placeholder="VD: Phỏng vấn Node.js, gọi đồ uống ở quán cà phê..."
              disabled={isGenerating}
              className="flex-1 min-w-0 h-10 rounded-full bg-white px-4 text-[13px] font-semibold text-[#101E17] placeholder:text-[#86928B] apple-shadow-xs focus:outline-none focus:ring-2 focus:ring-[#148343]/25"
            />
            <button
              type="button"
              onClick={() => void handleGenerateCustomUseCase()}
              disabled={isGenerating || !customSituation.trim()}
              className="h-10 px-4 rounded-full bg-[#148343] hover:bg-[#106D37] text-white text-[12.5px] font-bold inline-flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap disabled:opacity-55"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <span>Start</span>
                  <ArrowRight className="w-3.5 h-3.5 stroke-[2.3]" />
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {QUICK_CUSTOM_IDEAS.map((idea) => (
              <button
                key={idea}
                type="button"
                disabled={isGenerating}
                onClick={() => void handleGenerateCustomUseCase(idea)}
                className="px-2.5 py-1 rounded-full bg-white/85 hover:bg-white text-[#1B2B23] text-[11px] font-semibold transition-colors cursor-pointer apple-shadow-xs"
              >
                {idea}
              </button>
            ))}
          </div>

          {genError && (
            <div className="rounded-[12px] bg-white/95 px-3 py-2 flex items-start justify-between gap-2 text-[11.5px] font-semibold text-rose-800">
              <div className="flex items-start gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                <span>{genError}</span>
              </div>
              {onOpenApiSettings && (
                <button
                  type="button"
                  onClick={onOpenApiSettings}
                  className="px-2.5 py-0.5 rounded-full bg-[#EAF6EE] text-[#148343] font-bold shrink-0 cursor-pointer"
                >
                  Set Key
                </button>
              )}
            </div>
          )}
        </SurfaceCard>

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
              tone="sage"
              radius="lg"
              padding="sm"
              interactive
              onClick={onStartTransferChallenge}
              className="px-3.5 py-3 flex flex-col justify-between gap-2"
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

        {/* No-Camera Curated Daily Prompts Library (12 Scenarios) */}
        <div className="flex flex-col gap-2.5 pt-0.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h2 className="text-[16.5px] font-extrabold tracking-[-0.02em] text-[#0D1F17] leading-tight">
                Ready-made daily scenarios
              </h2>
              <p className="text-[11.5px] text-[#5C6861] mt-0.5">
                Or pick a curated moment and speak with live AI coaching.
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
