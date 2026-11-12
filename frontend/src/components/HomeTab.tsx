import React, { useState, useMemo, useRef } from 'react';
import Autoplay from 'embla-carousel-autoplay';
import {
  Play,
  Pause,
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
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  X
} from 'lucide-react';
import { AudioItem, Subject, UserSettings, PlaybackState } from '../types';
import { formatDuration } from '../services/learningEngine';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext
} from '@/components/ui/carousel';

interface HomeTabProps {
  recentAudio: AudioItem[];
  subjects?: Subject[];
  playbackState?: PlaybackState;
  userSettings?: UserSettings;
  todayListeningSeconds?: number;
  onPlayAudio: (audio: AudioItem) => void;
  onSeek?: (seconds: number) => void;
  onGoToRecord: () => void;
  onNavigateToLibrary: (subjectId?: string) => void;
  onNavigateToAccount: () => void;
}

type FilterMode = 'all' | 'favorites' | 'short';

export const HomeTab: React.FC<HomeTabProps> = ({
  recentAudio,
  subjects = [],
  playbackState,
  onPlayAudio,
  onSeek,
  onGoToRecord,
  onNavigateToLibrary,
  onNavigateToAccount
}) => {
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotificationToast, setShowNotificationToast] = useState(false);

  const autoplayPlugin = useRef(
    Autoplay({ delay: 2800, stopOnInteraction: false, stopOnMouseEnter: true })
  );

  // Fallback to most recent or first audio note for "Continue Listening"
  const continueAudio = useMemo(() => {
    if (playbackState?.currentAudio) {
      return playbackState.currentAudio;
    }
    return recentAudio.length > 0 ? recentAudio[0] : null;
  }, [playbackState?.currentAudio, recentAudio]);

  const isCurrentAudioPlaying = Boolean(
    continueAudio &&
    playbackState?.isPlaying &&
    playbackState?.currentAudio?.id === continueAudio.id
  );

  // Search and filter logic
  const filteredBySearch = useMemo(() => {
    if (!searchQuery.trim()) return recentAudio;
    const q = searchQuery.toLowerCase();
    return recentAudio.filter(
      a =>
        a.title.toLowerCase().includes(q) ||
        (a.subject_name && a.subject_name.toLowerCase().includes(q)) ||
        (a.key_terms && a.key_terms.some(t => t.toLowerCase().includes(q)))
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

  // Subject Visuals & Dynamic Counts
  const subjectList = useMemo(() => {
    const defaultMeta = [
      { id: 'sub-1', name: 'Physics', icon: Atom, bg: 'bg-violet-100 text-violet-700', activeRing: 'hover:ring-violet-300' },
      { id: 'sub-2', name: 'Chemistry', icon: FlaskConical, bg: 'bg-rose-100 text-rose-700', activeRing: 'hover:ring-rose-300' },
      { id: 'sub-3', name: 'Biology', icon: Dna, bg: 'bg-emerald-100 text-emerald-700', activeRing: 'hover:ring-emerald-300' },
      { id: 'sub-4', name: 'Mathematics', icon: Binary, bg: 'bg-amber-100 text-amber-700', activeRing: 'hover:ring-amber-300' }
    ];

    return defaultMeta.map(meta => {
      const existing = subjects.find(s => s.id === meta.id || s.name.toLowerCase() === meta.name.toLowerCase());
      const count = recentAudio.filter(
        a => a.subject_id === meta.id || a.subject_name?.toLowerCase().includes(meta.name.toLowerCase().slice(0, 4))
      ).length;

      return {
        id: existing?.id || meta.id,
        name: meta.name === 'Mathematics' ? 'Math' : meta.name,
        fullName: meta.name,
        icon: meta.icon,
        bg: meta.bg,
        activeRing: meta.activeRing,
        count: `${count} note${count === 1 ? '' : 's'}`
      };
    });
  }, [subjects, recentAudio]);

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
      {/* Top Bar: User Greeting & Notification Bell */}
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
              Offline-First Vault • Ready to Study
            </p>
          </div>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowNotificationToast(prev => !prev)}
            aria-label="Notifications"
            className="w-9 h-9 rounded-full bg-white border border-slate-200/80 shadow-2xs flex items-center justify-center text-slate-600 hover:text-slate-900 hover:border-slate-300 active:scale-95 transition-all cursor-pointer"
          >
            <Bell size={16} />
            <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
          </button>

          {/* Quick Notification Dropdown Banner */}
          {showNotificationToast && (
            <div className="absolute right-0 top-11 w-64 p-3 bg-slate-950 text-white rounded-2xl shadow-xl z-50 animate-in fade-in slide-in-from-top-2 border border-slate-800 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold flex items-center gap-1.5 text-emerald-400 text-[11px] uppercase tracking-wider">
                  <ShieldCheck size={14} /> Sovereign Vault Active
                </span>
                <button
                  onClick={() => setShowNotificationToast(false)}
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  <X size={12} />
                </button>
              </div>
              <p className="text-[11px] text-slate-300 leading-snug">
                All 4 subjects are downloaded locally for 100% offline study. Direct Google Drive sync is active.
              </p>
              <button
                onClick={() => {
                  setShowNotificationToast(false);
                  onNavigateToAccount();
                }}
                className="text-[10px] font-semibold text-emerald-300 hover:underline pt-0.5 block"
              >
                Inspect Storage Quota →
              </button>
            </div>
          )}
        </div>
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

      {/* Modern Search Bar */}
      <div className="relative flex items-center">
        <div className="absolute left-3.5 text-slate-400 pointer-events-none">
          <Search size={16} />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search audio notes, subjects, concepts..."
          className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-white border border-slate-200/90 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.02)]"
        />
        {searchQuery ? (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-3 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X size={14} />
          </button>
        ) : (
          <div className="absolute right-3 text-slate-400 pointer-events-none">
            <SlidersHorizontal size={14} />
          </div>
        )}
      </div>

      {/* Hero Container: Animated Horizontal Moving Subject Carousel */}
      <div className="bg-[#EEECFE] border border-indigo-150/70 rounded-3xl p-4 space-y-3 shadow-2xs relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-900">
              Subject Folders
            </span>
            <span className="px-2 py-0.5 rounded-full bg-indigo-200/60 text-indigo-900 text-[10px] font-mono font-bold">
              {subjectList.length} Subjects
            </span>
          </div>
          <button
            onClick={() => onNavigateToLibrary()}
            className="text-[10px] font-mono font-semibold px-2.5 py-1 rounded-full bg-white/90 hover:bg-white text-indigo-900 border border-indigo-200/60 flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-2xs"
          >
            <span>View All ({recentAudio.length})</span>
            <ChevronRight size={11} />
          </button>
        </div>

        {/* Horizontal Moving Animated Subject Carousel (Embla Carousel) */}
        <div className="relative px-0.5">
          <Carousel
            opts={{
              align: 'start',
              loop: true,
            }}
            plugins={[
              autoplayPlugin.current
            ]}
            className="w-full"
          >
            <CarouselContent className="-ml-2.5">
              {subjectList.map((subj) => {
                const Icon = subj.icon;
                return (
                  <CarouselItem key={subj.id} className="pl-2.5 basis-[38%] sm:basis-[28%]">
                    <button
                      type="button"
                      onClick={() => onNavigateToLibrary(subj.id)}
                      className={`w-full flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-white/95 hover:bg-white border border-white/80 hover:border-indigo-300 transition-all text-center cursor-pointer shadow-xs hover:shadow-md hover:-translate-y-0.5 active:scale-95 group ${subj.activeRing}`}
                    >
                      <div className={`size-11 rounded-full ${subj.bg} flex items-center justify-center shadow-2xs transition-transform group-hover:scale-110`}>
                        <Icon size={20} strokeWidth={2.2} />
                      </div>
                      <div className="w-full text-center">
                        <span className="text-xs font-bold text-slate-900 block truncate leading-tight">
                          {subj.fullName || subj.name}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono font-medium block truncate mt-0.5">
                          {subj.count}
                        </span>
                      </div>
                    </button>
                  </CarouselItem>
                );
              })}
            </CarouselContent>
            {/* Subtle Carousel Navigation Chevrons for desktop/tablet */}
            <CarouselPrevious className="hidden sm:flex -left-2.5 size-7 bg-white/90 shadow-sm" />
            <CarouselNext className="hidden sm:flex -right-2.5 size-7 bg-white/90 shadow-sm" />
          </Carousel>
        </div>

        <div className="pt-0.5 flex items-center justify-between text-[10px] font-mono text-indigo-900/70 font-semibold px-1">
          <span>{recentAudio.length} Audio Notes</span>
          <span className="flex items-center gap-1 text-indigo-900 font-bold">
            <span className="size-1.5 rounded-full bg-indigo-500 animate-pulse" />
            Animated Carousel
          </span>
          <span>4 Structured Subject Hierarchies</span>
        </div>
      </div>

      {/* Continue Listening: Sleek Minimalist Studio Card */}
      {continueAudio && (() => {
        const continueDuration = (playbackState?.currentAudio?.id === continueAudio.id && playbackState.durationSeconds && Number.isFinite(playbackState.durationSeconds) && playbackState.durationSeconds > 0)
          ? playbackState.durationSeconds
          : (continueAudio.duration_seconds && Number.isFinite(continueAudio.duration_seconds) && continueAudio.duration_seconds > 0)
            ? continueAudio.duration_seconds
            : 60;
        const currentPos = (playbackState?.currentAudio?.id === continueAudio.id && typeof playbackState.positionSeconds === 'number' && Number.isFinite(playbackState.positionSeconds))
          ? playbackState.positionSeconds
          : 0;
        const cardProgressPercent = Math.min(100, Math.max(0, (currentPos / continueDuration) * 100));

        return (
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-3xl p-4.5 space-y-3 shadow-md border border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${isCurrentAudioPlaying ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                  {isCurrentAudioPlaying ? 'Currently Playing' : 'Continue Listening'}
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                {formatDuration(continueDuration)}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-mono font-bold uppercase text-emerald-400 block tracking-wider">
                  {continueAudio.subject_name || 'Academic'}
                </span>
                <h3 className="text-xs font-bold text-white truncate mt-0.5">
                  {continueAudio.title}
                </h3>
              </div>

              <button
                onClick={() => onPlayAudio(continueAudio)}
                aria-label={isCurrentAudioPlaying ? `Pause ${continueAudio.title}` : `Play ${continueAudio.title}`}
                className="w-11 h-11 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center transition-all active:scale-95 shadow-md shadow-emerald-500/20 shrink-0 cursor-pointer"
              >
                {isCurrentAudioPlaying ? (
                  <Pause size={17} fill="currentColor" />
                ) : (
                  <Play size={17} fill="currentColor" className="translate-x-0.5" />
                )}
              </button>
            </div>

            {/* Interactive, Smooth Scrubbable Seek Bar */}
            <div className="pt-0.5 space-y-1.5">
              <div
                className="relative w-full bg-slate-800 hover:bg-slate-700/80 h-2 rounded-full overflow-hidden cursor-pointer group transition-colors"
                title="Tap or drag to seek"
                onClick={(e) => {
                  if (!onSeek) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                  onSeek(pct * continueDuration);
                }}
              >
                <div
                  className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-150"
                  style={{ width: `${cardProgressPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-mono text-slate-400">
                <span>{formatDuration(currentPos)}</span>
                <span>{formatDuration(continueDuration)}</span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Action Chips Row (Correctly mapped to Record, Folders/Library, and Drive/Storage) */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={onGoToRecord}
          className="bg-[#E8F8F0] hover:bg-[#DCF3E7] text-emerald-800 border border-emerald-200/70 p-2.5 rounded-2xl flex items-center justify-center gap-1.5 text-xs font-semibold active:scale-95 transition-all shadow-2xs cursor-pointer"
          title="Open Audio Recorder"
        >
          <Mic size={15} className="text-emerald-700" />
          <span>Record</span>
        </button>

        <button
          onClick={() => onNavigateToLibrary()}
          className="bg-[#FFEFEF] hover:bg-[#FFE5E5] text-rose-800 border border-rose-200/70 p-2.5 rounded-2xl flex items-center justify-center gap-1.5 text-xs font-semibold active:scale-95 transition-all shadow-2xs cursor-pointer"
          title="Open Library & Subject Folders"
        >
          <Folder size={15} className="text-rose-700" />
          <span>Folders</span>
        </button>

        <button
          onClick={onNavigateToAccount}
          className="bg-[#EEF6FF] hover:bg-[#E0EEFF] text-sky-800 border border-sky-200/70 p-2.5 rounded-2xl flex items-center justify-center gap-1.5 text-xs font-semibold active:scale-95 transition-all shadow-2xs cursor-pointer"
          title="View Sovereign Google Drive Storage"
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

          {/* Lesson List Cards */}
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
          const isPlayingThis = Boolean(
            playbackState?.isPlaying &&
            playbackState?.currentAudio?.id === audio.id
          );

          return (
            <div
              key={audio.id}
              className={`group bg-white border p-3 rounded-2xl flex items-center justify-between gap-3 transition-all duration-200 shadow-2xs hover:shadow-xs ${
                isPlayingThis ? 'border-emerald-500 ring-2 ring-emerald-500/10' : 'border-slate-200/80 hover:border-slate-300'
              }`}
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
                <div className="flex items-center gap-1.5 mb-1 overflow-hidden">
                  <span className="text-[10px] font-mono font-bold text-slate-700 uppercase shrink-0">
                    {audio.subject_name || 'General'}
                  </span>
                  {audio.is_downloaded_offline && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-[9px] font-bold font-mono flex items-center gap-0.5 shrink-0">
                      <CheckCircle2 size={9} /> OFFLINE
                    </span>
                  )}
                  {audio.audio_enhancement_applied && (
                    <span className="px-1.5 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200/80 text-[9px] font-bold font-mono shrink-0">
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
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90 shadow-2xs hover:scale-105 cursor-pointer ${
                    isPlayingThis ? 'bg-emerald-600 text-white' : 'bg-slate-950 hover:bg-slate-800 text-white'
                  }`}
                  aria-label={isPlayingThis ? `Pause ${audio.title}` : `Play ${audio.title}`}
                >
                  {isPlayingThis ? (
                    <Pause size={12} fill="currentColor" />
                  ) : (
                    <Play size={12} fill="currentColor" className="translate-x-0.5" />
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  }
};
