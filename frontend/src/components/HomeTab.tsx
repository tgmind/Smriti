import React, { useState } from 'react';
import { Play, Sparkles, Flame, Mic, Star, Zap } from 'lucide-react';
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
  const [tabVariant, setTabVariant] = useState<'default' | 'line'>('default');

  const continueAudio = recentAudio.length > 0 ? recentAudio[0] : null;

  const allAudio = recentAudio;
  const favoriteAudio = recentAudio.filter(a => !!a.is_favorite);
  const shortAudio = recentAudio.filter(a => a.duration_seconds <= 300);

  const getFilteredItems = (mode: FilterMode) => {
    switch (mode) {
      case 'favorites': return favoriteAudio;
      case 'short': return shortAudio;
      default: return allAudio;
    }
  };

  const currentItems = getFilteredItems(filterMode);

  const renderLessonCards = (items: AudioItem[], emptyMessage: string) => {
    if (items.length === 0) {
      return (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-7 text-center shadow-2xs">
          <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-2.5">
            <Sparkles size={18} />
          </div>
          <p className="text-xs font-semibold text-slate-800">{emptyMessage}</p>
          <p className="text-[11px] text-slate-500 mt-1">Tap 'All' to browse your entire study catalog.</p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {items.slice(0, 5).map((audio) => {
          return (
            <div
              key={audio.id}
              className="group bg-white border border-slate-200/90 hover:border-slate-300 p-3.5 rounded-2xl flex items-center justify-between gap-3 transition-all duration-200 shadow-2xs hover:shadow-xs"
            >
              <div
                onClick={() => onPlayAudio(audio)}
                className="flex-1 min-w-0 cursor-pointer"
              >
                <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-bold text-slate-700 font-mono tracking-tight uppercase">
                    {audio.subject_name || 'General'}
                  </span>
                  {audio.is_downloaded_offline && (
                    <span className="px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/70 text-[9px] font-bold font-mono tracking-tight flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      OFFLINE
                    </span>
                  )}
                  {audio.audio_enhancement_applied && (
                    <span className="px-1.5 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200/70 text-[9px] font-bold font-mono tracking-tight flex items-center gap-0.5">
                      <Sparkles size={8} /> DSP
                    </span>
                  )}
                </div>
                <h4 className="text-xs font-bold text-slate-900 truncate group-hover:text-amber-600 transition-colors">
                  {audio.title}
                </h4>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] text-slate-400 font-mono font-medium">
                  {formatDuration(audio.duration_seconds)}
                </span>

                {/* Direct 1-Tap Play Button */}
                <button
                  onClick={() => onPlayAudio(audio)}
                  className="w-8 h-8 rounded-full bg-slate-950 hover:bg-slate-800 text-white flex items-center justify-center transition-all active:scale-90 shadow-2xs hover:scale-105 cursor-pointer"
                  aria-label={`Play ${audio.title}`}
                >
                  <Play size={13} fill="currentColor" className="translate-x-0.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-5 pb-28 pt-4 px-4 max-w-md mx-auto">
      {/* Brand & Streak Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-slate-950 text-amber-400 font-extrabold flex items-center justify-center text-sm shadow-xs ring-1 ring-slate-900/10">
            स्म
          </div>
          <div>
            <h1 className="text-base font-extrabold text-slate-950 tracking-tight leading-tight">
              SMRITI
            </h1>
            <p className="text-[11px] font-medium text-slate-500 tracking-tight">
              Listen • Repeat • Learn • Remember
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50/90 border border-amber-200/80 text-amber-800 shadow-2xs">
          <Flame size={14} className="text-amber-600 fill-amber-500" />
          <span className="text-xs font-mono font-bold">6 Day Streak</span>
        </div>
      </div>

      {/* Continue Listening Hero */}
      {continueAudio && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Continue Listening
            </h2>
            <span className="text-[11px] text-slate-400 font-mono font-medium">Resume last</span>
          </div>

          <div
            onClick={() => onPlayAudio(continueAudio)}
            className="group bg-white border border-slate-200/90 hover:border-slate-300 rounded-2xl p-3.5 shadow-2xs hover:shadow-xs flex items-center gap-3.5 cursor-pointer transition-all active:scale-[0.99]"
          >
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-sm shadow-amber-500/25 group-hover:scale-105 transition-transform">
              <Play size={20} fill="currentColor" className="translate-x-0.5" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[10px] uppercase font-bold text-slate-700 font-mono">
                  {continueAudio.subject_name || 'Subject'}
                </span>
                <span className="text-[11px] text-slate-400 font-mono font-medium">
                  {formatDuration(continueAudio.duration_seconds)}
                </span>
              </div>
              <h3 className="text-xs font-bold text-slate-900 truncate group-hover:text-amber-600 transition-colors">
                {continueAudio.title}
              </h3>
            </div>
          </div>
        </div>
      )}

      {/* Quick Record Studio Shortcut */}
      <div
        onClick={onGoToRecord}
        className="group bg-white border border-dashed border-slate-300 hover:border-amber-400 hover:bg-amber-50/20 rounded-2xl p-3.5 flex items-center gap-3 cursor-pointer transition-all active:scale-[0.99] shadow-2xs"
      >
        <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 border border-amber-200/80 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-amber-100 transition-all">
          <Mic size={18} strokeWidth={2.2} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-xs font-bold text-slate-900 group-hover:text-amber-700 transition-colors">
            Record Audio Lesson or Voice Notes
          </h4>
          <p className="text-[11px] text-slate-500 truncate mt-0.5">
            DSP noise suppression & personal Google Drive sync
          </p>
        </div>
      </div>

      {/* LESSONS SECTION with Base UI Tabs */}
      <div className="space-y-3">
        <Tabs
          value={filterMode}
          onValueChange={(val) => setFilterMode(val as FilterMode)}
          className="w-full space-y-3"
        >
          {/* Header with Title, Count & Tab Variant Toggle */}
          <div className="flex items-center justify-between px-0.5">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Lessons
              </h2>
              <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200/70">
                {currentItems.length} shown
              </span>
            </div>

            {/* Subtle Tab Style Switcher (Pill vs Line) */}
            <div className="flex items-center gap-1 bg-slate-100/90 p-0.5 rounded-lg border border-slate-200/70">
              <button
                type="button"
                onClick={() => setTabVariant('default')}
                className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold transition-all cursor-pointer ${
                  tabVariant === 'default'
                    ? 'bg-white text-slate-950 shadow-2xs border border-slate-200/80'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Pill / Segmented style"
              >
                Pill
              </button>
              <button
                type="button"
                onClick={() => setTabVariant('line')}
                className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold transition-all cursor-pointer ${
                  tabVariant === 'line'
                    ? 'bg-white text-slate-950 shadow-2xs border border-slate-200/80'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Line underline style"
              >
                Line
              </button>
            </div>
          </div>

          {/* Base UI TabsList */}
          <TabsList
            variant={tabVariant}
            className={
              tabVariant === 'default'
                ? 'w-full grid grid-cols-3 p-1 bg-slate-100/90 border border-slate-200/80 rounded-xl h-10 shadow-2xs'
                : 'w-full grid grid-cols-3 border-b border-slate-200/90'
            }
          >
            <TabsTrigger
              value="all"
              className={
                tabVariant === 'default'
                  ? 'flex items-center justify-center gap-1.5 text-xs'
                  : 'flex items-center justify-center gap-1.5 text-xs pb-2'
              }
            >
              <span>All</span>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-slate-200/70 text-slate-700">
                {allAudio.length}
              </span>
            </TabsTrigger>

            <TabsTrigger
              value="favorites"
              className={
                tabVariant === 'default'
                  ? 'flex items-center justify-center gap-1 text-xs'
                  : 'flex items-center justify-center gap-1 text-xs pb-2'
              }
            >
              <Star className="size-3.5 text-amber-500" />
              <span>Favs</span>
            </TabsTrigger>

            <TabsTrigger
              value="short"
              className={
                tabVariant === 'default'
                  ? 'flex items-center justify-center gap-1 text-xs'
                  : 'flex items-center justify-center gap-1 text-xs pb-2'
              }
            >
              <Zap className="size-3.5 text-sky-500 fill-sky-500" />
              <span>&lt;5m</span>
            </TabsTrigger>
          </TabsList>

          {/* Base UI TabsContent for each panel */}
          <TabsContent value="all" className="space-y-2 mt-0">
            {renderLessonCards(allAudio, 'No audio lessons found.')}
          </TabsContent>
          <TabsContent value="favorites" className="space-y-2 mt-0">
            {renderLessonCards(favoriteAudio, 'No favorited lessons yet. Star lessons in Library to pin them here.')}
          </TabsContent>
          <TabsContent value="short" className="space-y-2 mt-0">
            {renderLessonCards(shortAudio, 'No quick lessons under 5 minutes found.')}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
