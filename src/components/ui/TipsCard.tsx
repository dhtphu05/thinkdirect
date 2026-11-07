import React, { useState } from 'react';
import { Lightbulb, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SurfaceCard } from './SurfaceCard';

interface SplitTipsProps {
  variant: 'split';
  label?: string;
  text: string;
  onClick?: () => void;
}

interface CollapsibleTipsProps {
  variant: 'collapsible';
  title: string;
  summary: string;
  details?: string[];
  defaultExpanded?: boolean;
}

interface TakeawaysTipsProps {
  variant: 'takeaways';
  title?: string;
  items: string[];
}

export type TipsCardProps =
  | SplitTipsProps
  | CollapsibleTipsProps
  | TakeawaysTipsProps;

/**
 * Reusable borderless coaching tip / takeaway card.
 */
export const TipsCard: React.FC<TipsCardProps> = (props) => {
  const [expanded, setExpanded] = useState<boolean>(
    props.variant === 'collapsible' ? Boolean(props.defaultExpanded) : false
  );

  if (props.variant === 'split') {
    return (
      <SurfaceCard
        tone="muted"
        radius="lg"
        padding="sm"
        interactive={Boolean(props.onClick)}
        onClick={props.onClick}
        className="flex items-center gap-3"
      >
        <div className="w-10 h-10 rounded-[13px] bg-[#E3F3E8] text-[#148043] flex items-center justify-center shrink-0">
          <Lightbulb className="w-5 h-5 stroke-[2]" />
        </div>
        <span className="text-[14.5px] font-bold text-[#14201A] shrink-0">
          {props.label || 'Tips'}
        </span>
        <span className="w-[1px] h-7 bg-black/[0.07] shrink-0" aria-hidden="true" />
        <p className="text-[12.5px] sm:text-[13px] leading-[1.4] text-[#4E5A53] font-medium">
          {props.text}
        </p>
      </SurfaceCard>
    );
  }

  if (props.variant === 'collapsible') {
    return (
      <SurfaceCard
        tone="muted"
        radius="lg"
        padding="md"
        interactive
        onClick={() => setExpanded((prev) => !prev)}
        className="flex flex-col"
      >
        <div className="flex items-center gap-3.5">
          <div className="flex items-center justify-center shrink-0 text-[#148343]">
            <Lightbulb className="w-5 h-5 stroke-[2.1]" />
          </div>
          <span className="w-[1px] h-7 bg-black/[0.07] shrink-0" aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[14.5px] font-bold text-[#14201A]">
                {props.title}
              </span>
              <ChevronDown
                className={`w-4 h-4 text-[#55625B] shrink-0 transition-transform duration-300 ${
                  expanded ? 'rotate-180' : ''
                }`}
              />
            </div>
            <p className="text-[12.5px] sm:text-[13px] text-[#56635C] leading-[1.4] mt-0.5">
              {props.summary}
            </p>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {expanded && props.details && props.details.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.24, ease: [0.32, 0.72, 0, 1] }}
              className="overflow-hidden"
            >
              <ul className="pt-3 mt-2.5 space-y-1.5 pl-1">
                {props.details.map((detail, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-[12.5px] text-[#49564F] leading-relaxed"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#148343] mt-1.5 shrink-0" />
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </SurfaceCard>
    );
  }

  return (
    <SurfaceCard tone="sage" radius="lg" padding="md" className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2">
        <Lightbulb className="w-[19px] h-[19px] text-[#148343] stroke-[2.2] shrink-0" />
        <span className="text-[15px] font-bold text-[#14201A]">
          {props.title || 'Key takeaways'}
        </span>
      </div>
      <ul className="space-y-1.5 pl-1">
        {props.items.map((item, idx) => (
          <li
            key={idx}
            className="flex items-start gap-2.5 text-[13.5px] text-[#46534C] leading-[1.45]"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#148343] mt-[7px] shrink-0" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </SurfaceCard>
  );
};
