import React, { useState, useEffect } from 'react';
import { Volume2, X, Sparkles, Eye, EyeOff, Check, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { DetectedObject, ContextualExpression } from '../types';
import { playPronunciation } from '../utils/audioUtils';
import { SurfaceCard } from './ui/SurfaceCard';
import { PillButton } from './ui/PillButton';

interface WordDetailSheetProps {
  item: DetectedObject | ContextualExpression | null;
  onClose: () => void;
  onUseAsStarter?: (sentence: string) => void;
  onMarkSpoken?: (labelKey: string) => void;
}

function deriveShortStarter(
  item: DetectedObject | ContextualExpression,
  isObject: boolean
): string {
  const raw = isObject
    ? (item as DetectedObject).contextualSentence
    : (item as ContextualExpression).example;
  const firstClause = raw
    .split(
      /—|;|\s+(?:because|so that|so I|while|before|for my|on my|in my|to stay|in case|to access|without)\s+/i
    )[0]
    .trim()
    .replace(/^(?:maybe|for example,?)\s+/i, '')
    .replace(/[,]+$/, '');
  const words = firstClause.split(/\s+/).filter(Boolean);
  if (words.length >= 2 && words.length <= 6) {
    const capitalized =
      firstClause.charAt(0).toUpperCase() + firstClause.slice(1);
    return /[.!?]$/.test(capitalized) ? capitalized : `${capitalized}.`;
  }

  if (isObject) {
    const chunk = (item as DetectedObject).actionChunk?.trim();
    if (
      chunk &&
      /^(build|check|review|write|sketch|type|drink|sip|sit|start|block|use)\b/i.test(
        chunk
      )
    ) {
      return `I want to ${chunk.toLowerCase()}.`;
    }
    return `I'm using my ${(item as DetectedObject).name.toLowerCase()}.`;
  }

  const phrase = (item as ContextualExpression).phrase.trim().toLowerCase();
  if (
    /^(build|sign|check|review|leave|silence|wrap|sync|send|ask|focus|plan|prepare)\b/.test(
      phrase
    )
  ) {
    return `I'll ${phrase}.`;
  }
  const shortOpening = words.slice(0, 5).join(' ');
  const cap = shortOpening.charAt(0).toUpperCase() + shortOpening.slice(1);
  return /[.!?]$/.test(cap) ? cap : `${cap}.`;
}

export const WordDetailSheet: React.FC<WordDetailSheetProps> = ({
  item,
  onClose,
  onUseAsStarter,
  onMarkSpoken,
}) => {
  const [showVietnamese, setShowVietnamese] = useState<boolean>(false);

  useEffect(() => {
    setShowVietnamese(false);
  }, [item]);

  if (!item) return null;

  const isObject = 'phonetic' in item || 'category' in item || 'actionChunk' in item;
  const title = isObject
    ? (item as DetectedObject).name
    : (item as ContextualExpression).phrase;
  const definition = isObject
    ? (item as DetectedObject).definition
    : (item as ContextualExpression).meaning;
  const example = isObject
    ? (item as DetectedObject).contextualSentence
    : (item as ContextualExpression).example;
  const phonetic = isObject ? (item as DetectedObject).phonetic : null;
  const actionChunk = isObject ? (item as DetectedObject).actionChunk : null;
  const shortStarter = deriveShortStarter(item, isObject);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:p-4 bg-black/35 backdrop-blur-xs">
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
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="relative w-full max-w-[430px] max-h-[88dvh] overflow-y-auto bg-[#FAF9F6] rounded-t-[30px] sm:rounded-[30px] p-5 sm:p-6 apple-shadow-md flex flex-col gap-3 z-10 safe-bottom"
      >
        <div className="w-10 h-1 bg-black/15 rounded-full mx-auto -mt-1 mb-0.5 sm:hidden" />

        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col min-w-0">
            <span className="text-[11px] font-bold tracking-wider uppercase text-[#148343] mb-1">
              {isObject ? 'Direct English Label' : 'Contextual Expression'}
            </span>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-[22px] sm:text-2xl font-extrabold tracking-tight text-[#101E17] capitalize leading-tight">
                {title}
              </h2>
              <motion.button
                whileTap={{ scale: 0.9 }}
                type="button"
                onClick={() => {
                  playPronunciation(title);
                  onMarkSpoken?.(title.toLowerCase());
                }}
                className="h-8 px-2.5 rounded-full bg-[#EAF6EE] text-[#148343] inline-flex items-center gap-1.5 text-[11.5px] font-bold hover:bg-[#DCF0E4] transition-colors cursor-pointer shrink-0 whitespace-nowrap"
                title="Listen & repeat aloud"
              >
                <Volume2 className="w-3.5 h-3.5 shrink-0" />
                <span>Listen & say</span>
              </motion.button>
            </div>
            {phonetic && (
              <span className="text-xs text-[#647069] font-mono mt-0.5">
                {phonetic}
              </span>
            )}
          </div>

          <motion.button
            whileTap={{ scale: 0.9 }}
            type="button"
            onClick={onClose}
            aria-label="Close sheet"
            className="w-8 h-8 rounded-full bg-[#EFEFEF] text-[#55625B] hover:text-[#101E17] flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </motion.button>
        </div>

        {actionChunk && (
          <SurfaceCard
            tone="mint"
            radius="md"
            padding="sm"
            className="flex items-center justify-between gap-2 px-3.5 py-2.5"
          >
            <div className="min-w-0">
              <span className="block text-[10.5px] font-bold uppercase tracking-wider text-[#148343]">
                Action phrase
              </span>
              <span className="block text-[14.5px] font-extrabold text-[#101E17] leading-snug mt-0.5">
                “{actionChunk}”
              </span>
            </div>
            <button
              type="button"
              onClick={() => playPronunciation(actionChunk)}
              className="w-8 h-8 rounded-full bg-white text-[#148343] flex items-center justify-center shrink-0 apple-shadow-xs cursor-pointer"
              aria-label="Listen to action chunk"
            >
              <Volume2 className="w-3.5 h-3.5" />
            </button>
          </SurfaceCard>
        )}

        <SurfaceCard tone="elevated" radius="md" padding="md" className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10.5px] font-bold text-[#148343] uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 shrink-0" />
              <span>In a sentence</span>
            </span>
            <button
              type="button"
              onClick={() => playPronunciation(example)}
              className="text-xs text-[#148343] hover:opacity-80 flex items-center gap-1 font-semibold cursor-pointer shrink-0 whitespace-nowrap"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Listen</span>
            </button>
          </div>
          <p className="text-[14px] font-semibold text-[#101E17] leading-snug">
            “{example}”
          </p>
          <p className="text-[12px] text-[#5C6861] leading-snug">
            {definition}
          </p>
        </SurfaceCard>

        {item.vietnameseMeaning && (
          <button
            type="button"
            onClick={() => setShowVietnamese((v) => !v)}
            className="w-full rounded-[14px] bg-[#F2F4F2] hover:bg-[#EAECE9] px-3.5 py-2 flex items-center justify-between gap-2 text-left transition-colors cursor-pointer"
          >
            {!showVietnamese ? (
              <>
                <span className="text-[12px] font-semibold text-[#55625B] flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-[#148343] shrink-0" />
                  <span>Check Vietnamese meaning</span>
                </span>
                <span className="text-[11px] font-bold text-[#148343] whitespace-nowrap">
                  Show
                </span>
              </>
            ) : (
              <>
                <span className="text-[13px] font-bold text-[#101E17]">
                  {item.vietnameseMeaning}
                </span>
                <span className="text-[11px] font-semibold text-[#55625B] inline-flex items-center gap-1 shrink-0 whitespace-nowrap">
                  <EyeOff className="w-3.5 h-3.5" />
                  <span>Hide</span>
                </span>
              </>
            )}
          </button>
        )}

        {onUseAsStarter ? (
          <div className="flex flex-col gap-2 pt-0.5">
            <PillButton
              variant="primary"
              size="lg"
              fullWidth
              rightIcon={<ArrowRight className="w-4 h-4 stroke-[2.3]" />}
              onClick={() => {
                onMarkSpoken?.(title.toLowerCase());
                onUseAsStarter(shortStarter);
                onClose();
              }}
            >
              Use as my starting sentence
            </PillButton>
            <PillButton
              variant="secondary"
              size="md"
              fullWidth
              leftIcon={<Check className="w-4 h-4 text-[#148343] stroke-[2.4]" />}
              onClick={() => {
                onMarkSpoken?.(title.toLowerCase());
                onClose();
              }}
            >
              Said it aloud · Keep browsing
            </PillButton>
          </div>
        ) : (
          <PillButton
            variant="primary"
            size="lg"
            fullWidth
            leftIcon={<Check className="w-4 h-4 stroke-[2.4]" />}
            onClick={() => {
              onMarkSpoken?.(title.toLowerCase());
              onClose();
            }}
            className="mt-0.5"
          >
            Said it aloud · Got it
          </PillButton>
        )}
      </motion.div>
    </div>
  );
};
