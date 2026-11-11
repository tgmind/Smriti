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
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-xl border-t border-slate-200/80 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] safe-bottom">
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
                className={`relative -top-3 p-3.5 rounded-full shadow-lg transition-transform active:scale-90 ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 ring-4 ring-amber-500/20 shadow-amber-500/25'
                    : 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-900/20'
                }`}
              >
                <Icon size={22} strokeWidth={2.4} />
              </button>
            );
          }

          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`relative flex flex-col items-center justify-center w-14 py-1.5 rounded-xl transition-all ${
                isActive
                  ? 'text-slate-950 font-semibold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div className="relative">
                <Icon size={20} strokeWidth={isActive ? 2.3 : 1.7} />
                {tab.badge && (
                  <span className="absolute -top-1.5 -right-2.5 bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full min-w-4 text-center shadow-xs">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] mt-1 tracking-tight">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
