import React from 'react';
import { Leaf } from 'lucide-react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * ThinkDirect signature squircle + modern Lucide Leaf icon + wordmark lockup.
 */
export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  className = '',
}) => {
  const iconBoxSize =
    size === 'sm'
      ? 'w-7 h-7 rounded-[9px]'
      : size === 'lg'
      ? 'w-9 h-9 rounded-[12px]'
      : 'w-8 h-8 rounded-[10px]';

  const iconSize =
    size === 'sm'
      ? 'w-4 h-4'
      : size === 'lg'
      ? 'w-5 h-5'
      : 'w-[17.5px] h-[17.5px]';

  const textSize =
    size === 'sm'
      ? 'text-[16px]'
      : size === 'lg'
      ? 'text-[19px]'
      : 'text-[17.5px]';

  return (
    <div className={`inline-flex items-center gap-2 select-none ${className}`}>
      <div
        className={`${iconBoxSize} bg-gradient-to-br from-[#45BC6C] via-[#1E944B] to-[#116B36] flex items-center justify-center text-white shadow-[0_3px_10px_rgba(20,128,67,0.25),inset_0_1px_1px_rgba(255,255,255,0.35)] shrink-0`}
      >
        <Leaf
          className={`${iconSize} text-white fill-white/25 stroke-[2.2]`}
          aria-hidden="true"
        />
      </div>
      <span
        className={`font-extrabold tracking-[-0.025em] text-[#101E17] ${textSize}`}
      >
        ThinkDirect
      </span>
    </div>
  );
};

/**
 * Subtle organic mint ambient glow arc in the top-right background of hero screens.
 * Built with pure CSS borderless layers.
 */
export const AmbientMintArc: React.FC<{ className?: string }> = ({
  className = '',
}) => (
  <div
    aria-hidden="true"
    className={`pointer-events-none select-none absolute -right-20 top-[82px] w-[240px] h-[240px] rounded-full opacity-80 ${className}`}
    style={{
      background:
        'radial-gradient(circle at 52% 52%, transparent 54%, rgba(212, 240, 222, 0.72) 56%, rgba(226, 246, 233, 0.45) 68%, transparent 72%)',
      WebkitMaskImage: 'linear-gradient(to bottom, black 28%, transparent 58%)',
      maskImage: 'linear-gradient(to bottom, black 28%, transparent 58%)',
    }}
  />
);
