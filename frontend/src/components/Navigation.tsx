import React from 'react';
import { Home, BookOpen, BarChart3, Mic, User } from 'lucide-react';

export type TabType = 'home' | 'library' | 'progress' | 'record' | 'profile';

interface NavigationProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  revisionDueCount: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onSelectTab,
  revisionDueCount
}) => {
  const tabs = [
    { id: 'home' as TabType, label: 'Home', icon: Home, badge: revisionDueCount > 0 ? revisionDueCount : undefined },
    { id: 'library' as TabType, label: 'Library', icon: BookOpen },
    { id: 'record' as TabType, label: 'Record', icon: Mic, isSpecial: true },
    { id: 'progress' as TabType, label: 'Progress', icon: BarChart3 },
    { id: 'profile' as TabType, label: 'Profile', icon: User }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-surface-900/95 backdrop-blur-md border-t border-surface-800 safe-bottom">
      <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;

          if (tab.isSpecial) {
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                aria-label="Open Studio Recorder"
                className={`relative -top-3 p-3.5 rounded-full shadow-lg transition-transform active:scale-95 ${
                  isActive
                    ? 'bg-amber-500 text-surface-950 ring-4 ring-amber-500/20'
                    : 'bg-gradient-to-tr from-amber-600 to-amber-400 text-surface-950 hover:brightness-110'
                }`}
              >
                <Icon size={24} strokeWidth={2.5} />
              </button>
            );
          }

          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`relative flex flex-col items-center justify-center w-14 py-1 transition-colors ${
                isActive ? 'text-amber-400 font-semibold' : 'text-surface-400 hover:text-surface-200'
              }`}
            >
              <div className="relative">
                <Icon size={20} strokeWidth={isActive ? 2.4 : 1.8} />
                {tab.badge && (
                  <span className="absolute -top-1.5 -right-2 bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full min-w-4 text-center">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] mt-1 tracking-tight">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
