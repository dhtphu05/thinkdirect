import React from 'react';

interface RadiantRaysProps {
  className?: string;
  color?: string;
}

/**
 * Three crisp angled spark capsules accenting hero titles
 * (built with pure CSS geometric capsules — zero custom icon SVGs).
 */
export const RadiantRays: React.FC<RadiantRaysProps> = ({
  className = 'w-6 h-6',
  color = '#148343',
}) => {
  return (
    <span
      className={`relative inline-block shrink-0 select-none pointer-events-none ${className}`}
      aria-hidden="true"
    >
      {/* Steep upper ray */}
      <span
        className="absolute left-[4px] top-[2px] w-[2.5px] h-[9px] rounded-full rotate-[12deg]"
        style={{ backgroundColor: color }}
      />
      {/* 45-degree middle ray */}
      <span
        className="absolute left-[11px] top-[6px] w-[2.5px] h-[10px] rounded-full rotate-[44deg]"
        style={{ backgroundColor: color }}
      />
      {/* Lower angled ray */}
      <span
        className="absolute left-[14px] top-[15px] w-[9px] h-[2.5px] rounded-full -rotate-[15deg]"
        style={{ backgroundColor: color }}
      />
    </span>
  );
};

/**
 * Bilateral celebration spark capsules flanking the green checkmark squircle ("Great job!")
 */
export const CelebrationRays: React.FC<RadiantRaysProps> = ({
  className = 'relative w-[144px] h-[72px]',
  color = '#158A47',
}) => {
  return (
    <div
      className={`pointer-events-none select-none ${className}`}
      aria-hidden="true"
    >
      {/* Left upper angled ray */}
      <span className="absolute left-[18px] top-[13px] w-[13px] h-[2.8px] rounded-full bg-[#7FD69C] rotate-[40deg]" />
      {/* Left horizontal ray */}
      <span className="absolute left-[11px] top-[38px] w-[12px] h-[2.8px] rounded-full bg-[#9CE2B3] -rotate-[5deg]" />
      {/* Right steep ray */}
      <span
        className="absolute right-[24px] top-[9px] w-[2.8px] h-[12px] rounded-full rotate-[34deg]"
        style={{ backgroundColor: color }}
      />
      {/* Right diagonal ray */}
      <span
        className="absolute right-[14px] top-[21px] w-[13px] h-[2.8px] rounded-full -rotate-[32deg]"
        style={{ backgroundColor: color }}
      />
      {/* Right horizontal ray */}
      <span className="absolute right-[11px] top-[37px] w-[12px] h-[2.8px] rounded-full bg-[#7FD69C]" />
    </div>
  );
};
