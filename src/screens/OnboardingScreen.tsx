import React, { useState } from 'react';
import {
  Maximize2,
  Brain,
  EyeOff,
  ChevronRight,
  ArrowRight,
  Sparkles,
  Check,
} from 'lucide-react';
import { UserLevel, UserPreferences } from '../types';
import { SAMPLE_STUDY_SCENE } from '../data/sampleSceneData';
import { RadiantRays } from '../components/RadiantRays';
import { BrandLogo, AmbientMintArc } from '../components/ui/BrandMark';
import { SurfaceCard } from '../components/ui/SurfaceCard';
import { PillButton } from '../components/ui/PillButton';

interface OnboardingScreenProps {
  initialLevel?: UserLevel;
  onComplete: (prefs: UserPreferences) => void;
  onStartDemo?: (selectedLevel?: UserLevel) => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({
  initialLevel = 'A2',
  onComplete,
  onStartDemo,
}) => {
  const [selectedLevel, setSelectedLevel] = useState<'A2' | 'B1'>(
    initialLevel === 'B1' ? 'B1' : 'A2'
  );

  const buildPreferences = (level: 'A2' | 'B1'): UserPreferences => ({
    level,
    hardestPart: "I know what I mean, but I can't say it quickly.",
    hasCompletedOnboarding: true,
  });

  const handleStartNow = () => {
    onComplete(buildPreferences(selectedLevel));
  };

  const handleLaunchGuidedDemo = () => {
    if (onStartDemo) {
      onStartDemo(selectedLevel);
    } else {
      handleStartNow();
    }
  };

  const methods = [
    {
      id: 'label',
      title: '1. Direct Labeling (Cắt dịch ngầm)',
      description: 'See object → Say English chunk aloud (“build a login page”).',
      icon: Sparkles,
    },
    {
      id: 'expansion',
      title: '2. Sentence Expansion (Bậc thang)',
      description: '“I’m coding.” → “+ building a login page” → “+ for my project.”',
      icon: Maximize2,
    },
    {
      id: 'development',
      title: '3. 5W1H / P.R.E + Guided Self-Talk',
      description: 'Add [Why + How] & solo monologue (Notice → Maybe → Decide).',
      icon: Brain,
    },
    {
      id: 'independent',
      title: '4. Active Recall (Rút giàn giáo)',
      description: 'Hide photo & prompts — speak the full story from memory.',
      icon: EyeOff,
    },
  ];

  return (
    <div className="relative w-full min-h-[100dvh] bg-[#FAF9F6] text-[#0F1F18] px-4 sm:px-5 pt-3 pb-4 flex flex-col justify-between gap-3 safe-top safe-bottom select-none overflow-x-clip">
      <AmbientMintArc />

      <div className="relative z-10 flex flex-col gap-2.5">
        {/* Top Brand Bar + Instant Quick Start Shortcut */}
        <div className="flex items-center justify-between min-h-[40px]">
          <BrandLogo size="md" />
          {onStartDemo && (
            <button
              type="button"
              onClick={handleLaunchGuidedDemo}
              className="h-8 px-3 rounded-full bg-[#EAF6EE] hover:bg-[#DEF0E4] text-[#148343] text-[12px] font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5 stroke-[2.2] shrink-0" />
              <span>Quick start</span>
            </button>
          )}
        </div>

        {/* Main Hero Header */}
        <div className="mt-0.5">
          <h1 className="text-[27px] sm:text-[30px] font-extrabold text-[#0D1F17] tracking-[-0.028em] leading-[1.14]">
            <span className="inline-flex items-start">
              <span>Turn what you see</span>
              <RadiantRays className="w-6 h-6 -mt-2.5 ml-0.5" />
            </span>
            <span className="block">
              into <span className="text-[#0E6D3B]">connected English.</span>
            </span>
          </h1>
          <p className="text-[13.5px] text-[#55625B] leading-[1.42] mt-1">
            5 connected speaking methods that grow a 2-word label into fluent 30-second speech.
          </p>
        </div>

        {/* Hero Workspace Image Card with Focus Corner Guides & Object Pills */}
        <div className="relative w-full aspect-[16/9.4] rounded-[24px] overflow-hidden bg-[#1D2621] apple-shadow-md">
          <img
            src={SAMPLE_STUDY_SCENE.imageUrl}
            alt="Study Workspace"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/[0.06] pointer-events-none" />

          {/* Borderless Pure-CSS Optical Focus Corners around Laptop */}
          <div
            className="absolute top-[25%] left-[33%] w-[29%] h-[44%] pointer-events-none"
            aria-hidden="true"
          >
            <span className="absolute top-0 left-0 w-3.5 h-[2.5px] bg-white/90 rounded-full" />
            <span className="absolute top-0 left-0 w-[2.5px] h-3.5 bg-white/90 rounded-full" />
            <span className="absolute top-0 right-0 w-3.5 h-[2.5px] bg-white/90 rounded-full" />
            <span className="absolute top-0 right-0 w-[2.5px] h-3.5 bg-white/90 rounded-full" />
            <span className="absolute bottom-0 left-0 w-3.5 h-[2.5px] bg-white/90 rounded-full" />
            <span className="absolute bottom-0 left-0 w-[2.5px] h-3.5 bg-white/90 rounded-full" />
            <span className="absolute bottom-0 right-0 w-3.5 h-[2.5px] bg-white/90 rounded-full" />
            <span className="absolute bottom-0 right-0 w-[2.5px] h-3.5 bg-white/90 rounded-full" />
          </div>

          {[
            { label: 'laptop', pos: 'top-[11%] left-[50%]' },
            { label: 'coffee cup', pos: 'top-[45%] left-[6%]' },
            { label: 'headphones', pos: 'top-[33%] right-[4%]' },
            { label: 'notebook', pos: 'bottom-[9%] left-[53%]' },
          ].map((pin) => (
            <div key={pin.label} className={`absolute ${pin.pos}`}>
              <div className="bg-white/96 backdrop-blur-md text-[#101E17] text-[11.5px] font-semibold px-3 py-1 rounded-full shadow-[0_4px_14px_rgba(0,0,0,0.12)] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#148343]" />
                <span>{pin.label}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Explicit Speaking Methodology Pipeline */}
        <div className="flex flex-col gap-1.5">
          <p className="text-[12px] font-extrabold uppercase tracking-[0.04em] text-[#148343] px-0.5">
            Proven Speaking Methods Inside Every Session
          </p>

          <div className="flex flex-col gap-1.5">
            {methods.map((method) => {
              const Icon = method.icon;
              return (
                <SurfaceCard
                  key={method.id}
                  tone="elevated"
                  radius="lg"
                  padding="none"
                  interactive
                  onClick={handleLaunchGuidedDemo}
                  className="flex items-center justify-between gap-3 px-3.5 py-2"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-[#EAF6EE] text-[#148343] flex items-center justify-center shrink-0">
                      <Icon className="w-[17px] h-[17px] stroke-[2]" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[13px] font-bold text-[#101E17] leading-snug">
                        {method.title}
                      </span>
                      <span className="text-[11.5px] text-[#5C6861] leading-[1.35]">
                        {method.description}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#69756E] shrink-0" />
                </SurfaceCard>
              );
            })}
          </div>
        </div>
      </div>

      {/* Beginner Accessibility: A2 vs B1 Level Selector + Primary Get Started CTA */}
      <div className="relative z-10 mt-2 flex flex-col gap-2.5">
        <div className="bg-[#EFF2EF] p-1 rounded-[18px] grid grid-cols-2 gap-1">
          <button
            type="button"
            onClick={() => setSelectedLevel('A2')}
            className={`py-2 px-2.5 rounded-[14px] text-left flex items-center justify-between gap-1.5 transition-all cursor-pointer ${
              selectedLevel === 'A2'
                ? 'bg-white text-[#101E17] apple-shadow-xs'
                : 'text-[#5A675F] hover:text-[#101E17]'
            }`}
          >
            <div className="min-w-0">
              <span className="block text-[12px] font-extrabold text-[#148343] leading-tight">
                A2 · Beginner
              </span>
              <span className="block text-[10.5px] font-medium text-[#58645D] leading-tight mt-0.5">
                Có gợi ý tiếng Việt ngắn
              </span>
            </div>
            {selectedLevel === 'A2' && (
              <span className="w-4 h-4 rounded-full bg-[#148343] text-white flex items-center justify-center shrink-0">
                <Check className="w-2.5 h-2.5 stroke-[3]" />
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setSelectedLevel('B1')}
            className={`py-2 px-2.5 rounded-[14px] text-left flex items-center justify-between gap-1.5 transition-all cursor-pointer ${
              selectedLevel === 'B1'
                ? 'bg-white text-[#101E17] apple-shadow-xs'
                : 'text-[#5A675F] hover:text-[#101E17]'
            }`}
          >
            <div className="min-w-0">
              <span className="block text-[12px] font-extrabold text-[#101E17] leading-tight">
                B1 · Intermediate
              </span>
              <span className="block text-[10.5px] font-medium text-[#58645D] leading-tight mt-0.5">
                100% English prompts
              </span>
            </div>
            {selectedLevel === 'B1' && (
              <span className="w-4 h-4 rounded-full bg-[#148343] text-white flex items-center justify-center shrink-0">
                <Check className="w-2.5 h-2.5 stroke-[3]" />
              </span>
            )}
          </button>
        </div>

        <PillButton
          variant="primary"
          size="lg"
          fullWidth
          onClick={handleStartNow}
          rightIcon={<ArrowRight className="w-[18px] h-[18px] stroke-[2.3]" />}
        >
          Get started
        </PillButton>
      </div>
    </div>
  );
};
