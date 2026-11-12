import React, { useState, useMemo } from 'react';
import {
  Play,
  Sparkles,
  Mic,
  Star,
  Zap,
  Search,
  SlidersHorizontal,
  Bell,
  Folder,
  Atom,
  FlaskConical,
  Dna,
  Binary,
  Cloud,
  CheckCircle2
} from 'lucide-react';
import { AudioItem, UserSettings } from '../types';
import { formatDuration } from '../services/learningEngine';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface HomeTabProps {
  recentAudio: AudioItem[];
  userSettings?: UserSettings;
  todayListeningSeconds?: number;
  onPlayAudio: (audio: AudioItem) => void;
  onGoToRecord: () => void;
}

type FilterMode = 'all' | 'favorites' | 'short';

export const HomeTab: React.FC<HomeTabProps> = ({
  recentAudio,
  onPlayAudio,
  onGoToRecord
}) => {
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const continueAudio = recentAudio.length > 0 ? recentAudio[0] : null;

  // Search and filter logic
  const filteredBySearch = useMemo(() => {
    if (!searchQuery.trim()) return recentAudio;
    const q = searchQuery.toLowerCase();
    return recentAudio.filter(
      a =>
        a.title.toLowerCase().includes(q) ||
        (a.subject_name && a.subject_name.toLowerCase().includes(q))
    );
  }, [recentAudio, searchQuery]);

  const allAudio = filteredBySearch;
  const favoriteAudio = filteredBySearch.filter(a => !!a.is_favorite);
  const shortAudio = filteredBySearch.filter(a => a.duration_seconds <= 300);

  const getFilteredItems = (mode: FilterMode) => {
    switch (mode) {
      case 'favorites':
        return favoriteAudio;
      case 'short':
        return shortAudio;
      default:
        return allAudio;
    }
  };

  const currentItems = getFilteredItems(filterMode);

  // Subject theme helper for squircles
  const getSubjectVisual = (subjectName?: string) => {
    const s = (subjectName || '').toLowerCase();
    if (s.includes('physic')) {
      return {
        bg: 'bg-violet-100 text-violet-700',
        cardBg: 'bg-violet-50/70',
        icon: Atom,
        label: 'Physics'
      };
    }
    if (s.includes('chem')) {
      return {
        bg: 'bg-rose-100 text-rose-700',
        cardBg: 'bg-rose-50/70',
        icon: FlaskConical,
        label: 'Chemistry'
      };
    }
    if (s.includes('bio')) {
      return {
        bg: 'bg-emerald-100 text-emerald-700',
        cardBg: 'bg-emerald-50/70',
        icon: Dna,
        label: 'Biology'
      };
    }
    return {
      bg: 'bg-amber-100 text-amber-700',
      cardBg: 'bg-amber-50/70',
      icon: Binary,
      label: 'Mathematics'
    };
  };

  return (
    <div className="space-y-4 pb-28 pt-3 px-4 max-w-md mx-auto">
      {/* Top Bar: User Greeting & Bell Icon */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full ring-2 ring-emerald-400/60 bg-gradient-to-tr from-emerald-100 to-teal-100 flex items-center justify-center text-emerald-800 font-bold text-sm shadow-2xs">
            स्म
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-xs font-bold text-slate-900">
                Hi, Scholar
              </h2>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              6 Day Streak 🔥 • Offline Ready
            </p>
          </div>
        </div>

        <button
          type="button"
          aria-label="Notifications"
          className="w-9 h-9 rounded-full bg-white border border-slate-200/80 shadow-2xs flex items-center justify-center text-slate-600 hover:text-slate-900 hover:border-slate-300 active:scale-95 transition-all cursor-pointer"
        >
          <Bell size={16} />
        </button>
      </div>

      {/* Main Page Title */}
      <div className="pt-0.5">
        <h1 className="text-2xl font-black text-slate-950 tracking-tight">
          Save With Smriti
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Your offline-first personal audio study vault.
        </p>
      </div>

      {/* Modern Search Bar with Filter Slider */}
      <div className="relative flex items-center">
        <div className="absolute left-3.5 text-slate-400 pointer-events-none">
          <Search size={16} />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search audio notes, subjects..."
          className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-white border border-slate-200/90 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.02)]"
        />
        <button
          type="button"
          aria-label="Filter"
          className="absolute right-3 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
        >
          <SlidersHorizontal size={15} />
        </button>
      </div>

      {/* Hero Pastel Card: Recent Files & Subjects (Lavender Container from Image 1) */}
      <div className="bg-[#EEECFE] border border-indigo-150/70 rounded-3xl p-4.5 space-y-3 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-900">
              Recent Files & Folders
            </span>
          </div>
          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-white/70 text-indigo-900 border border-indigo-200/50">
            {recentAudio.length} Files
          </span>
        </div>

        {/* 4 Circular Subject Shortcuts */}
        <div className="grid grid-cols-4 gap-2 pt-1">
          {[
            { name: 'Physics', icon: Atom, count: '3 audio', bg: 'bg-violet-200 text-violet-800' },
            { name: 'Chemistry', icon: FlaskConical, count: '1 audio', bg: 'bg-rose-200 text-rose-800' },
            { name: 'Biology', icon: Dna, count: '1 audio', bg: 'bg-emerald-200 text-emerald-800' },
            { name: 'Math', icon: Binary, count: '1 audio', bg: 'bg-amber-200 text-amber-800' }
          ].map((subj, idx) => {
            const Icon = subj.icon;
            return (
              <div
                key={idx}
                className="flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-white/60 hover:bg-white/90 border border-white/80 transition-all text-center cursor-default shadow-2xs"
              >
                <div className={`w-10 h-10 rounded-full ${subj.bg} flex items-center justify-center shadow-2xs`}>
                  <Icon size={18} strokeWidth={2.2} />
                </div>
                <span className="text-[11px] font-bold text-slate-900 truncate w-full">
                  {subj.name}
                </span>
                <span className="text-[9px] text-slate-500 font-mono truncate w-full -mt-0.5">
                  {subj.count}
                </span>
              </div>
            );
          })}
        </div>

        <div className="pt-1 text-center">
          <span className="text-[10px] font-mono text-indigo-900/70 font-semibold">
            {recentAudio.length} Audio Notes • 4 Structured Subject Folders
          </span>
        </div>
      </div>

      {/* Hero Pastel Card 2: Continue Listening (Yellow / Peach Card from Image 1) */}
      {continueAudio && (
        <div className="bg-[#FFF5D6] border border-amber-200/60 rounded-3xl p-4.5 space-y-2.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900">
              Continue Listening
            </span>
            <span className="text-[10px] font-mono text-amber-900/70 font-semibold">
              {formatDuration(continueAudio.duration_seconds)}
            </span>
          </div>

          <p className="text-[11px] text-amber-950/80 leading-snug">
            Resume your study session where you left off:
          </p>

          <div className="flex items-center justify-between p-3 rounded-2xl bg-white/70 border border-amber-200/70 gap-3">
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-mono font-bold uppercase text-amber-800 block">
                {continueAudio.subject_name || 'Subject'}
              </span>
              <h3 className="text-xs font-bold text-slate-900 truncate mt-0.5">
                {continueAudio.title}
              </h3>
            </div>

            <button
              onClick={() => onPlayAudio(continueAudio)}
              aria-label={`Play ${continueAudio.title}`}
              className="w-10 h-10 rounded-full bg-slate-950 hover:bg-slate-800 text-white flex items-center justify-center transition-all active:scale-90 shadow-sm shrink-0 cursor-pointer"
            >
              <Play size={15} fill="currentColor" className="translate-x-0.5" />
            </button>
          </div>
        </div>
      )}

      {/* Action Chips Row (Upload, Folder, Scan style in Image 1) */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={onGoToRecord}
          className="bg-[#E8F8F0] hover:bg-[#DCF3E7] text-emerald-800 border border-emerald-200/70 p-2.5 rounded-2xl flex items-center justify-center gap-1.5 text-xs font-semibold active:scale-95 transition-all shadow-2xs cursor-pointer"
        >
          <Mic size={15} className="text-emerald-700" />
          <span>Record</span>
        </button>

        <button
          onClick={() => {
            const tabsElem = document.getElementById('lessons-tabs-section');
            tabsElem?.scrollIntoView({ behavior: 'smooth' });
          }}
          className="bg-[#FFEFEF] hover:bg-[#FFE5E5] text-rose-800 border border-rose-200/70 p-2.5 rounded-2xl flex items-center justify-center gap-1.5 text-xs font-semibold active:scale-95 transition-all shadow-2xs cursor-pointer"
        >
          <Folder size={15} className="text-rose-700" />
          <span>Folders</span>
        </button>

        <button
          onClick={onGoToRecord}
          className="bg-[#EEF6FF] hover:bg-[#E0EEFF] text-sky-800 border border-sky-200/70 p-2.5 rounded-2xl flex items-center justify-center gap-1.5 text-xs font-semibold active:scale-95 transition-all shadow-2xs cursor-pointer"
        >
          <Cloud size={15} className="text-sky-700" />
          <span>Drive</span>
        </button>
      </div>

      {/* LESSONS SECTION with Clean Segmented Pill Tabs */}
      <div id="lessons-tabs-section" className="space-y-3 pt-1">
        <Tabs
          value={filterMode}
          onValueChange={(val) => setFilterMode(val as FilterMode)}
          className="w-full space-y-3"
        >
          <div className="flex items-center justify-between px-0.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Audio Notes
            </h2>
            <span className="text-[11px] font-mono text-slate-400">
              {currentItems.length} available
            </span>
          </div>

          {/* Segmented Pill Tabs */}
          <TabsList className="w-full grid grid-cols-3 p-1 bg-slate-100/90 border border-slate-200/80 rounded-2xl h-10 shadow-2xs">
            <TabsTrigger
              value="all"
              className="flex items-center justify-center gap-1.5 text-xs rounded-xl"
            >
              <span>All</span>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-slate-200/70 text-slate-700">
                {allAudio.length}
              </span>
            </TabsTrigger>

            <TabsTrigger
              value="favorites"
              className="flex items-center justify-center gap-1 text-xs rounded-xl"
            >
              <Star className="size-3.5 text-amber-500" />
              <span>Favs</span>
            </TabsTrigger>

            <TabsTrigger
              value="short"
              className="flex items-center justify-center gap-1 text-xs rounded-xl"
            >
              <Zap className="size-3.5 text-sky-500 fill-sky-500" />
              <span>&lt;5m</span>
            </TabsTrigger>
          </TabsList>

          {/* Lesson List Cards (Styled like the Dropbox files list with squircles) */}
          <TabsContent value="all" className="space-y-2 mt-0">
            {renderLessonList(currentItems, 'No audio notes match your search.')}
          </TabsContent>
          <TabsContent value="favorites" className="space-y-2 mt-0">
            {renderLessonList(currentItems, 'No favorited lessons yet.')}
          </TabsContent>
          <TabsContent value="short" className="space-y-2 mt-0">
            {renderLessonList(currentItems, 'No short lessons under 5 minutes.')}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );

  function renderLessonList(items: AudioItem[], emptyMsg: string) {
    if (items.length === 0) {
      return (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-7 text-center shadow-2xs">
          <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-2.5">
            <Sparkles size={18} />
          </div>
          <p className="text-xs font-semibold text-slate-800">{emptyMsg}</p>
          <p className="text-[11px] text-slate-500 mt-1">Tap 'All' to browse your entire study catalog.</p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {items.map((audio) => {
          const visual = getSubjectVisual(audio.subject_name);
          const Icon = visual.icon;

          return (
            <div
              key={audio.id}
              className="group bg-white border border-slate-200/80 hover:border-slate-300 p-3 rounded-2xl flex items-center justify-between gap-3 transition-all duration-200 shadow-2xs hover:shadow-xs"
            >
              {/* Left Squircle Icon */}
              <div
                onClick={() => onPlayAudio(audio)}
                className={`w-11 h-11 rounded-2xl ${visual.bg} flex items-center justify-center shrink-0 cursor-pointer shadow-2xs group-hover:scale-105 transition-transform`}
              >
                <Icon size={19} strokeWidth={2.2} />
              </div>

              {/* Title & Metadata */}
              <div
                onClick={() => onPlayAudio(audio)}
                className="flex-1 min-w-0 cursor-pointer"
              >
                <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                  <span className="text-[10px] font-mono font-bold text-slate-600 uppercase">
                    {audio.subject_name || 'General'}
                  </span>
                  {audio.is_downloaded_offline && (
                    <span className="px-1.5 py-0.2 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/70 text-[9px] font-bold font-mono flex items-center gap-0.5">
                      <CheckCircle2 size={8} /> OFFLINE
                    </span>
                  )}
                  {audio.audio_enhancement_applied && (
                    <span className="px-1.5 py-0.2 rounded-md bg-sky-50 text-sky-700 border border-sky-200/70 text-[9px] font-bold font-mono">
                      DSP
                    </span>
                  )}
                </div>
                <h4 className="text-xs font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                  {audio.title}
                </h4>
              </div>

              {/* Duration & Play Button */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] text-slate-400 font-mono font-medium">
                  {formatDuration(audio.duration_seconds)}
                </span>
                <button
                  onClick={() => onPlayAudio(audio)}
                  className="w-8 h-8 rounded-full bg-slate-950 hover:bg-slate-800 text-white flex items-center justify-center transition-all active:scale-90 shadow-2xs hover:scale-105 cursor-pointer"
                  aria-label={`Play ${audio.title}`}
                >
                  <Play size={12} fill="currentColor" className="translate-x-0.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  }
};
