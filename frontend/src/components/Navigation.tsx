import React from 'react';
import { Home, Folder, BarChart3, Mic, User } from 'lucide-react';

export type TabType = 'home' | 'library' | 'progress' | 'record' | 'profile';

interface NavigationProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  attachedPlayer?: React.ReactNode;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onSelectTab,
  attachedPlayer
}) => {
  const leftTabs = [
    { id: 'home' as TabType, label: 'Home', icon: Home },
    { id: 'library' as TabType, label: 'Library', icon: Folder }
  ];

  const rightTabs = [
    { id: 'progress' as TabType, label: 'Progress', icon: BarChart3 },
    { id: 'profile' as TabType, label: 'Account', icon: User }
  ];

  const hasPlayer = Boolean(attachedPlayer);

  return (
    <nav className="fixed bottom-3 sm:bottom-4 left-0 right-0 z-40 px-3.5 pointer-events-none safe-bottom flex flex-col items-center">
      <div
        className={`w-full pointer-events-auto bg-slate-950/95 backdrop-blur-2xl text-white shadow-[0_16px_40px_rgba(0,0,0,0.45)] border border-white/10 transition-all duration-300 overflow-hidden flex flex-col ${
          hasPlayer
            ? 'max-w-[360px] sm:max-w-sm rounded-[22px]'
            : 'max-w-xs rounded-full'
        }`}
      >
        {/* Attached Telegram-Style Compact Player Tier */}
        {attachedPlayer && (
          <div className="w-full">
            {attachedPlayer}
          </div>
        )}

        {/* Navigation Bar Tier */}
        <div
          className={`w-full p-1.5 px-3 flex items-center justify-between transition-colors ${
            hasPlayer ? 'border-t border-white/10' : ''
          }`}
        >
          {/* Left Tabs */}
          <div className="flex items-center gap-1">
            {leftTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onSelectTab(tab.id)}
                  aria-label={tab.label}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-white text-slate-950 shadow-sm scale-105'
                      : 'text-slate-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Icon size={19} strokeWidth={isActive ? 2.4 : 1.8} />
                </button>
              );
            })}
          </div>

          {/* Center Action Button (Record Studio) */}
          <button
            onClick={() => onSelectTab('record')}
            aria-label="Record Audio Note"
            className={`w-11 h-11 rounded-full flex items-center justify-center text-white transition-all duration-200 shadow-md active:scale-90 cursor-pointer ${
              currentTab === 'record'
                ? 'bg-amber-500 shadow-amber-500/40 ring-4 ring-amber-400/30 scale-105'
                : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/30 hover:scale-105'
            }`}
          >
            <Mic size={20} strokeWidth={2.4} />
          </button>

          {/* Right Tabs */}
          <div className="flex items-center gap-1">
            {rightTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onSelectTab(tab.id)}
                  aria-label={tab.label}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-white text-slate-950 shadow-sm scale-105'
                      : 'text-slate-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Icon size={19} strokeWidth={isActive ? 2.4 : 1.8} />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
};
