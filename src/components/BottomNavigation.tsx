import React from 'react';
import {
  Mic,
  Camera,
  ChartNoAxesColumn,
} from 'lucide-react';
import { motion } from 'motion/react';
import { AppTab } from '../types';

interface BottomNavigationProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  isDarkTheme?: boolean;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeTab,
  onTabChange,
  isDarkTheme = false,
}) => {
  const getNormalizedTab = (
    tab: AppTab
  ): 'camera' | 'practice' | 'progress' => {
    if (tab === 'practice' || tab === 'think') return 'practice';
    if (tab === 'progress' || tab === 'my-english' || tab === 'profile') {
      return 'progress';
    }
    return 'camera';
  };

  const currentTab = getNormalizedTab(activeTab);

  const navItems = [
    { id: 'camera' as AppTab, label: 'Camera', icon: Camera },
    { id: 'practice' as AppTab, label: 'Practice', icon: Mic },
    { id: 'progress' as AppTab, label: 'My English', icon: ChartNoAxesColumn },
  ];

  return (
    <nav
      aria-label="Primary navigation"
      className={`w-full safe-bottom pt-2 pb-2.5 px-3 transition-colors duration-300 select-none sticky bottom-0 z-40 backdrop-blur-xl ${
        isDarkTheme
          ? 'bg-[#141B18]/92 text-white shadow-[0_-8px_28px_rgba(0,0,0,0.3)]'
          : 'bg-white/94 text-[#18221D] shadow-[0_-6px_28px_rgba(15,35,25,0.045)]'
      }`}
    >
      <div className="flex items-center justify-between gap-1 max-w-[400px] mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <motion.button
              key={item.id}
              whileTap={{ scale: 0.93 }}
              transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
              type="button"
              onClick={() => onTabChange(item.id)}
              className={`relative flex flex-col items-center justify-center flex-1 min-h-[52px] py-1.5 px-1 rounded-[18px] transition-all cursor-pointer ${
                isActive
                  ? isDarkTheme
                    ? 'bg-emerald-950/85 text-emerald-400'
                    : 'bg-[#EAF6EE] text-[#148343]'
                  : isDarkTheme
                  ? 'text-white/45 hover:text-white/75'
                  : 'text-[#616D66] hover:text-[#18221D]'
              }`}
            >
              <Icon
                className={`w-[21px] h-[21px] transition-transform ${
                  isActive ? 'stroke-[2.2]' : 'stroke-[1.75]'
                }`}
              />
              <span
                className={`text-[11px] tracking-[-0.01em] mt-1 leading-none ${
                  isActive ? 'font-bold' : 'font-medium'
                }`}
              >
                {item.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
};
