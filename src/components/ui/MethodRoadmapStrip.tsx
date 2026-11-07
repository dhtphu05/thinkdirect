import React from 'react';
import { ArrowRight, Check } from 'lucide-react';

export type ActiveMethodId =
  | 'LABEL'
  | 'EXPANSION'
  | 'FRAMEWORK'
  | 'SELF_TALK'
  | 'RECALL';

interface MethodRoadmapStripProps {
  activeMethod: ActiveMethodId;
  frameworkLabel?: '5W1H' | 'P.R.E';
  onOpenGuide?: () => void;
}

const METHOD_STEPS: Array<{
  id: ActiveMethodId;
  shortLabel: string;
}> = [
  { id: 'LABEL', shortLabel: 'Label' },
  { id: 'EXPANSION', shortLabel: 'Expand' },
  { id: 'FRAMEWORK', shortLabel: '5W1H' },
  { id: 'SELF_TALK', shortLabel: 'Self-Talk' },
  { id: 'RECALL', shortLabel: 'Recall' },
];

export const MethodRoadmapStrip: React.FC<MethodRoadmapStripProps> = ({
  activeMethod,
  frameworkLabel = '5W1H',
  onOpenGuide,
}) => {
  const activeIdx = METHOD_STEPS.findIndex((m) => m.id === activeMethod);

  return (
    <div className="w-full rounded-[14px] bg-[#F2F5F2] px-1.5 sm:px-2.5 py-1.5 flex items-center justify-between">
      <div className="flex items-center justify-between flex-1 min-w-0 gap-0.5">
        {METHOD_STEPS.map((step, idx) => {
          const isCurrent = idx === activeIdx;
          const isDone = idx < activeIdx;
          const displayLabel =
            step.id === 'FRAMEWORK' ? frameworkLabel : step.shortLabel;

          return (
            <React.Fragment key={step.id}>
              <button
                type="button"
                onClick={onOpenGuide}
                disabled={!onOpenGuide}
                className={`px-1.5 sm:px-2 py-1 rounded-full text-[9.5px] sm:text-[10.5px] leading-none inline-flex items-center gap-0.5 transition-all whitespace-nowrap shrink-0 ${
                  onOpenGuide ? 'cursor-pointer' : 'cursor-default'
                } ${
                  isCurrent
                    ? 'bg-[#148343] text-white font-extrabold shadow-[0_2px_6px_rgba(20,131,67,0.22)]'
                    : isDone
                      ? 'bg-[#DFF2E6] text-[#12743B] font-bold'
                      : 'text-[#6A7670] font-semibold'
                }`}
              >
                {isDone && (
                  <Check className="w-2.5 h-2.5 stroke-[3] shrink-0" />
                )}
                <span>{displayLabel}</span>
              </button>
              {idx < METHOD_STEPS.length - 1 && (
                <ArrowRight className="w-2 h-2 text-[#9BA6A0] stroke-[2.3] shrink-0" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
