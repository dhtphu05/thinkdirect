import React from 'react';
import { motion, HTMLMotionProps } from 'motion/react';
import { ArrowRight, RefreshCw } from 'lucide-react';

export type PillButtonVariant = 'primary' | 'secondary' | 'tonal' | 'ghost';

interface PillButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: PillButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children: React.ReactNode;
}

const VARIANT_CLASSES: Record<PillButtonVariant, string> = {
  primary:
    'bg-gradient-to-b from-[#137A47] to-[#0B5A34] hover:from-[#116E40] hover:to-[#094D2C] text-white apple-shadow-cta',
  secondary:
    'bg-[#F3F4F2] hover:bg-[#EAECE9] text-[#222C26] apple-shadow-xs',
  tonal:
    'bg-[#E7F5EC] hover:bg-[#DCF0E3] text-[#137A42]',
  ghost:
    'bg-transparent hover:bg-black/[0.04] text-[#4E5B53]',
};

const SIZE_CLASSES = {
  sm: 'h-10 px-4 text-[13px] font-semibold gap-1.5',
  md: 'h-[50px] px-5 text-[15px] font-semibold gap-2',
  lg: 'h-[54px] px-6 text-[16.5px] font-semibold gap-2.5',
};

/**
 * Reusable Apple-style borderless pill button with spring press physics.
 */
export const PillButton: React.FC<PillButtonProps> = ({
  variant = 'primary',
  size = 'lg',
  fullWidth = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  children,
  ...rest
}) => {
  return (
    <motion.button
      whileTap={disabled ? undefined : { scale: 0.97 }}
      transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
      type="button"
      disabled={disabled}
      className={`rounded-full inline-flex items-center justify-center tracking-[-0.01em] transition-all select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
        VARIANT_CLASSES[variant]
      } ${SIZE_CLASSES[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {leftIcon && <span className="shrink-0 flex items-center">{leftIcon}</span>}
      <span className="whitespace-nowrap">{children}</span>
      {rightIcon && <span className="shrink-0 flex items-center">{rightIcon}</span>}
    </motion.button>
  );
};

interface PracticeActionFooterProps {
  primaryLabel: string;
  onPrimary: () => void;
  primaryDisabled?: boolean;
  secondaryLabel?: string;
  onSecondary?: () => void;
  showPrimaryArrow?: boolean;
  className?: string;
}

/**
 * Reusable bottom action bar matching Image 1 ([Retry] [Continue ->]),
 * Image 4 ([Practice again] [Next topic ->]), and Image 5 ([Continue ->]).
 */
export const PracticeActionFooter: React.FC<PracticeActionFooterProps> = ({
  primaryLabel,
  onPrimary,
  primaryDisabled = false,
  secondaryLabel,
  onSecondary,
  showPrimaryArrow = true,
  className = '',
}) => {
  return (
    <div className={`w-full flex items-center gap-2.5 pt-2 ${className}`}>
      {secondaryLabel && onSecondary && (
        <PillButton
          variant="secondary"
          size="lg"
          onClick={onSecondary}
          leftIcon={<RefreshCw className="w-4 h-4 stroke-[2.1] text-[#3E4A43]" />}
          className="px-4 sm:px-5 shrink-0 text-[14px] sm:text-[14.5px]"
        >
          {secondaryLabel}
        </PillButton>
      )}

      <PillButton
        variant="primary"
        size="lg"
        fullWidth
        disabled={primaryDisabled}
        onClick={onPrimary}
        rightIcon={
          showPrimaryArrow ? (
            <ArrowRight className="w-[17px] h-[17px] sm:w-[18px] sm:h-[18px] stroke-[2.3]" />
          ) : undefined
        }
        className={`flex-1 min-w-0 ${
          secondaryLabel ? 'px-4 sm:px-6 text-[15px] sm:text-[16px]' : ''
        }`}
      >
        {primaryLabel}
      </PillButton>
    </div>
  );
};
