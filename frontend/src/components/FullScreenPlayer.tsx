import React, { useState, useMemo } from 'react';
import {
  ChevronDown,
  Heart,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  ListMusic,
  BookmarkCheck,
  Timer,
  CheckCircle2,
  Download,
  X,
  Check,
  MoreHorizontal,
  Search,
  SlidersHorizontal
} from 'lucide-react';
import { AudioItem, PlaybackState, Subject } from '../types';
import { formatDuration } from '../services/learningEngine';
import { getPlayCountTheme, formatPlayCountBadge } from '../utils/playCountColor';
import { Slider } from './ui/slider';
import { Badge } from './ui/badge';
import { LoopIntervalSelector } from './LoopIntervalSelector';
import { OrganicSoundwave } from './OrganicSoundwave';
import { resolveSubjectVisual } from '../utils/subjectVisuals';
import { bridge } from '../services/bridge';
import { cn } from '@/lib/utils';
import { ModalPortal } from '@/components/ui/modal-portal';

export interface FullScreenPlayerProps {
  playbackState: PlaybackState;
  playbackQueue?: AudioItem[];
  currentQueueIndex?: number;
  audioQueue?: AudioItem[];
  subjects?: Subject[];
  initialView?: 'player' | 'queue';
  onClose: () => void;
  onTogglePlay: () => void;
  onSeek: (seconds: number) => void;
  onSeekRelative: (seconds: number) => void;
  onSetSpeed: (speed: number) => void;
  onToggleRepeat: () => void;
  onToggleABLoop: (start?: number, end?: number) => void;
  onSetSleepTimer: (minutes: number | null) => void;
  onToggleFavorite: (audioId: string) => void;
  onToggleOffline: (audio: AudioItem) => void;
  onSelectTrack?: (audio: AudioItem, index?: number) => void;
  onNext?: () => void;
  onPrevious?: () => void;
}

type ModalType = 'none' | 'tools' | 'ab_loop' | 'sleep' | 'speed';
type QueueScope = 'queue' | 'subject' | 'all' | 'favorites';

export const FullScreenPlayer: React.FC<FullScreenPlayerProps> = ({
  playbackState,
  playbackQueue = [],
  currentQueueIndex = 0,
  audioQueue = [],
  subjects = [],
  initialView = 'player',
  onClose,
  onTogglePlay,
  onSeek,
  onSeekRelative,
  onSetSpeed,
  onToggleRepeat,
  onToggleABLoop,
  onSetSleepTimer,
  onToggleFavorite,
  onToggleOffline,
  onSelectTrack,
  onNext,
  onPrevious
}) => {
  const {
    currentAudio,
    isPlaying,
    positionSeconds,
    durationSeconds,
    playbackSpeed,
    isRepeatTrack,
    isRepeatQueue,
    abLoop,
    sleepTimerRemainingSeconds
  } = playbackState;

  const repeatMode: 'off' | 'one' | 'all' =
    playbackState.repeatMode ||
    (isRepeatTrack ? 'one' : isRepeatQueue ? 'all' : 'off');

  const hasCustomQueue = playbackQueue && playbackQueue.length > 0;
  const [viewMode, setViewMode] = useState<'player' | 'queue'>(initialView);
  const [queueScope, setQueueScope] = useState<QueueScope>(hasCustomQueue ? 'queue' : 'subject');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeModal, setActiveModal] = useState<ModalType>('none');
  const [scrubPosition, setScrubPosition] = useState<number | null>(null);

  if (!currentAudio) return null;

  // Strict finite duration and position
  const safeDuration =
    typeof durationSeconds === 'number' && Number.isFinite(durationSeconds) && durationSeconds > 0
      ? durationSeconds
      : currentAudio.duration_seconds &&
        Number.isFinite(currentAudio.duration_seconds) &&
        currentAudio.duration_seconds > 0
      ? currentAudio.duration_seconds
      : 60;

  const safePosition =
    typeof positionSeconds === 'number' && Number.isFinite(positionSeconds) && positionSeconds >= 0
      ? positionSeconds
      : 0;

  const currentDisplayPos = scrubPosition !== null ? scrubPosition : safePosition;
  const remainingSeconds = Math.max(0, safeDuration - currentDisplayPos);

  const speedCycleList = [1.0, 1.25, 1.5, 2.0];
  const timerOptions = [
    { label: 'Off', minutes: null },
    { label: '5 min', minutes: 5 },
    { label: '15 min', minutes: 15 },
    { label: '30 min', minutes: 30 },
    { label: '45 min', minutes: 45 },
    { label: '60 min', minutes: 60 }
  ];

  const matchedSubject = subjects.find((s) => s.id === currentAudio.subject_id);
  const displaySubjectName = currentAudio.subject_name || matchedSubject?.name || 'Academic Concept';

  const currentPlayCount = currentAudio.play_count || 0;
  const currentPlayTheme = getPlayCountTheme(currentPlayCount);

  const loopRange = abLoop?.enabled
    ? {
        startPercent: (abLoop.startSeconds / safeDuration) * 100,
        endPercent: (abLoop.endSeconds / safeDuration) * 100
      }
    : null;

  // Scoped queues
  const currentSubId = currentAudio.subject_id;
  const currentSubName = (currentAudio.subject_name || '').toLowerCase();

  const activeSubjectQueue = useMemo(() => {
    return audioQueue.filter((a) => {
      if (currentSubId && a.subject_id === currentSubId) return true;
      if (currentSubName && a.subject_name && a.subject_name.toLowerCase() === currentSubName) return true;
      return false;
    });
  }, [audioQueue, currentSubId, currentSubName]);

  const favoriteAudioList = useMemo(() => {
    return audioQueue.filter((a) => a.is_favorite);
  }, [audioQueue]);

  const displayQueue = useMemo(() => {
    if (queueScope === 'queue' && hasCustomQueue) {
      return playbackQueue;
    }
    if (queueScope === 'subject') {
      return activeSubjectQueue.length > 0 ? activeSubjectQueue : audioQueue;
    }
    if (queueScope === 'favorites') {
      return favoriteAudioList;
    }
    return audioQueue;
  }, [queueScope, hasCustomQueue, playbackQueue, activeSubjectQueue, favoriteAudioList, audioQueue]);

  // CRITICAL DEDUPLICATION: Up Next strictly follows queue order and repeat rules!
  const upNextQueue = useMemo(() => {
    if (queueScope === 'queue' && hasCustomQueue) {
      const curIdx = currentQueueIndex >= 0 ? currentQueueIndex : playbackQueue.findIndex(a => a.id === currentAudio.id);
      if (curIdx >= 0) {
        if (repeatMode === 'all') {
          const after = playbackQueue.slice(curIdx + 1);
          const before = playbackQueue.slice(0, curIdx);
          return [...after, ...before];
        }
        return playbackQueue.slice(curIdx + 1);
      }
      return playbackQueue.filter(a => a.id !== currentAudio.id);
    }
    const curIdx = displayQueue.findIndex((a) => a.id === currentAudio.id);
    if (curIdx >= 0) {
      const after = displayQueue.slice(curIdx + 1);
      const before = displayQueue.slice(0, curIdx);
      return [...after, ...before];
    }
    return displayQueue.filter((a) => a.id !== currentAudio.id);
  }, [queueScope, hasCustomQueue, playbackQueue, currentQueueIndex, repeatMode, displayQueue, currentAudio.id]);

  const filteredUpNextQueue = useMemo(() => {
    if (!searchQuery.trim()) return upNextQueue;
    const q = searchQuery.toLowerCase();
    return upNextQueue.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        (a.subject_name && a.subject_name.toLowerCase().includes(q))
    );
  }, [upNextQueue, searchQuery]);

  // Determine next audio for the Now Playing preview card
  const nextAudio = useMemo(() => {
    return upNextQueue.length > 0 ? upNextQueue[0] : null;
  }, [upNextQueue]);

  // Haptic feedback & user controls
  const handlePlayPause = () => {
    bridge.triggerHaptic('heavy');
    onTogglePlay();
  };

  const handlePrevious = () => {
    bridge.triggerHaptic('medium');
    if (onPrevious) {
      onPrevious();
    } else {
      onSeekRelative(-10);
    }
  };

  const handleNext = () => {
    bridge.triggerHaptic('medium');
    if (onNext) {
      onNext();
    } else {
      onSeekRelative(15);
    }
  };

  const handleToggleFav = () => {
    bridge.triggerHaptic('medium');
    onToggleFavorite(currentAudio.id);
  };

  const handleToggleRepeatMode = () => {
    bridge.triggerHaptic('light');
    onToggleRepeat();
  };

  const handleCycleSpeed = () => {
    bridge.triggerHaptic('light');
    const idx = speedCycleList.findIndex((s) => Math.abs(s - playbackSpeed) < 0.05);
    const nextSpeed = idx >= 0 && idx < speedCycleList.length - 1 ? speedCycleList[idx + 1] : speedCycleList[0];
    onSetSpeed(nextSpeed);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#f8fafc] flex flex-col justify-between h-[100dvh] max-h-[100dvh] overflow-hidden safe-top safe-bottom text-slate-900 select-none animate-in fade-in duration-200">
      {/* 1. Universal Top Header Bar (Now Playing vs Queue Mode) */}
      <header className="flex flex-col items-center shrink-0 w-full max-w-md mx-auto z-10 px-4 sm:px-5 pt-2 pb-1">
        {/* Apple Music Style Pill Drag Handle when in Queue Mode */}
        {viewMode === 'queue' && (
          <div
            onClick={() => {
              bridge.triggerHaptic('light');
              setViewMode('player');
            }}
            className="w-12 h-1.5 rounded-full bg-slate-300 hover:bg-slate-400 active:bg-slate-500 cursor-pointer transition-all mb-2 -mt-0.5 shadow-2xs"
            role="button"
            aria-label="Minimize queue"
            title="Minimize queue"
          />
        )}

        <div className="flex items-center justify-between w-full h-12">
          {/* Left: Dedicated Minimize Symbol (Unmistakable Frosted Glass Symbol) */}
          <button
            onClick={() => {
              bridge.triggerHaptic('light');
              if (viewMode === 'queue') {
                setViewMode('player');
              } else {
                onClose();
              }
            }}
            className="size-10 rounded-full flex items-center justify-center bg-white hover:bg-slate-100 border border-slate-200/90 text-slate-700 active:scale-90 transition-all cursor-pointer shadow-xs group"
            aria-label={viewMode === 'queue' ? 'Minimize queue' : 'Collapse player'}
            title={viewMode === 'queue' ? 'Minimize Queue to Player' : 'Collapse Player'}
          >
            <ChevronDown
              size={22}
              strokeWidth={2.6}
              className={cn(
                'text-slate-700 transition-transform duration-200',
                viewMode === 'queue' ? 'group-hover:translate-y-0.5' : 'group-hover:translate-y-0.5'
              )}
            />
          </button>

          {/* Center: Two-Line Typographic Header with Full Subject (No Cutoffs) */}
          <div className="flex flex-col items-center justify-center text-center px-2 min-w-0 max-w-[210px]">
            <span className="text-[10px] font-mono tracking-widest text-slate-400 uppercase font-bold">
              {viewMode === 'queue' ? 'Playlists & Queue' : 'PLAYING FROM'}
            </span>
            <h3 className="text-xs font-bold text-slate-900 truncate w-full">
              {displaySubjectName}
            </h3>
          </div>

          {/* Right: Offline Download Status + More Options Menu */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                bridge.triggerHaptic('light');
                onToggleOffline(currentAudio);
              }}
              className="size-9 rounded-full flex items-center justify-center bg-white hover:bg-slate-100 border border-slate-200/90 text-slate-600 hover:text-slate-900 active:scale-90 transition-all cursor-pointer shadow-2xs"
              title={currentAudio.is_downloaded_offline ? 'Saved Offline' : 'Save for Offline Study'}
              aria-label="Toggle offline download"
            >
              {currentAudio.is_downloaded_offline ? (
                <CheckCircle2 size={17} className="text-emerald-600" />
              ) : (
                <Download size={17} />
              )}
            </button>

            <button
              onClick={() => {
                bridge.triggerHaptic('light');
                setActiveModal('tools');
              }}
              className="size-9 rounded-full flex items-center justify-center bg-white hover:bg-slate-100 border border-slate-200/90 text-slate-600 hover:text-slate-900 active:scale-90 transition-all cursor-pointer shadow-2xs"
              aria-label="Study tools and options"
            >
              <MoreHorizontal size={19} />
            </button>
          </div>
        </div>
      </header>

      {/* Screen Reader Helper for Study Mode */}
      <span className="sr-only">Study Mode</span>

      {/* 2. Main Stage: Refined Vinyl & Wave Visualizer vs Upgraded Glass Queue */}
      {viewMode === 'player' ? (
        <section className="flex-1 min-h-0 flex flex-col justify-between px-5 w-full max-w-md mx-auto z-10 pb-2 pt-2 overflow-hidden">
          {/* Central Mastery Play-Count Ring Visualizer */}
          <div className="flex-1 flex flex-col items-center justify-center relative my-auto w-full py-3">
            {/* Ambient Animated Soundwave Layers */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-35 animate-disc-pulse">
              <OrganicSoundwave isPlaying={isPlaying} />
            </div>

            {/* Mastery Play-Count Circular Hub */}
            <div className="relative size-60 sm:size-68 rounded-full bg-white border border-slate-200/90 shadow-[0_20px_50px_-12px_rgba(15,23,42,0.12)] flex items-center justify-center p-3 select-none transition-transform duration-300">
              {/* Subtle inner concentric guide */}
              <div className="absolute inset-2.5 rounded-full border border-slate-100 pointer-events-none" />

              {/* High-Precision Circular Progress SVG Ring */}
              <svg className="absolute inset-0 size-full -rotate-90 pointer-events-none" viewBox="0 0 200 200">
                {/* Background Ring Track */}
                <circle
                  cx="100"
                  cy="100"
                  r="86"
                  stroke="#F1F5F9"
                  strokeWidth="8"
                  fill="transparent"
                />
                {/* Active Colored Progress Arc */}
                <circle
                  cx="100"
                  cy="100"
                  r="86"
                  stroke={currentPlayTheme.hex}
                  strokeWidth="8"
                  strokeDasharray={2 * Math.PI * 86}
                  strokeDashoffset={2 * Math.PI * 86 * (1 - Math.min(100, Math.max(0, currentPlayTheme.progressPercent)) / 100)}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-700 ease-out"
                />
              </svg>

              {/* Inner Center Hub with Big Tabular Count & Tier Label */}
              <div className="flex flex-col items-center justify-center text-center z-10 px-4">
                <span className={cn('text-5xl sm:text-6xl font-black tabular-nums tracking-tight leading-none', currentPlayTheme.textColor)}>
                  {currentPlayCount}
                </span>
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400 mt-2 font-mono">
                  PLAY COUNT
                </span>
                <div className="mt-2.5">
                  <span className={cn('inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] sm:text-xs font-bold border shadow-2xs whitespace-nowrap', currentPlayTheme.badgeClass)}>
                    <span className="size-1.5 rounded-full shrink-0" style={{ backgroundColor: currentPlayTheme.hex }} />
                    {currentPlayTheme.label}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* UP NEXT PREVIEW CARD: Minimalist Light Glass Dock */}
          <div
            onClick={() => {
              bridge.triggerHaptic('light');
              setViewMode('queue');
            }}
            className="w-full bg-white hover:bg-slate-50 border border-slate-200/90 rounded-2xl p-3 shadow-xs cursor-pointer transition-all duration-200 group/queuepeek active:scale-[0.99] mb-1"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter') setViewMode('queue');
            }}
            aria-label="Open queue and playlists"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="size-8 rounded-xl bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-600 shrink-0 group-hover/queuepeek:text-slate-900 group-hover/queuepeek:bg-slate-200 transition-colors shadow-2xs">
                  <ListMusic size={15} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                      {displaySubjectName}
                    </span>
                    <span className="text-[9.5px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 border border-slate-200/70">
                      {activeSubjectQueue.length} notes
                    </span>
                  </div>
                  {nextAudio ? (
                    <p className="text-xs font-semibold text-slate-900 truncate mt-0.5 group-hover/queuepeek:text-amber-700">
                      Next: <span className="font-normal text-slate-600">{nextAudio.title}</span>
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      Tap to view all {audioQueue.length} queue notes
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {isPlaying && (
                  <span className="inline-flex items-end gap-0.5 h-3 w-3 text-amber-500 mb-0.5">
                    <span className="w-0.5 bg-amber-500 rounded-full animate-eq-1 h-full" />
                    <span className="w-0.5 bg-amber-500 rounded-full animate-eq-2 h-2/3" />
                    <span className="w-0.5 bg-amber-500 rounded-full animate-eq-3 h-4/5" />
                  </span>
                )}
                <span className="text-[11px] font-semibold text-slate-700 group-hover/queuepeek:text-slate-900 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200/80 transition-colors shadow-2xs">
                  View Queue
                </span>
              </div>
            </div>
          </div>
        </section>
      ) : (
        /* PLAYLISTS & QUEUE STUDIO: In Minimalist Light Theme */
        <section className="flex-1 min-h-0 flex flex-col w-full max-w-md mx-auto px-4 z-10 py-1 overflow-hidden">
          {/* Top Bar: 3-Segment Scope Controller */}
          <div className="space-y-2 mb-2 shrink-0">
            {/* 3-Segment Scope Controller */}
            <div className="grid grid-cols-3 gap-1 bg-slate-100/90 border border-slate-200/90 rounded-2xl p-1 shadow-2xs">
              {hasCustomQueue ? (
                <>
                  <button
                    onClick={() => {
                      bridge.triggerHaptic('light');
                      setQueueScope('queue');
                    }}
                    className={cn(
                      'py-2 px-2.5 rounded-xl text-xs font-semibold truncate transition-all cursor-pointer text-center',
                      queueScope === 'queue'
                        ? 'bg-white text-black font-extrabold shadow-sm'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-white/50'
                    )}
                  >
                    Queue ({playbackQueue.length})
                  </button>

                  <button
                    onClick={() => {
                      bridge.triggerHaptic('light');
                      setQueueScope('subject');
                    }}
                    className={cn(
                      'py-2 px-2.5 rounded-xl text-xs font-semibold truncate transition-all cursor-pointer text-center',
                      queueScope === 'subject'
                        ? 'bg-white text-black font-extrabold shadow-sm'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-white/50'
                    )}
                  >
                    {displaySubjectName} ({activeSubjectQueue.length})
                  </button>

                  <button
                    onClick={() => {
                      bridge.triggerHaptic('light');
                      setQueueScope('all');
                    }}
                    className={cn(
                      'py-2 px-2.5 rounded-xl text-xs font-semibold truncate transition-all cursor-pointer text-center',
                      queueScope === 'all'
                        ? 'bg-white text-black font-extrabold shadow-sm'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-white/50'
                    )}
                  >
                    All Notes ({audioQueue.length})
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      bridge.triggerHaptic('light');
                      setQueueScope('subject');
                    }}
                    className={cn(
                      'py-2 px-2.5 rounded-xl text-xs font-semibold truncate transition-all cursor-pointer text-center',
                      queueScope === 'subject'
                        ? 'bg-white text-black font-extrabold shadow-sm'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-white/50'
                    )}
                  >
                    {displaySubjectName} ({activeSubjectQueue.length})
                  </button>

                  <button
                    onClick={() => {
                      bridge.triggerHaptic('light');
                      setQueueScope('all');
                    }}
                    className={cn(
                      'py-2 px-2.5 rounded-xl text-xs font-semibold truncate transition-all cursor-pointer text-center',
                      queueScope === 'all'
                        ? 'bg-white text-black font-extrabold shadow-sm'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-white/50'
                    )}
                  >
                    All Notes ({audioQueue.length})
                  </button>

                  <button
                    onClick={() => {
                      bridge.triggerHaptic('light');
                      setQueueScope('favorites');
                    }}
                    className={cn(
                      'py-2 px-2.5 rounded-xl text-xs font-semibold truncate transition-all cursor-pointer flex items-center justify-center gap-1.5',
                      queueScope === 'favorites'
                        ? 'bg-white text-black font-extrabold shadow-sm'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-white/50'
                    )}
                  >
                    <Heart size={12} className={queueScope === 'favorites' ? 'fill-rose-500 text-rose-500' : 'text-slate-400'} />
                    <span>Favorites ({favoriteAudioList.length})</span>
                  </button>
                </>
              )}
            </div>

            {/* Modern Light Search Bar */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search notes in queue..."
                className="w-full bg-white border border-slate-200/90 focus:border-slate-400 rounded-xl pl-8 pr-8 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none transition-all shadow-2xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Scrollable Track Queue (Deduplicated with Refined Cards) */}
          <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-0.5 no-scrollbar">
            {/* 1. ELEVATED "NOW PLAYING" CARD */}
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="size-11 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-center shrink-0 text-amber-600 shadow-2xs">
                  {isPlaying ? (
                    <span className="inline-flex items-end gap-0.5 h-3.5 w-3.5 text-amber-600">
                      <span className="w-0.5 bg-amber-600 rounded-full animate-eq-1 h-full" />
                      <span className="w-0.5 bg-amber-600 rounded-full animate-eq-2 h-2/3" />
                      <span className="w-0.5 bg-amber-600 rounded-full animate-eq-3 h-4/5" />
                    </span>
                  ) : (
                    <Play size={16} className="fill-amber-600 text-amber-600 translate-x-0.5" />
                  )}
                </div>
                <div className="min-w-0">
                  <span className="text-[9.5px] font-mono font-bold tracking-widest text-emerald-700 uppercase">
                    NOW PLAYING
                  </span>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-2 leading-snug">
                    {currentAudio.title}
                  </h4>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono mt-0.5">
                    <span className="truncate">{displaySubjectName}</span>
                    <span>•</span>
                    <span>{formatDuration(safePosition)} / {formatDuration(safeDuration)}</span>
                    <span>•</span>
                    <span className={cn('shrink-0 font-bold px-1.5 py-0.2 rounded-md border text-[9.5px]', currentPlayTheme.badgeClass)}>
                      {formatPlayCountBadge(currentPlayCount)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={handlePlayPause}
                  className="size-9 rounded-full bg-slate-950 text-white flex items-center justify-center active:scale-90 transition-transform cursor-pointer shadow-xs"
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? <Pause size={16} className="fill-white" /> : <Play size={16} className="fill-white translate-x-0.5" />}
                </button>
              </div>
            </div>

            {/* 2. UP NEXT SECTION HEADER (Strictly shows count of upcoming items) */}
            <div className="pt-2 pb-0.5 flex items-center justify-between px-1">
              <span className="text-[10px] font-mono font-bold tracking-widest text-slate-400 uppercase">
                {`UP NEXT (${filteredUpNextQueue.length})`}
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                {`${filteredUpNextQueue.length} lessons`}
              </span>
            </div>

            {/* 3. DEDUPLICATED UP NEXT TRACK LIST */}
            {filteredUpNextQueue.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500 font-mono">
                {searchQuery ? 'No matching audio notes found' : 'End of queue • Turn on repeat or select other lessons'}
              </div>
            ) : (
              filteredUpNextQueue.map((item) => {
                const itemVisual = resolveSubjectVisual({
                  subjectId: item.subject_id,
                  subjectName: item.subject_name
                });
                const ItemIcon = itemVisual.icon;

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      bridge.triggerHaptic('medium');
                      if (onSelectTrack) {
                        const targetIdx = displayQueue.findIndex((a) => a.id === item.id);
                        onSelectTrack(item, targetIdx >= 0 ? targetIdx : undefined);
                      }
                    }}
                    className="p-3 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200/80 hover:border-slate-300 transition-all duration-150 flex items-center justify-between gap-3 cursor-pointer group active:scale-[0.985] shadow-2xs"
                  >
                    {/* Left: 40px Rounded Squircle Subject Icon */}
                    <div
                      className="size-10 rounded-xl flex items-center justify-center shrink-0 border border-slate-200/80 shadow-2xs"
                      style={{ background: itemVisual.colorHex + '20', color: itemVisual.colorHex }}
                    >
                      <ItemIcon size={18} />
                    </div>

                    {/* Center: Title (2-line clamp to prevent clipping) & Metadata */}
                    <div className="flex-1 min-w-0">
                      <h5 className="text-xs sm:text-sm font-semibold text-slate-900 group-hover:text-amber-700 line-clamp-2 leading-snug">
                        {item.title}
                      </h5>
                      <div className="flex items-center gap-1.5 text-[10.5px] text-slate-500 font-mono mt-0.5">
                        <span className="truncate">{item.subject_name || 'Academic'}</span>
                        <span>•</span>
                        <span>{formatDuration(item.duration_seconds || 60)}</span>
                        <span>•</span>
                        {(() => {
                          const itemPlayTheme = getPlayCountTheme(item.play_count);
                          return (
                            <span className={cn('shrink-0 font-bold px-1.5 py-0.2 rounded-md border text-[9.5px]', itemPlayTheme.badgeClass)}>
                              {formatPlayCountBadge(item.play_count)}
                            </span>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Right: Offline Indicator / Tactile Heart Toggle */}
                    <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {item.is_downloaded_offline && (
                        <span title="Offline ready">
                          <CheckCircle2 size={16} className="text-emerald-600" />
                        </span>
                      )}
                      <button
                        onClick={() => onToggleFavorite(item.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-500 cursor-pointer active:scale-85 transition-transform"
                        aria-label={item.is_favorite ? 'Remove favorite' : 'Add favorite'}
                      >
                        <Heart
                          size={16}
                          className={item.is_favorite ? 'text-rose-500 fill-rose-500' : ''}
                        />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      )}

      {/* 3. Audio Title & Favorite Heart Row (2-Line Clamp to Prevent Text Clipping) */}
      <div className="w-full max-w-md mx-auto px-6 mb-2 flex items-center justify-between gap-4 z-10 shrink-0">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-black text-slate-950 tracking-tight leading-snug line-clamp-2">
            {currentAudio.title}
          </h2>
          <p className="text-sm font-medium text-slate-500 mt-0.5 truncate flex items-center gap-1.5">
            <span>{displaySubjectName}</span>
            <span className="text-slate-300">•</span>
            <span className="font-mono text-slate-600">{playbackSpeed}×</span>
          </p>
        </div>

        {/* Tactile Heart Button */}
        <button
          onClick={handleToggleFav}
          className="size-11 flex items-center justify-center shrink-0 active:scale-85 transition-transform cursor-pointer"
          aria-label={currentAudio.is_favorite ? 'Remove favorite' : 'Add favorite'}
          title={currentAudio.is_favorite ? 'Favorited' : 'Add to Favorites'}
        >
          <Heart
            size={26}
            className={
              currentAudio.is_favorite
                ? 'text-rose-500 fill-rose-500 transition-colors'
                : 'text-slate-400 hover:text-slate-700 stroke-[2.2] transition-colors'
            }
          />
        </button>
      </div>

      {/* 4. Bottom Player Controls & Slender Scrubber */}
      <footer className="w-full max-w-md mx-auto shrink-0 px-6 pb-6 pt-1 space-y-4 z-10">
        {/* High-Precision Slender Seek Bar */}
        <div className="space-y-1.5">
          <Slider
            value={currentDisplayPos}
            min={0}
            max={safeDuration}
            step={0.1}
            loopRange={loopRange}
            onChange={(val) => {
              bridge.triggerHaptic('light');
              setScrubPosition(val);
            }}
            onCommit={(finalVal) => {
              bridge.triggerHaptic('medium');
              onSeek(finalVal);
              setScrubPosition(null);
            }}
            formatTooltip={(val) => formatDuration(val)}
            trackClassName="bg-slate-200/90 h-1"
            rangeClassName="bg-slate-900"
            thumbClassName="size-3.5 bg-slate-900 border-white shadow-md active:scale-125"
            aria-label="Audio scrubber"
          />

          <div className="flex justify-between items-center text-xs font-mono font-medium text-slate-500 px-0.5 select-none">
            <span>{formatDuration(currentDisplayPos)}</span>
            {abLoop?.enabled && (
              <Badge
                variant="outline"
                className="text-[10px] py-0 px-2 font-mono bg-amber-50 border border-amber-200 text-amber-800"
              >
                LOOP {formatDuration(abLoop.startSeconds)}–{formatDuration(abLoop.endSeconds)}
              </Badge>
            )}
            <span>{`-${formatDuration(remainingSeconds)}`}</span>
          </div>
        </div>

        {/* Primary Controls Row: Exactly 5 Symmetrical Controls */}
        <div className="flex items-center justify-between px-2 sm:px-4 text-slate-900">
          {/* Shuffle / Mode Button */}
          <button
            onClick={handleToggleRepeatMode}
            className="size-11 flex items-center justify-center active:scale-85 transition-transform cursor-pointer"
            aria-label="Toggle repeat mode"
            title="Toggle repeat / shuffle"
          >
            <Shuffle
              size={21}
              className={
                isRepeatQueue ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-900 transition-colors'
              }
            />
          </button>

          {/* Skip Previous Track */}
          <button
            onClick={handlePrevious}
            className="size-12 flex items-center justify-center active:scale-85 transition-transform cursor-pointer"
            aria-label="Rewind 10 seconds"
            title="Previous track (or -10s)"
          >
            <SkipBack size={26} className="text-slate-900 fill-slate-900 hover:scale-105 transition-transform" />
          </button>

          {/* Hero Play / Pause Button */}
          <button
            onClick={handlePlayPause}
            className="size-16 sm:size-17 rounded-full bg-white text-black border border-slate-200/90 shadow-[0_8px_24px_rgba(15,23,42,0.12)] active:scale-95 hover:scale-105 transition-all flex items-center justify-center cursor-pointer"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause size={28} className="fill-black text-black" />
            ) : (
              <Play size={28} className="fill-black text-black translate-x-0.5" />
            )}
          </button>

          {/* Skip Next Track */}
          <button
            onClick={handleNext}
            className="size-12 flex items-center justify-center active:scale-85 transition-transform cursor-pointer"
            aria-label="Forward 15 seconds"
            title="Next track (or +15s)"
          >
            <SkipForward size={26} className="text-slate-900 fill-slate-900 hover:scale-105 transition-transform" />
          </button>

          {/* Repeat Mode Toggle */}
          <button
            onClick={handleToggleRepeatMode}
            className="size-11 flex items-center justify-center active:scale-85 transition-transform cursor-pointer relative"
            aria-label="Toggle repeat mode"
            title={repeatMode === 'one' ? 'Repeat One' : repeatMode === 'all' ? 'Repeat All' : 'Repeat Off'}
          >
            {repeatMode === 'one' ? (
              <Repeat1 size={21} className="text-emerald-600" />
            ) : (
              <Repeat
                size={21}
                className={
                  repeatMode === 'all' ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-900 transition-colors'
                }
              />
            )}
            {repeatMode !== 'off' && (
              <span className="absolute -bottom-1 text-[8px] font-mono font-bold uppercase text-emerald-600">
                {repeatMode === 'one' ? '1' : 'ALL'}
              </span>
            )}
          </button>
        </div>

        {/* Refined Toolstrip: Zero Clutter, Zero Redundancy */}
        <div className="flex items-center justify-between gap-2 pt-2 text-slate-500">
          <div className="flex items-center gap-2">
            {/* Speed Pill: Tap cycles directly through 1.0x -> 1.25x -> 1.5x -> 2.0x */}
            <button
              onClick={handleCycleSpeed}
              className="py-1 px-3 rounded-full bg-white hover:bg-slate-100 border border-slate-200/90 text-xs font-mono font-semibold text-slate-800 transition-all active:scale-95 shadow-2xs cursor-pointer"
              title="Tap to cycle playback speed (1.0x, 1.25x, 1.5x, 2.0x)"
            >
              <span>{playbackSpeed}× Speed</span>
            </button>

            {/* A-B Loop Pill */}
            <button
              onClick={() => {
                bridge.triggerHaptic('light');
                setActiveModal('ab_loop');
              }}
              className={cn(
                'py-1 px-3 rounded-full border text-xs font-semibold transition-all active:scale-95 shadow-2xs flex items-center gap-1 cursor-pointer',
                abLoop?.enabled
                  ? 'bg-amber-50 border-amber-200 text-amber-800'
                  : 'bg-white hover:bg-slate-100 border-slate-200/90 text-slate-800'
              )}
              title="A-B Repeat Interval for memorization"
            >
              <BookmarkCheck size={12} className={abLoop?.enabled ? 'text-amber-600' : 'text-slate-400'} />
              <span>{abLoop?.enabled ? 'Loop On' : 'A⇄B Loop'}</span>
            </button>

            {/* Sleep Timer Pill */}
            <button
              onClick={() => {
                bridge.triggerHaptic('light');
                setActiveModal('sleep');
              }}
              className={cn(
                'py-1 px-3 rounded-full border text-xs font-semibold transition-all active:scale-95 shadow-2xs flex items-center gap-1 cursor-pointer',
                sleepTimerRemainingSeconds
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-white hover:bg-slate-100 border-slate-200/90 text-slate-800'
              )}
              title="Sleep timer"
            >
              <Timer size={12} className={sleepTimerRemainingSeconds ? 'text-emerald-600' : 'text-slate-400'} />
              <span>
                {sleepTimerRemainingSeconds
                  ? `${Math.ceil(sleepTimerRemainingSeconds / 60)}m`
                  : 'Sleep'}
              </span>
            </button>
          </div>

          {/* Sole Queue & Playlists Toggle (Right Icon) */}
          <button
            onClick={() => {
              bridge.triggerHaptic('light');
              setViewMode((prev) => (prev === 'queue' ? 'player' : 'queue'));
            }}
            className={`size-9 flex items-center justify-center active:scale-90 transition-all cursor-pointer rounded-full ${
              viewMode === 'queue'
                ? 'text-slate-900 bg-slate-200 border border-slate-300 shadow-xs'
                : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
            }`}
            aria-label="Queue and library"
            title="Toggle playlist and queue"
          >
            <ListMusic size={20} />
          </button>
        </div>
      </footer>

      {/* 5. LIGHT AESTHETIC STUDY TOOLS & OPTIONS MODAL SHEET */}
      {activeModal !== 'none' && (
        <ModalPortal>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="player-modal-title"
            className="fixed inset-0 z-[70] bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto safe-top safe-bottom animate-in fade-in duration-150"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setActiveModal('none');
              }
            }}
          >
            <div
              className="w-full max-w-sm sm:max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl p-4 sm:p-5 space-y-4 my-auto max-h-[85vh] overflow-y-auto animate-in zoom-in-95 duration-150 text-slate-900"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="size-8 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800">
                    {activeModal === 'ab_loop' && <BookmarkCheck size={16} className="text-amber-600" />}
                    {activeModal === 'sleep' && <Timer size={16} className="text-emerald-600" />}
                    {activeModal === 'speed' && <SlidersHorizontal size={16} />}
                    {activeModal === 'tools' && <MoreHorizontal size={16} />}
                  </div>
                  <div>
                    <h4 id="player-modal-title" className="text-sm font-bold text-slate-900 leading-tight">
                      {activeModal === 'ab_loop' && 'A⇄B Repeat Segment'}
                      {activeModal === 'sleep' && 'Sleep Timer'}
                      {activeModal === 'speed' && 'Playback Speed'}
                      {activeModal === 'tools' && 'Note Options & Tools'}
                    </h4>
                    <p className="text-[11px] text-slate-500 font-medium">
                      {activeModal === 'ab_loop' && 'Visual slider & selector for repeat interval'}
                      {activeModal === 'sleep' && 'Automatically pause when timer completes'}
                      {activeModal === 'speed' && 'Speed up or slow down narration'}
                      {activeModal === 'tools' && 'Fine-tune loop interval, timer & speed'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    bridge.triggerHaptic('light');
                    setActiveModal('none');
                  }}
                  className="size-8 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors cursor-pointer"
                  aria-label="Close dialog"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Modal Body: A-B Repeat Tool */}
              {(activeModal === 'ab_loop' || activeModal === 'tools') && (
                <LoopIntervalSelector
                  currentPosition={safePosition}
                  duration={safeDuration}
                  activeLoop={abLoop}
                  onSetLoop={(start, end) => {
                    bridge.triggerHaptic('medium');
                    onToggleABLoop(start, end);
                  }}
                  onClearLoop={() => {
                    bridge.triggerHaptic('medium');
                    onToggleABLoop(undefined, undefined);
                  }}
                  onSeek={(sec) => {
                    bridge.triggerHaptic('light');
                    onSeek(sec);
                  }}
                />
              )}

              {/* Modal Body: Sleep Timer */}
              {(activeModal === 'sleep' || activeModal === 'tools') && (
                <div className="space-y-2.5 pt-1">
                  <div className="flex items-center justify-between text-xs px-1">
                    <span className="font-semibold text-slate-700">Timer Presets</span>
                    <span className="text-[11px] font-mono text-emerald-700 font-bold">
                      {sleepTimerRemainingSeconds
                        ? `${Math.ceil(sleepTimerRemainingSeconds / 60)} min remaining`
                        : 'Off'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {timerOptions.map((opt, i) => {
                      const isSelected =
                        (opt.minutes === null && !sleepTimerRemainingSeconds) ||
                        (opt.minutes &&
                          sleepTimerRemainingSeconds &&
                          Math.abs(Math.ceil(sleepTimerRemainingSeconds / 60) - opt.minutes) <= 1);

                      return (
                        <button
                          key={i}
                          onClick={() => {
                            bridge.triggerHaptic('light');
                            onSetSleepTimer(opt.minutes);
                            setActiveModal('none');
                          }}
                          className={`py-2 px-2 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 shadow-2xs ${
                            isSelected
                              ? 'bg-slate-950 text-white shadow-sm font-black'
                              : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {isSelected && <Check size={12} />}
                          <span>{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Modal Body: Speed Presets (when speed modal is selected or in tools) */}
              {(activeModal === 'speed' || activeModal === 'tools') && (
                <div className="space-y-2.5 pt-1">
                  <div className="flex items-center justify-between text-xs px-1">
                    <span className="font-semibold text-slate-700">Speed Presets</span>
                    <span className="text-[11px] font-mono text-slate-600 font-bold">
                      {playbackSpeed}×
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    {speedCycleList.map((spd) => {
                      const isSelected = Math.abs(playbackSpeed - spd) < 0.05;
                      return (
                        <button
                          key={spd}
                          onClick={() => {
                            bridge.triggerHaptic('light');
                            onSetSpeed(spd);
                            setActiveModal('none');
                          }}
                          className={`py-2 px-2 rounded-2xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center justify-center gap-1 shadow-2xs ${
                            isSelected
                              ? 'bg-slate-950 text-white shadow-sm font-black'
                              : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {spd}×
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};
