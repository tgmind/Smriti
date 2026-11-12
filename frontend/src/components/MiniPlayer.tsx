import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Play,
  Pause,
  X,
  ChevronDown,
  SkipBack,
  SkipForward,
  Repeat,
  Repeat1,
  MoreVertical,
  ListMusic,
  Download,
  Star,
  CheckCircle2,
  Atom,
  Binary,
  FlaskConical,
  Dna,
  Sparkles,
  Layers,
  BookOpen
} from 'lucide-react';
import { AudioItem, PlaybackState } from '../types';
import { formatDuration } from '../services/learningEngine';
import { BlueWaveDesign } from './ui/BlueWaveDesign';
import { Slider } from './ui/slider';

export interface MiniPlayerProps {
  playbackState: PlaybackState;
  audioQueue?: AudioItem[];
  initialSheetOpen?: boolean;
  onTogglePlay: () => void;
  onSeek?: (seconds: number) => void;
  onSeekRelative: (seconds: number) => void;
  onOpenFullScreen: () => void;
  onCycleSpeed?: () => void;
  onSetSpeed?: (speed: number) => void;
  onDismiss?: () => void;
  onSelectTrack?: (audio: AudioItem) => void;
  onNextTrack?: () => void;
  onPreviousTrack?: () => void;
  onToggleRepeat?: () => void;
  onToggleFavorite?: (audioId: string) => void;
  onToggleOffline?: (audio: AudioItem) => void;
}

const getSubjectVisual = (subjectName?: string) => {
  const name = (subjectName || '').toLowerCase();
  if (name.includes('phys')) {
    return {
      gradient: 'from-sky-500 via-indigo-500 to-blue-600',
      accentColor: '#0284c7',
      icon: Atom
    };
  }
  if (name.includes('math')) {
    return {
      gradient: 'from-amber-400 via-orange-500 to-amber-600',
      accentColor: '#d97706',
      icon: Binary
    };
  }
  if (name.includes('chem')) {
    return {
      gradient: 'from-rose-400 via-pink-500 to-rose-600',
      accentColor: '#e11d48',
      icon: FlaskConical
    };
  }
  if (name.includes('bio')) {
    return {
      gradient: 'from-emerald-400 via-teal-500 to-emerald-600',
      accentColor: '#059669',
      icon: Dna
    };
  }
  return {
    gradient: 'from-cyan-500 via-blue-600 to-indigo-600',
    accentColor: '#0284c7',
    icon: Sparkles
  };
};

export const MiniPlayer: React.FC<MiniPlayerProps> = ({
  playbackState,
  audioQueue = [],
  initialSheetOpen = false,
  onTogglePlay,
  onSeek,
  onSeekRelative,
  onOpenFullScreen,
  onCycleSpeed,
  onSetSpeed,
  onDismiss,
  onSelectTrack,
  onNextTrack,
  onPreviousTrack,
  onToggleRepeat,
  onToggleFavorite,
  onToggleOffline
}) => {
  const {
    currentAudio,
    isPlaying,
    positionSeconds,
    durationSeconds,
    playbackSpeed,
    isRepeatTrack,
    isRepeatQueue
  } = playbackState;

  const [isSheetOpen, setIsSheetOpen] = useState(initialSheetOpen);
  const [queueScope, setQueueScope] = useState<'subject' | 'all'>('subject');
  const [activeTrackForMenu, setActiveTrackForMenu] = useState<AudioItem | null>(null);
  const [hoverTime, setHoverTime] = useState<{ x: number; time: string } | null>(null);
  const [scrubPosition, setScrubPosition] = useState<number | null>(null);
  const [showOptionsPopup, setShowOptionsPopup] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock background scroll when the player sheet modal is expanded
  useEffect(() => {
    if (isSheetOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isSheetOpen]);

  if (!currentAudio) return null;

  // Safe duration and position calculations
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
  const progressPercent = Math.min(100, Math.max(0, (currentDisplayPos / safeDuration) * 100));

  const visual = getSubjectVisual(currentAudio.subject_name);
  const SubjectIcon = visual.icon;

  // Telegram-style Subject Architecture: Filter queue by the particular subject
  const currentSubId = currentAudio.subject_id;
  const currentSubName = (currentAudio.subject_name || '').toLowerCase();

  const subjectAudioList = audioQueue.filter((a) => {
    if (currentSubId && a.subject_id === currentSubId) return true;
    if (currentSubName && a.subject_name && a.subject_name.toLowerCase() === currentSubName) return true;
    return false;
  });

  const activeSubjectQueue = subjectAudioList.length > 0 ? subjectAudioList : audioQueue;
  const displayQueue = queueScope === 'subject' ? activeSubjectQueue : audioQueue;

  const handleScrubberMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetSec = pct * safeDuration;
    setHoverTime({ x: e.clientX - rect.left, time: formatDuration(targetSec) });
  };

  const handleSeekInternal = (seconds: number) => {
    if (onSeek) {
      onSeek(seconds);
    }
  };

  /* ─────────────────────────────────────────────────────────────
      SHEET MODAL CONTENT (Rendered via Portal to document.body)
      - No background blur (clean solid dark overlay)
      - Background scroll locked
      - Subject-scoped audio queue like Telegram
      - Interactive functional three dots track menu
      - Telegram cyan-blue seek slider
      - Preserved signature bottom blue wave design
     ───────────────────────────────────────────────────────────── */
  const sheetModalContent = isSheetOpen ? (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 select-none animate-in fade-in duration-200"
      onClick={() => {
        setIsSheetOpen(false);
        setActiveTrackForMenu(null);
      }}
      onWheel={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
    >
      <div
        className="w-full max-w-md mx-auto bg-white rounded-t-[32px] h-[86vh] max-h-[86vh] flex flex-col overflow-hidden shadow-2xl relative border-t border-slate-200 animate-in slide-in-from-bottom duration-250"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Grab Handle */}
        <div
          className="pt-3 pb-1.5 flex justify-center cursor-pointer"
          onClick={() => setIsSheetOpen(false)}
        >
          <div className="w-10 h-1.5 bg-slate-300 rounded-full hover:bg-slate-400 transition-colors" />
        </div>

        {/* Sheet Header */}
        <div className="px-5 py-2 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div
              className={`size-8.5 rounded-full bg-gradient-to-tr ${visual.gradient} text-white flex items-center justify-center shadow-xs shrink-0`}
            >
              <SubjectIcon size={15} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 leading-tight">
                {currentAudio.subject_name || 'Academic Audio'} Playlist
              </h3>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                {displayQueue.length} notes in {queueScope === 'subject' ? currentAudio.subject_name || 'this subject' : 'all subjects'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsSheetOpen(false)}
              className="size-8 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-all cursor-pointer"
              title="Minimize sheet"
              aria-label="Minimize sheet"
            >
              <ChevronDown size={18} />
            </button>
          </div>
        </div>

        {/* Telegram Scope Selector (Active Subject vs All Vault) */}
        <div className="px-4 py-2 bg-slate-50/90 border-b border-slate-150/70 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setQueueScope('subject')}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                queueScope === 'subject'
                  ? 'bg-[#24A1DE] text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-200/80 border border-slate-200/80'
              }`}
            >
              <BookOpen size={12} />
              <span>{currentAudio.subject_name || 'Subject'} ({activeSubjectQueue.length})</span>
            </button>

            <button
              onClick={() => setQueueScope('all')}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                queueScope === 'all'
                  ? 'bg-[#24A1DE] text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-200/80 border border-slate-200/80'
              }`}
            >
              <Layers size={12} />
              <span>All Notes ({audioQueue.length})</span>
            </button>
          </div>

          <span className="text-[10px] font-mono text-slate-400 shrink-0">
            Telegram Queue
          </span>
        </div>

        {/* Middle Section: Scrollable Playlist Queue (Image 2 & 3) */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100/80 px-3 py-1 overscroll-contain">
          {displayQueue.map((audio, index) => {
            const isActive = audio.id === currentAudio.id;
            return (
              <div
                key={audio.id || index}
                onClick={() => {
                  if (onSelectTrack) {
                    onSelectTrack(audio);
                  } else if (isActive) {
                    onTogglePlay();
                  }
                }}
                className={`flex items-center justify-between gap-3 p-2.5 rounded-2xl cursor-pointer transition-all ${
                  isActive
                    ? 'bg-sky-50/80 border-l-4 border-[#24A1DE] text-sky-950 shadow-2xs font-semibold'
                    : 'hover:bg-slate-50 text-slate-700'
                }`}
              >
                {/* Telegram Circular Blue Play Button with Download badge */}
                <div className="relative shrink-0">
                  <div
                    className={`size-10 rounded-full flex items-center justify-center text-white shadow-2xs transition-transform active:scale-95 ${
                      isActive && isPlaying
                        ? 'bg-slate-900'
                        : 'bg-[#24A1DE] hover:bg-[#1a8bc4]'
                    }`}
                  >
                    {isActive && isPlaying ? (
                      <div className="flex items-end justify-center gap-0.75 h-3.5 w-3.5">
                        <span className="w-0.75 bg-white rounded-full animate-eq-1" />
                        <span className="w-0.75 bg-white rounded-full animate-eq-2" />
                        <span className="w-0.75 bg-white rounded-full animate-eq-3" />
                      </div>
                    ) : (
                      <Play size={14} fill="currentColor" className="translate-x-0.5" />
                    )}
                  </div>

                  {/* Offline / Download Check Badge */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onToggleOffline) onToggleOffline(audio);
                    }}
                    className="absolute -bottom-1 -right-1 size-4 rounded-full bg-white shadow-xs flex items-center justify-center text-[#24A1DE] hover:scale-110 cursor-pointer"
                    title={audio.is_downloaded_offline ? 'Downloaded offline' : 'Download offline'}
                    aria-label="Toggle offline download"
                  >
                    {audio.is_downloaded_offline ? (
                      <CheckCircle2 size={10} className="text-emerald-600" />
                    ) : (
                      <Download size={10} strokeWidth={2.5} />
                    )}
                  </button>
                </div>

                {/* Track Title & Artist */}
                <div className="flex-1 min-w-0">
                  <h4
                    className={`text-xs truncate leading-snug ${
                      isActive ? 'font-bold text-slate-950' : 'font-semibold text-slate-800'
                    }`}
                  >
                    {audio.title}
                  </h4>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">
                    {audio.subject_name || 'Academic Audio'} •{' '}
                    {formatDuration(audio.duration_seconds || 60)}
                  </p>
                </div>

                {/* Functional Three Dots Button ⋮ */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveTrackForMenu(audio);
                  }}
                  className="size-8 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 flex items-center justify-center shrink-0 cursor-pointer active:scale-90 transition-transform"
                  title="Track options & details"
                  aria-label="Open track menu"
                >
                  <MoreVertical size={16} />
                </button>
              </div>
            );
          })}
        </div>

        {/* Bottom Docked Section: Player Controls with PRESERVED BLUE WAVY DESIGN */}
        <div className="relative pt-3 pb-6 px-5 bg-gradient-to-b from-white via-white to-sky-50/80 border-t border-slate-150 overflow-hidden shrink-0">
          {/* Preserved Signature Blue Wavy Design (Image 5 & Reference) */}
          <BlueWaveDesign
            variant="full"
            isPlaying={isPlaying}
            className="absolute bottom-0 left-0 right-0 h-36 pointer-events-none z-0 opacity-70"
          />

          <div className="relative z-10 space-y-3">
            {/* Title & Artist */}
            <div className="text-center px-2">
              <h3 className="text-sm font-bold text-slate-950 truncate leading-snug">
                {currentAudio.title}
              </h3>
              <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                {currentAudio.subject_name || 'Academic Audio'}
              </p>
            </div>

            {/* Scrubber Progress Slider (Clean Telegram Cyan-Blue styling) */}
            <div className="space-y-1">
              <Slider
                value={currentDisplayPos}
                max={safeDuration}
                step={1}
                rangeClassName="bg-[#24A1DE]"
                thumbClassName="border-[#24A1DE] focus-visible:ring-[#24A1DE]/25"
                onChange={(val: number) => setScrubPosition(val)}
                onCommit={(val: number) => {
                  setScrubPosition(null);
                  handleSeekInternal(val);
                }}
                formatTooltip={(val: number) => formatDuration(val)}
                className="w-full py-1 cursor-pointer"
              />
              <div className="flex justify-between items-center text-[11px] font-mono text-slate-500 px-0.5">
                <span>{formatDuration(safePosition)}</span>
                <span>{formatDuration(safeDuration)}</span>
              </div>
            </div>

            {/* Controls Row (Repeat, Previous, Play/Pause, Next, More) */}
            <div className="flex items-center justify-between px-2 pt-0.5">
              {/* Repeat / Shuffle Toggle */}
              <button
                onClick={onToggleRepeat}
                className={`size-10 rounded-full flex items-center justify-center active:scale-90 transition-all cursor-pointer ${
                  isRepeatTrack || isRepeatQueue
                    ? 'text-[#24A1DE] bg-sky-50'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
                title={
                  isRepeatTrack
                    ? 'Repeat Track'
                    : isRepeatQueue
                    ? 'Repeat Queue'
                    : 'Repeat Off'
                }
              >
                {isRepeatTrack ? (
                  <Repeat1 size={19} />
                ) : isRepeatQueue ? (
                  <Repeat size={19} />
                ) : (
                  <Repeat size={19} className="opacity-40" />
                )}
              </button>

              {/* Previous Track */}
              <button
                onClick={() => {
                  if (onPreviousTrack) {
                    onPreviousTrack();
                  } else {
                    onSeekRelative(-10);
                  }
                }}
                className="size-11 rounded-full text-slate-700 hover:text-slate-950 hover:bg-slate-100 flex items-center justify-center active:scale-90 transition-all cursor-pointer"
                title="Previous Track"
                aria-label="Previous Track"
              >
                <SkipBack size={22} fill="currentColor" />
              </button>

              {/* Hero Play/Pause Button */}
              <button
                onClick={onTogglePlay}
                className={`size-14 rounded-full text-white shadow-lg active:scale-95 transition-all flex items-center justify-center cursor-pointer ${
                  isPlaying
                    ? 'bg-slate-950 hover:bg-slate-900 shadow-slate-950/20'
                    : 'bg-[#24A1DE] hover:bg-[#1a8bc4] shadow-[#24A1DE]/30'
                }`}
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause size={22} fill="currentColor" />
                ) : (
                  <Play size={22} fill="currentColor" className="translate-x-0.5" />
                )}
              </button>

              {/* Next Track */}
              <button
                onClick={() => {
                  if (onNextTrack) {
                    onNextTrack();
                  } else {
                    onSeekRelative(15);
                  }
                }}
                className="size-11 rounded-full text-slate-700 hover:text-slate-950 hover:bg-slate-100 flex items-center justify-center active:scale-90 transition-all cursor-pointer"
                title="Next Track"
                aria-label="Next Track"
              >
                <SkipForward size={22} fill="currentColor" />
              </button>

              {/* Options Menu Toggle */}
              <button
                onClick={() => setShowOptionsPopup((prev) => !prev)}
                className="size-10 rounded-full text-slate-400 hover:text-slate-700 flex items-center justify-center active:scale-90 transition-all cursor-pointer"
                title="Player options"
              >
                <MoreVertical size={19} />
              </button>
            </div>

            {/* Quick Options Popover (Speed, A-B repeat, Sleep) */}
            {showOptionsPopup && (
              <div className="p-3 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-lg text-xs space-y-2 animate-in fade-in duration-150">
                <div className="flex items-center justify-between text-slate-700 font-semibold">
                  <span>Speed Presets</span>
                  <span className="font-mono text-[#24A1DE] font-bold">{playbackSpeed}x</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5 font-mono font-bold">
                  {[1.0, 1.25, 1.5, 2.0].map((spd) => (
                    <button
                      key={spd}
                      onClick={() => {
                        if (onSetSpeed) onSetSpeed(spd);
                        setShowOptionsPopup(false);
                      }}
                      className={`py-1 rounded-xl text-xs transition-all ${
                        playbackSpeed === spd
                          ? 'bg-[#24A1DE] text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Primary Telegram-Style Pill Action Button (Matches Image 2 & 3) */}
            <div className="pt-1">
              <button
                onClick={() => {
                  setIsSheetOpen(false);
                  onOpenFullScreen();
                }}
                className="w-full py-3 rounded-2xl bg-[#24A1DE] hover:bg-[#1a8bc4] text-white font-semibold text-xs transition-all active:scale-98 shadow-md shadow-[#24A1DE]/25 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles size={16} />
                <span>Study Mode • Full Screen Player</span>
              </button>
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            INTERACTIVE TRACK ACTIONS MENU MODAL (Functional Three Dots)
           ───────────────────────────────────────────────────────────── */}
        {activeTrackForMenu && (
          <div
            className="absolute inset-0 z-30 bg-slate-950/50 flex flex-col justify-end animate-in fade-in duration-150"
            onClick={() => setActiveTrackForMenu(null)}
          >
            <div
              className="bg-white rounded-t-3xl p-4 space-y-3 shadow-2xl border-t border-slate-200 animate-in slide-in-from-bottom-2 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                <div className="min-w-0 flex-1 pr-2">
                  <span className="text-[10px] font-mono font-bold uppercase text-[#24A1DE] tracking-wider block">
                    {activeTrackForMenu.subject_name || 'Academic'}
                  </span>
                  <h4 className="text-xs font-bold text-slate-900 truncate mt-0.5">
                    {activeTrackForMenu.title}
                  </h4>
                </div>
                <button
                  onClick={() => setActiveTrackForMenu(null)}
                  className="size-7 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 gap-1.5 pt-1">
                {/* 1. Play Immediately */}
                <button
                  onClick={() => {
                    if (onSelectTrack) onSelectTrack(activeTrackForMenu);
                    setActiveTrackForMenu(null);
                  }}
                  className="w-full p-2.5 rounded-xl bg-slate-50 hover:bg-sky-50 text-slate-800 hover:text-[#24A1DE] flex items-center gap-3 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Play size={16} className="text-[#24A1DE]" fill="currentColor" />
                  <span>Play This Note Now</span>
                </button>

                {/* 2. Toggle Favorite */}
                <button
                  onClick={() => {
                    if (onToggleFavorite) onToggleFavorite(activeTrackForMenu.id);
                    setActiveTrackForMenu((prev) =>
                      prev ? { ...prev, is_favorite: !prev.is_favorite } : null
                    );
                  }}
                  className="w-full p-2.5 rounded-xl bg-slate-50 hover:bg-amber-50 text-slate-800 hover:text-amber-700 flex items-center gap-3 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Star
                    size={16}
                    className={activeTrackForMenu.is_favorite ? 'text-amber-500 fill-amber-500' : 'text-slate-400'}
                  />
                  <span>
                    {activeTrackForMenu.is_favorite ? 'Remove from Favorites' : 'Add to Favorites'}
                  </span>
                </button>

                {/* 3. Toggle Offline Cache */}
                <button
                  onClick={() => {
                    if (onToggleOffline) onToggleOffline(activeTrackForMenu);
                    setActiveTrackForMenu((prev) =>
                      prev ? { ...prev, is_downloaded_offline: !prev.is_downloaded_offline } : null
                    );
                  }}
                  className="w-full p-2.5 rounded-xl bg-slate-50 hover:bg-emerald-50 text-slate-800 hover:text-emerald-700 flex items-center gap-3 text-xs font-semibold transition-colors cursor-pointer"
                >
                  {activeTrackForMenu.is_downloaded_offline ? (
                    <CheckCircle2 size={16} className="text-emerald-600" />
                  ) : (
                    <Download size={16} className="text-[#24A1DE]" />
                  )}
                  <span>
                    {activeTrackForMenu.is_downloaded_offline
                      ? 'Available Offline (Stored in Vault)'
                      : 'Download Note for 100% Offline Access'}
                  </span>
                </button>
              </div>

              {/* Key Concept Chips if available */}
              {activeTrackForMenu.key_terms && activeTrackForMenu.key_terms.length > 0 && (
                <div className="pt-1 border-t border-slate-100">
                  <span className="text-[10px] text-slate-400 font-mono block mb-1">
                    Key Concepts:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {activeTrackForMenu.key_terms.map((term, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-medium"
                      >
                        {term}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  ) : null;

  return (
    <>
      {/* ─────────────────────────────────────────────────────────────
          1. TELEGRAM-STYLE COMPACT PLAYER BAR
          Attached beautifully right above the bottom navigation bar
          in the same curvy design (not too rounded corners)
         ───────────────────────────────────────────────────────────── */}
      <div className="w-full select-none pointer-events-auto transition-all duration-200">
        <div className="w-full relative group bg-slate-950/95 text-white">
          {/* Top Interactive Progress Scrubber Line */}
          <div
            className="w-full bg-white/10 hover:bg-white/20 h-1 cursor-pointer relative group/scrubber transition-colors"
            title="Tap or drag to seek"
            onMouseMove={handleScrubberMouseMove}
            onMouseLeave={() => setHoverTime(null)}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
              handleSeekInternal(pct * safeDuration);
            }}
          >
            <div
              className="bg-[#24A1DE] h-full transition-[width] duration-100"
              style={{ width: `${progressPercent}%` }}
            />

            {/* Hover Scrub Tooltip */}
            {hoverTime && (
              <div
                className="absolute -top-6 -translate-x-1/2 rounded bg-slate-900 px-1.5 py-0.5 text-[9px] font-mono text-white pointer-events-none z-30 shadow-xs border border-white/10"
                style={{ left: `${hoverTime.x}px` }}
              >
                {hoverTime.time}
              </div>
            )}

            {/* Hover thumb */}
            <div
              className="absolute top-1/2 -translate-y-1/2 size-2 rounded-full bg-[#24A1DE] opacity-0 group-hover/scrubber:opacity-100 transition-opacity pointer-events-none -translate-x-1/2 shadow-xs"
              style={{ left: `${progressPercent}%` }}
            />
          </div>

          {/* Main Bar Content */}
          <div className="py-2 px-3 flex items-center justify-between gap-2.5">
            {/* Left: Telegram-Style Circular Blue Play/Pause Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTogglePlay();
              }}
              className={`size-9 rounded-full text-white active:scale-90 transition-transform shadow-xs flex items-center justify-center shrink-0 cursor-pointer ${
                isPlaying
                  ? 'bg-slate-800 hover:bg-slate-700 shadow-slate-900/30'
                  : 'bg-[#24A1DE] hover:bg-[#1a8bc4] shadow-[#24A1DE]/30'
              }`}
              aria-label={isPlaying ? 'Pause' : 'Play'}
              title={isPlaying ? 'Pause audio' : 'Play audio'}
            >
              {isPlaying ? (
                <div className="flex items-end justify-center gap-0.75 h-3.5 w-3.5">
                  <span className="w-0.75 bg-white rounded-full animate-eq-1" />
                  <span className="w-0.75 bg-white rounded-full animate-eq-2" />
                  <span className="w-0.75 bg-white rounded-full animate-eq-3" />
                </div>
              ) : (
                <Play size={14} fill="currentColor" className="translate-x-0.5 text-white" />
              )}
            </button>

            {/* Center: Track Metadata & Title (Tap to expand Telegram sheet) */}
            <div
              className="flex-1 min-w-0 cursor-pointer group/title flex flex-col justify-center"
              onClick={() => setIsSheetOpen(true)}
              title="Tap to view playlist and full player"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <h4 className="text-xs font-bold text-white truncate leading-tight group-hover/title:text-[#24A1DE] transition-colors">
                  {currentAudio.title}
                </h4>
              </div>

              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium leading-none mt-1">
                <span className="text-sky-300 font-semibold truncate">
                  {currentAudio.subject_name || 'Academic Audio'}
                </span>
                <span className="text-slate-600">•</span>
                <span className="font-mono text-slate-400 shrink-0">
                  {formatDuration(safePosition)} / {formatDuration(safeDuration)}
                </span>
              </div>
            </div>

            {/* Right Action Cluster: Telegram Speed Pill + Queue Expand + Dismiss */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Telegram-style Speed Pill (1X, 1.25X, 1.5X, 2X) */}
              {onCycleSpeed && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCycleSpeed();
                  }}
                  className="px-2 py-0.5 rounded-lg border border-[#24A1DE]/40 bg-[#24A1DE]/15 hover:bg-[#24A1DE]/25 text-sky-300 font-mono text-[10px] font-bold active:scale-90 transition-all cursor-pointer shadow-2xs"
                  title="Cycle playback speed"
                  aria-label={`Playback speed ${playbackSpeed}x`}
                >
                  {`${playbackSpeed}X`}
                </button>
              )}

              {/* Playlist Sheet Expand Button with Subject Notes Count */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsSheetOpen(true);
                }}
                className="size-7 rounded-full text-slate-300 hover:text-white hover:bg-white/10 flex items-center justify-center active:scale-90 transition-all cursor-pointer relative"
                title={`Open ${currentAudio.subject_name || 'subject'} playlist (${activeSubjectQueue.length} notes)`}
                aria-label="Open playlist queue"
              >
                <ListMusic size={15} />
                {activeSubjectQueue.length > 1 && (
                  <span className="absolute -top-1 -right-1 size-3.5 rounded-full bg-[#24A1DE] text-white text-[8px] font-mono font-bold flex items-center justify-center">
                    {activeSubjectQueue.length}
                  </span>
                )}
              </button>

              {/* Dismiss Player Button */}
              {onDismiss && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDismiss();
                  }}
                  className="size-7 rounded-full text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 flex items-center justify-center active:scale-90 transition-all cursor-pointer"
                  title="Close player"
                  aria-label="Close and dismiss player"
                >
                  <X size={15} />
                </button>
              )}
            </div>
          </div>

          {/* Preserve the Blue Wavy Design: Subtle bottom micro-wave accent */}
          <BlueWaveDesign variant="compact" isPlaying={isPlaying} />
        </div>
      </div>

      {/* Render the expandable Telegram sheet via Portal to body or inline fallback */}
      {mounted && typeof document !== 'undefined'
        ? createPortal(sheetModalContent, document.body)
        : sheetModalContent}
    </>
  );
};
