import React from 'react';
import { Volume2, Sparkles } from 'lucide-react';

interface YourStoryBannerProps {
  imageUrl?: string;
  sceneTitle: string;
  storySentences: string[];
  highlightLatest?: boolean;
  onListen: (fullText: string) => void;
}

export const YourStoryBanner: React.FC<YourStoryBannerProps> = ({
  imageUrl,
  sceneTitle,
  storySentences,
  highlightLatest = true,
  onListen,
}) => {
  const cleanSentences = storySentences
    .map((s) => s.trim())
    .filter(Boolean);

  const fullStory = cleanSentences.join(' ');
  const wordCount = fullStory.split(/\s+/).filter(Boolean).length;

  return (
    <div className="w-full rounded-[18px] bg-white px-3 py-2.5 apple-shadow-xs flex items-center gap-3">
      {imageUrl && (
        <div className="w-12 h-12 rounded-[13px] overflow-hidden bg-[#1D2621] shrink-0 relative">
          <img
            src={imageUrl}
            alt={sceneTitle}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span className="text-[10.5px] font-extrabold uppercase tracking-[0.04em] text-[#148343] inline-flex items-center gap-1">
            <Sparkles className="w-3 h-3 stroke-[2.3] shrink-0" />
            <span>Your English so far · {wordCount} words</span>
          </span>

          <button
            type="button"
            onClick={() => onListen(fullStory)}
            className="h-6 px-2 rounded-full bg-[#EAF6EE] hover:bg-[#DCF0E3] text-[#148343] text-[10.5px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer shrink-0"
            aria-label="Listen to your growing English thought"
          >
            <Volume2 className="w-3 h-3 stroke-[2.2]" />
            <span>Listen</span>
          </button>
        </div>

        <p className="text-[13px] text-[#2B3831] leading-snug">
          “
          {cleanSentences.map((sentence, idx) => {
            const isLast = idx === cleanSentences.length - 1;
            return (
              <span
                key={`${idx}_${sentence.slice(0, 12)}`}
                className={
                  highlightLatest && isLast && cleanSentences.length > 1
                    ? 'font-bold text-[#0F6A36]'
                    : 'font-semibold text-[#18241E]'
                }
              >
                {idx > 0 ? ' ' : ''}
                {sentence}
              </span>
            );
          })}
          ”
        </p>
      </div>
    </div>
  );
};
