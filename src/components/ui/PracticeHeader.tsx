import React from 'react';
import {
  ChevronLeft,
  Ellipsis,
  Flame,
  KeyRound,
  Sparkles,
  Zap,
} from 'lucide-react';
import { motion } from 'motion/react';
import { BrandLogo } from './BrandMark';

export type SegmentStatus = 'solid' | 'soft' | 'empty';

export interface SubNavConfig {
  onBack: () => void;
  title: string;
  counterText?: string;
}

interface PracticeHeaderProps {
  /** Back action for left circular button; omit on root hub screens */
  onBack?: () => void;
  /** Center content mode: 'brand' shows leaf+ThinkDirect, 'title' shows text */
  centerMode?: 'brand' | 'title';
  /** Title text when centerMode === 'title' (e.g. 'Practice · 4 of 4' or 'Practice Complete') */
  centerTitle?: string;
  /** Right slot mode */
  rightMode?: 'auto-sparkles' | 'auto-zap' | 'more' | 'streak' | 'none';
  autoActive?: boolean;
  onToggleAuto?: () => void;
  onMoreClick?: () => void;
  streakDays?: number;
  apiKeyConnected?: boolean;
  onOpenApiSettings?: () => void;
  /** Optional second-row sub-navigation (e.g. '< | Camera Practice | 1 of 3') */
  subNav?: SubNavConfig;
  /** Optional subtitle row above segments: e.g. Step 1 of 4 | Capture & Discover */
  stepLabel?: string;
  stageSubtitle?: string;
  /** Multi-segment progress bar states (3 or 4 segments) */
  segments?: SegmentStatus[];
  className?: string;
}

/**
 * Unified Apple-like borderless mobile header & segmented progress bar.
 * Uses 100% modern lucide-react icons across all header variants.
 */
export const PracticeHeader: React.FC<PracticeHeaderProps> = ({
  onBack,
  centerMode = 'brand',
  centerTitle,
  rightMode = 'auto-sparkles',
  onMoreClick,
  streakDays = 12,
  apiKeyConnected = true,
  onOpenApiSettings,
  subNav,
  stepLabel,
  stageSubtitle,
  segments,
  className = '',
}) => {
  return (
    <header className={`w-full flex flex-col gap-2.5 select-none z-20 ${className}`}>
      {/* Top Row */}
      <div className="flex items-center justify-between min-h-[42px]">
        {/* Left Slot */}
        {onBack ? (
          <motion.button
            whileTap={{ scale: 0.92 }}
            type="button"
            onClick={onBack}
            aria-label="Go back"
            className="w-10 h-10 rounded-full bg-white apple-shadow-xs flex items-center justify-center text-[#18221D] hover:bg-[#F5F6F4] transition-colors cursor-pointer shrink-0"
          >
            <ChevronLeft className="w-5 h-5 stroke-[2.2] -ml-0.5" />
          </motion.button>
        ) : (
          <BrandLogo size="md" />
        )}

        {/* Center Slot (only when onBack is present) */}
        {onBack && (
          <div className="flex items-center justify-center px-2 text-center">
            {centerMode === 'brand' ? (
              <BrandLogo size="md" />
            ) : (
              <span className="text-[15.5px] font-semibold tracking-[-0.015em] text-[#14201A]">
                {centerTitle}
              </span>
            )}
          </div>
        )}

        {/* Right Slot */}
        <div className="flex items-center justify-end gap-1.5 shrink-0">
          {onOpenApiSettings && rightMode === 'streak' && (
            <button
              type="button"
              onClick={onOpenApiSettings}
              className={`h-9 px-3 rounded-full apple-shadow-xs flex items-center gap-1.5 text-[11.5px] font-bold transition-colors cursor-pointer whitespace-nowrap ${
                apiKeyConnected
                  ? 'bg-[#EAF6EE] text-[#148343] hover:bg-[#DEF0E4]'
                  : 'bg-amber-100 text-amber-900 hover:bg-amber-200/80'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5 stroke-[2.2] shrink-0" />
              <span>{apiKeyConnected ? 'AI Live' : 'Set Key'}</span>
            </button>
          )}

          {(rightMode === 'auto-sparkles' || rightMode === 'auto-zap') && (
            <button
              type="button"
              onClick={onOpenApiSettings}
              className={`h-9 px-3 rounded-full apple-shadow-xs flex items-center gap-1.5 text-[12px] font-bold whitespace-nowrap ${
                onOpenApiSettings ? 'cursor-pointer' : 'cursor-default'
              } ${
                apiKeyConnected
                  ? 'bg-[#EAF6EE] text-[#148343]'
                  : 'bg-amber-100 text-amber-900'
              }`}
            >
              {!apiKeyConnected ? (
                <KeyRound className="w-3.5 h-3.5 stroke-[2.2] shrink-0" />
              ) : rightMode === 'auto-zap' ? (
                <Zap className="w-3.5 h-3.5 text-[#148343] fill-[#148343]/15 stroke-[2.2] shrink-0" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-[#148343] stroke-[2.2] shrink-0" />
              )}
              <span>{apiKeyConnected ? 'AI Live' : 'Set API Key'}</span>
            </button>
          )}

          {rightMode === 'more' && (
            <motion.button
              whileTap={{ scale: 0.92 }}
              type="button"
              onClick={onMoreClick}
              aria-label="More options"
              className="w-10 h-10 rounded-full bg-white apple-shadow-xs flex items-center justify-center text-[#18221D] hover:bg-[#F5F6F4] transition-colors cursor-pointer"
            >
              <Ellipsis className="w-5 h-5 stroke-[2.2]" />
            </motion.button>
          )}

          {rightMode === 'streak' && (
            <div className="h-9 px-3 rounded-full bg-white apple-shadow-xs flex items-center gap-1.5 text-[12.5px] font-bold text-[#18221D] tabular-nums whitespace-nowrap">
              <Flame
                className="w-4 h-4 text-[#F97316] fill-[#FB923C]/90 stroke-[2.1] shrink-0"
                aria-hidden="true"
              />
              <span>{streakDays}d</span>
            </div>
          )}

          {rightMode === 'none' && <div className="w-10 h-10" />}
        </div>
      </div>

      {/* Optional Sub-Navigation Row (e.g. '< | Camera Practice | 1 of 3') */}
      {subNav && (
        <div className="relative flex items-center justify-between min-h-[30px] pt-0.5">
          <motion.button
            whileTap={{ scale: 0.9 }}
            type="button"
            onClick={subNav.onBack}
            aria-label="Back to camera"
            className="w-8 h-8 -ml-1.5 rounded-full flex items-center justify-center text-[#14201A] hover:bg-black/[0.04] transition-colors cursor-pointer z-10"
          >
            <ChevronLeft className="w-[20px] h-[20px] stroke-[2.2]" />
          </motion.button>

          <span className="absolute inset-x-10 text-center text-[14.5px] font-semibold tracking-[-0.015em] text-[#14201A] pointer-events-none">
            {subNav.title}
          </span>

          <div className="min-w-[42px] flex justify-end z-10">
            {subNav.counterText && (
              <span className="text-[13px] font-semibold text-[#18221D] tabular-nums">
                {subNav.counterText}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Optional Step X of 4 | Subtitle + Multi-Segment Progress Bar */}
      {(stepLabel || segments) && (
        <div className="flex flex-col items-center gap-2">
          {stepLabel && (
            <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[12px] sm:text-[12.5px] leading-tight text-center px-1">
              <span className="font-bold text-[#148043] whitespace-nowrap">{stepLabel}</span>
              {stageSubtitle && (
                <>
                  <span className="w-[1px] h-3 bg-black/12 shrink-0" aria-hidden="true" />
                  <span className="font-medium text-[#5A665F]">{stageSubtitle}</span>
                </>
              )}
            </div>
          )}

          {segments && segments.length > 0 && (
            <div
              className={`flex items-center justify-center w-full mx-auto ${
                segments.length === 3
                  ? 'gap-1.5 max-w-[232px]'
                  : 'gap-2 max-w-[244px]'
              }`}
            >
              {segments.map((status, idx) => (
                <div
                  key={idx}
                  className={`h-[5px] flex-1 rounded-full transition-colors duration-300 ${
                    status === 'solid'
                      ? 'bg-[#148343]'
                      : status === 'soft'
                      ? 'bg-[#A6D8B8]'
                      : 'bg-[#E4E7E4]'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </header>
  );
};
