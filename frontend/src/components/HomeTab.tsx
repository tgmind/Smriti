import React, { useState } from 'react';
import { Play, Sparkles, Clock, Flame, ArrowRight, Mic, CheckCircle2, Zap, Star } from 'lucide-react';
import { AudioItem, RevisionItem, UserSettings } from '../types';
import { formatDuration } from '../services/learningEngine';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface HomeTabProps {
  recentAudio: AudioItem[];
  revisionsDue: RevisionItem[];
  userSettings: UserSettings;
  todayListeningSeconds: number;
  onPlayAudio: (audio: AudioItem) => void;
  onOpenAssessment: () => void;
  onOpenAssessmentForAudio?: (audio: AudioItem) => void;
  onGoToRecord: () => void;
  onUpdateGoal?: (minutes: number) => void;
}

type FilterMode = 'all' | 'due' | 'favorites' | 'short';

export const HomeTab: React.FC<HomeTabProps> = ({
  recentAudio,
  revisionsDue,
  userSettings,
  todayListeningSeconds,
  onPlayAudio,
  onOpenAssessment,
  onOpenAssessmentForAudio,
  onGoToRecord,
  onUpdateGoal
}) => {
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [tabVariant, setTabVariant] = useState<'default' | 'line'>('default');

  const goalSeconds = userSettings.daily_listening_goal_minutes * 60;
  const goalProgress = Math.min(100, Math.round((todayListeningSeconds / (goalSeconds || 1)) * 100));
  const continueAudio = recentAudio.length > 0 ? recentAudio[0] : null;

  const dueAudioIds = new Set(revisionsDue.map(r => r.audio_id));

  const allAudio = recentAudio;
  const dueAudio = recentAudio.filter(a => dueAudioIds.has(a.id));
  const favoriteAudio = recentAudio.filter(a => !!a.is_favorite);
  const shortAudio = recentAudio.filter(a => a.duration_seconds <= 300);

  const getFilteredItems = (mode: FilterMode) => {
    switch (mode) {
      case 'due': return dueAudio;
      case 'favorites': return favoriteAudio;
      case 'short': return shortAudio;
      default: return allAudio;
    }
  };

  const currentItems = getFilteredItems(filterMode);
  const goalPresets = [15, 30, 45, 60];

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
          const isDue = dueAudioIds.has(audio.id);
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
                  {isDue && (
                    <span className="px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-300/80 text-[9px] font-bold font-mono tracking-tight flex items-center gap-0.5">
                      <Sparkles size={9} className="text-amber-600" />
                      DUE
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

                {/* Direct 1-Tap Recall Button */}
                <button
                  onClick={() => onOpenAssessmentForAudio ? onOpenAssessmentForAudio(audio) : onOpenAssessment()}
                  className="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100/90 text-amber-900 border border-amber-200/90 text-[11px] font-bold font-mono flex items-center gap-1 active:scale-95 transition-all shadow-2xs cursor-pointer"
                  title="Test active recall for this lesson"
                >
                  <Zap size={11} className="fill-amber-600 text-amber-600" />
                  <span>Recall</span>
                </button>

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
              Listen • Repeat • Recall • Remember
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50/90 border border-amber-200/80 text-amber-800 shadow-2xs">
          <Flame size={14} className="text-amber-600 fill-amber-500" />
          <span className="text-xs font-mono font-bold">6 Day Streak</span>
        </div>
      </div>

      {/* Daily Listening Goal Card with 1-Tap Quick Presets */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
              <Clock size={14} />
            </div>
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Daily Goal
            </h2>
          </div>
          <span className="text-xs font-mono font-semibold text-slate-700 bg-slate-100/90 px-2 py-0.5 rounded-md border border-slate-200/60">
            {formatDuration(todayListeningSeconds)} / {userSettings.daily_listening_goal_minutes}m ({goalProgress}%)
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
          <div
            className="bg-amber-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${goalProgress}%` }}
          />
        </div>

        {/* 1-Tap Target Preset Buttons */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-100">
          <span className="text-[11px] font-medium text-slate-500">Quick Target:</span>
          <div className="flex items-center gap-1.5">
            {goalPresets.map(preset => {
              const isActive = userSettings.daily_listening_goal_minutes === preset;
              return (
                <button
                  key={preset}
                  onClick={() => onUpdateGoal?.(preset)}
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold transition-all border cursor-pointer ${
                    isActive
                      ? 'bg-slate-950 border-slate-950 text-white shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-100'
                  }`}
                  aria-label={`Set daily target to ${preset} minutes`}
                >
                  {preset}m
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500">
          <span>Targeted repetition builds durable recall.</span>
          {goalProgress >= 100 && (
            <span className="text-emerald-600 font-bold flex items-center gap-1">
              <CheckCircle2 size={13} /> Completed
            </span>
          )}
        </div>
      </div>

      {/* Today's Spaced Repetition Due Card */}
      {revisionsDue.length > 0 && (
        <div className="bg-gradient-to-br from-amber-500/10 via-amber-50/50 to-white border border-amber-200/90 rounded-2xl p-4.5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center shadow-xs">
                <Sparkles size={15} />
              </div>
              <h2 className="text-sm font-bold text-slate-900">
                Spaced Recall Due
              </h2>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 text-xs font-bold shadow-2xs">
              {revisionsDue.length} Due
            </span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Active retrieval right now halts forgetting curves and recalculates your optimal retention intervals.
          </p>

          <button
            onClick={onOpenAssessment}
            className="w-full py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-semibold active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-xs shadow-xs cursor-pointer"
          >
            <span>Start Active Recall Check</span>
            <ArrowRight size={14} />
          </button>
        </div>
      )}

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
                ? 'w-full grid grid-cols-4 p-1 bg-slate-100/90 border border-slate-200/80 rounded-xl h-10 shadow-2xs'
                : 'w-full grid grid-cols-4 border-b border-slate-200/90'
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
              value="due"
              className={
                tabVariant === 'default'
                  ? 'flex items-center justify-center gap-1 text-xs'
                  : 'flex items-center justify-center gap-1 text-xs pb-2'
              }
            >
              <Flame className="size-3.5 text-amber-600 fill-amber-500" />
              <span>Due</span>
              {revisionsDue.length > 0 && (
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-900 border border-amber-300/70">
                  {revisionsDue.length}
                </span>
              )}
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
          <TabsContent value="due" className="space-y-2 mt-0">
            {renderLessonCards(dueAudio, 'No spaced revisions due today! Great job.')}
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
