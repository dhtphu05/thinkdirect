import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Tag,
  Maximize2,
  Layers,
  MessageSquare,
  EyeOff,
} from 'lucide-react';
import { SurfaceCard } from './SurfaceCard';

interface MethodGuideSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

const METHODS = [
  {
    num: '01',
    name: 'Direct Labeling',
    vnTag: 'Gắn nhãn trực tiếp · Cắt dịch ngầm',
    icon: Tag,
    formula: 'See object → Say English chunk aloud',
    example: 'Tap laptop → “build a login page”',
  },
  {
    num: '02',
    name: 'Sentence Expansion',
    vnTag: 'Mở rộng câu bậc thang',
    icon: Maximize2,
    formula: 'Short seed → Base + Chunk 1 → Base + Chunk 1 + Chunk 2',
    example:
      '“I’m coding.” → “I’m building a login page.” → “...for my university project.”',
  },
  {
    num: '03',
    name: '5W1H & P.R.E Framework',
    vnTag: 'Phát triển ý theo khung chuẩn',
    icon: Layers,
    formula: '[What] + [Why] + [How]  or  [Idea] + [Reason] + [Example]',
    example: '+ Why: “Students need to sign in securely.” + How: “Using React & API.”',
  },
  {
    num: '04',
    name: 'Guided Self-Talk',
    vnTag: 'Tự độc thoại phản xạ 1 mình',
    icon: MessageSquare,
    formula: '① Notice issue → ② Maybe why → ③ First move',
    example: '“Auth isn’t working → Maybe token expired → Check API first.”',
  },
  {
    num: '05',
    name: 'Active Recall (No Prompts)',
    vnTag: 'Rút giàn giáo · Tự nói từ trí nhớ',
    icon: EyeOff,
    formula: 'Hide photo & sample sentences → Speak full 35–45w story',
    example: 'Fluent, connected 30–60s speech in your own words.',
  },
];

export const MethodGuideSheet: React.FC<MethodGuideSheetProps> = ({
  isOpen,
  onClose,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 backdrop-blur-xs select-none">
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
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="relative w-full max-w-[430px] bg-[#FAF9F6] rounded-t-[30px] px-5 pt-3.5 pb-6 safe-bottom z-10 flex flex-col gap-2.5 apple-shadow-md max-h-[86dvh] overflow-y-auto"
          >
            <div className="w-10 h-1 rounded-full bg-black/15 mx-auto" />

            <div className="flex items-center justify-between gap-2">
              <div>
                <span className="text-[10.5px] font-extrabold uppercase tracking-[0.06em] text-[#148343] block">
                  Speaking Methodology
                </span>
                <h3 className="text-[18px] font-extrabold text-[#0F1E17] leading-tight">
                  5 Connected Speaking Methods
                </h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close methods guide"
                className="w-8 h-8 rounded-full bg-[#EFEFEF] flex items-center justify-center text-[#55625B] cursor-pointer shrink-0"
              >
                <X className="w-4 h-4 stroke-[2.2]" />
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {METHODS.map((m) => {
                const Icon = m.icon;
                return (
                  <SurfaceCard
                    key={m.num}
                    tone="elevated"
                    radius="lg"
                    padding="sm"
                    className="px-3.5 py-2.5 flex items-start gap-2.5"
                  >
                    <div className="w-8 h-8 rounded-[10px] bg-[#EAF6EE] text-[#148343] flex items-center justify-center shrink-0 mt-0.5">
                      <Icon className="w-4 h-4 stroke-[2.2]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[13px] font-extrabold text-[#101E17]">
                          {m.num}. {m.name}
                        </span>
                        <span className="text-[10px] font-bold bg-[#EAF6EE] text-[#148343] px-2 py-0.5 rounded-full">
                          {m.vnTag}
                        </span>
                      </div>
                      <p className="text-[11.5px] font-bold text-[#148343] mt-0.5 leading-snug">
                        {m.formula}
                      </p>
                      <p className="text-[11.5px] text-[#55625B] mt-0.5 leading-snug">
                        {m.example}
                      </p>
                    </div>
                  </SurfaceCard>
                );
              })}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
