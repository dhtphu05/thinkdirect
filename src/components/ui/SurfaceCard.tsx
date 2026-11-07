import React from 'react';
import { motion, HTMLMotionProps } from 'motion/react';

export type SurfaceTone =
  | 'elevated'
  | 'mint'
  | 'sage'
  | 'muted'
  | 'selected';

interface SurfaceCardProps extends HTMLMotionProps<'div'> {
  tone?: SurfaceTone;
  radius?: 'md' | 'lg' | 'xl';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  interactive?: boolean;
  children: React.ReactNode;
}

const TONE_CLASSES: Record<SurfaceTone, string> = {
  elevated: 'bg-white apple-shadow-sm',
  mint: 'bg-[#ECF6F0]',
  sage: 'bg-[#F0F4F1]',
  muted: 'bg-[#F3F4F2]',
  selected:
    'bg-[#E5F5EB] shadow-[0_8px_22px_rgba(20,128,67,0.13)]',
};

const RADIUS_CLASSES = {
  md: 'rounded-[18px]',
  lg: 'rounded-[22px]',
  xl: 'rounded-[26px]',
};

const PADDING_CLASSES = {
  none: '',
  sm: 'p-3.5',
  md: 'p-4',
  lg: 'p-5',
};

/**
 * Borderless Apple-style tonal surface container.
 * Uses pure surface elevation & soft ambient shadows with zero borders.
 */
export const SurfaceCard: React.FC<SurfaceCardProps> = ({
  tone = 'elevated',
  radius = 'lg',
  padding = 'md',
  interactive = false,
  className = '',
  children,
  ...rest
}) => {
  const { onClick, onKeyDown, ...otherRest } = rest;

  return (
    <motion.div
      whileTap={interactive ? { scale: 0.985 } : undefined}
      transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (interactive && onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          (onClick as unknown as (ev: unknown) => void)(e);
        }
        onKeyDown?.(e);
      }}
      className={`${TONE_CLASSES[tone]} ${RADIUS_CLASSES[radius]} ${PADDING_CLASSES[padding]} ${
        interactive ? 'cursor-pointer transition-all' : ''
      } ${className}`}
      {...otherRest}
    >
      {children}
    </motion.div>
  );
};
