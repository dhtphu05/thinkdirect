import React from 'react';
import { Check, Sparkles, ArrowRight } from 'lucide-react';
import { ThoughtChainNode } from '../../types';

interface ThoughtChainStripProps {
  nodes: ThoughtChainNode[];
  missingPrompt?: string;
  showMissingPrompt?: boolean;
  compact?: boolean;
}

export const ThoughtChainStrip: React.FC<ThoughtChainStripProps> = ({
  nodes,
  missingPrompt,
  showMissingPrompt = false,
  compact = false,
}) => {
  const completedCount = nodes.filter((n) => n.isComplete).length;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-wider text-[#148343]">
          <Sparkles className="w-3 h-3 stroke-[2.3]" />
          Thought chain
        </span>
        <span className="text-[10.5px] font-bold text-[#4D5B53] tabular-nums">
          {completedCount}/{nodes.length} links connected
        </span>
      </div>

      <div className="flex items-center gap-1 flex-wrap">
        {nodes.map((node, index) => (
          <React.Fragment key={node.id}>
            <span
              className={`inline-flex items-center gap-1 rounded-full font-bold transition-all ${
                compact
                  ? 'px-2 py-0.5 text-[10px]'
                  : 'px-2.5 py-1 text-[11px]'
              } ${
                node.isComplete
                  ? 'bg-[#148343] text-white shadow-[0_2px_8px_rgba(20,131,67,0.18)]'
                  : 'bg-[#EFF1EE] text-[#66736B]'
              }`}
            >
              {node.isComplete && (
                <Check className="w-2.5 h-2.5 stroke-[3] shrink-0" />
              )}
              <span>{node.label}</span>
            </span>
            {index < nodes.length - 1 && (
              <ArrowRight className="w-2.5 h-2.5 text-[#9AA59E] shrink-0" />
            )}
          </React.Fragment>
        ))}
      </div>

      {showMissingPrompt && missingPrompt && completedCount > 0 && completedCount < nodes.length && (
        <p className="text-[11.5px] font-semibold text-[#148343] bg-[#EAF6EE] rounded-[10px] px-2.5 py-1.5 leading-snug">
          Next link: {missingPrompt}
        </p>
      )}
    </div>
  );
};
