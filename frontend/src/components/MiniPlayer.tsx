import React, { useState } from 'react';
import { Play, Pause, X, Atom, Binary, FlaskConical, Dna, Sparkles } from 'lucide-react';
import { PlaybackState } from '../types';
import { formatDuration } from '../services/learningEngine';

interface MiniPlayerProps {
  playbackState: PlaybackState;
  onTogglePlay: () => void;
  onSeek?: (seconds: number) => void;
  onSeekRelative: (seconds: number) => void;
  onOpenFullScreen: () => void;
  onCycleSpeed?: () => void;
  onDismiss?: () => void;
}

const getSubjectVisual = (subjectName?: string) => {
  const name = (subjectName || '').toLowerCase();
  if (name.includes('phys')) {
    return {
      gradient: 'from-sky-500 via-indigo-500 to-blue-600',
      shadow: 'shadow-sky-500/25',
      icon: Atom
    };
  }
  if (name.includes('math')) {
    return {
      gradient: 'from-amber-400 via-orange-500 to-amber-600',
      shadow: 'shadow-amber-500/25',
      icon: Binary
    };
  }
  if (name.includes('chem')) {
    return {
      gradient: 'from-rose-400 via-pink-500 to-rose-600',
      shadow: 'shadow-rose-500/25',
      icon: FlaskConical
    };
  }
  if (name.includes('bio')) {
    return {
      gradient: 'from-emerald-400 via-teal-500 to-emerald-600',
      shadow: 'shadow-emerald-500/25',
      icon: Dna
    };
  }
  return {
    gradient: 'from-cyan-500 via-blue-600 to-indigo-600',
    shadow: 'shadow-blue-500/25',
    icon: Sparkles
  };
};

export const MiniPlayer: React.FC<MiniPlayerProps> = ({
  playbackState,
  onTogglePlay,
  onSeek,
  onOpenFullScreen,
  onCycleSpeed,
  onDismiss
}) => {
  const { currentAudio, isPlaying, positionSeconds, durationSeconds, playbackSpeed } = playbackState;
  const [hoverTime, setHoverTime] = useState<{ x: number; time: string } | null>(null);

  if (!currentAudio) return null;

  // Safe finite duration and position
  const safeDuration = (typeof durationSeconds === 'number' && Number.isFinite(durationSeconds) && durationSeconds > 0)
    ? durationSeconds
    : (currentAudio.duration_seconds && Number.isFinite(currentAudio.duration_seconds) && currentAudio.duration_seconds > 0)
      ? currentAudio.duration_seconds
      : 60;

  const safePosition = (typeof positionSeconds === 'number' && Number.isFinite(positionSeconds) && positionSeconds >= 0)
    ? positionSeconds
    : 0;

  const progressPercent = Math.min(100, Math.max(0, (safePosition / safeDuration) * 100));
  const visual = getSubjectVisual(currentAudio.subject_name);
  const SubjectIcon = visual.icon;

  const handleScrubberMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetSec = pct * safeDuration;
    setHoverTime({ x: e.clientX - rect.left, time: formatDuration(targetSec) });
  };

  return (
    <div className="fixed bottom-[74px] sm:bottom-[80px] left-0 right-0 z-30 px-3 max-w-sm sm:max-w-md mx-auto pointer-events-none animate-in slide-in-from-bottom-3 duration-200">
      <div className="pointer-events-auto bg-white/95 backdrop-blur-2xl border border-slate-200/90 rounded-2xl sm:rounded-3xl shadow-[0_12px_36px_rgba(0,0,0,0.1)] overflow-hidden transition-all hover:border-slate-300 select-none">
        {/* Top Interactive Progress Line */}
        <div
          className="w-full bg-slate-100 hover:bg-slate-200/80 h-1.5 cursor-pointer relative group transition-colors"
          title="Tap or drag to seek"
          onMouseMove={handleScrubberMouseMove}
          onMouseLeave={() => setHoverTime(null)}
          onClick={(e) => {
            if (!onSeek) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            onSeek(pct * safeDuration);
          }}
        >
          <div
            className="bg-gradient-to-r from-sky-500 to-indigo-500 h-full transition-[width] duration-100 rounded-r-full"
            style={{ width: `${progressPercent}%` }}
          />

          {/* Hover Scrub Tooltip */}
          {hoverTime && (
            <div
              className="absolute -top-6 -translate-x-1/2 rounded bg-slate-900 px-1.5 py-0.5 text-[9px] font-mono text-white pointer-events-none z-20 shadow-xs"
              style={{ left: `${hoverTime.x}px` }}
            >
              {hoverTime.time}
            </div>
          )}

          {/* Hover thumb */}
          <div
            className="absolute top-1/2 -translate-y-1/2 size-2 rounded-full bg-slate-900 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none -translate-x-1/2 shadow-xs"
            style={{ left: `${progressPercent}%` }}
          />
        </div>

        {/* Card Body */}
        <div className="p-2 sm:p-2.5 px-3 flex items-center justify-between gap-2.5">
          {/* Circular Vinyl Art & Title Container (Expand on tap) */}
          <div
            className="flex-1 min-w-0 flex items-center gap-2.5 cursor-pointer group"
            onClick={onOpenFullScreen}
          >
            {/* Circular Subject Disc (Inspired by Reference Image album art) */}
            <div
              className={`size-10 rounded-full bg-gradient-to-tr ${visual.gradient} shadow-md ${visual.shadow} flex items-center justify-center text-white shrink-0 relative overflow-hidden transition-transform group-hover:scale-105`}
            >
              {/* Concentric vinyl groove effect */}
              <div className="absolute inset-1.5 rounded-full border border-white/20" />
              <div className="absolute inset-3 rounded-full border border-white/20" />
              <div className="relative z-10 size-4 rounded-full bg-slate-950/40 backdrop-blur-xs flex items-center justify-center">
                <SubjectIcon size={10} className="text-white" />
              </div>
            </div>

            {/* Title & Subject Info */}
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-bold text-slate-900 truncate leading-snug group-hover:text-blue-600 transition-colors">
                {currentAudio.title}
              </h4>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium leading-none mt-0.5">
                <span className="text-slate-700 font-semibold truncate">
                  {currentAudio.subject_name || 'Academic Audio'}
                </span>
                <span className="text-slate-300">•</span>
                <span className="font-mono text-slate-500 shrink-0">
                  {formatDuration(safePosition)} / {formatDuration(safeDuration)}
                </span>
              </div>
            </div>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-1 shrink-0">
            {onCycleSpeed && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCycleSpeed();
                }}
                className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200/80 text-[10px] font-mono font-bold text-slate-700 active:scale-90 transition-all cursor-pointer shadow-2xs"
                title="Cycle playback speed"
                aria-label={`Playback speed ${playbackSpeed}x`}
              >
                {playbackSpeed}x
              </button>
            )}

            {/* Play / Pause Button */}
            <button
              onClick={onTogglePlay}
              className={`size-9 rounded-full text-white active:scale-90 transition-all shadow-sm cursor-pointer flex items-center justify-center ${
                isPlaying
                  ? 'bg-slate-950 hover:bg-slate-900'
                  : 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/20'
              }`}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause size={14} fill="currentColor" />
              ) : (
                <Play size={14} fill="currentColor" className="translate-x-0.5" />
              )}
            </button>

            {/* Dismiss Player Button */}
            {onDismiss && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDismiss();
                }}
                className="size-7 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center active:scale-90 transition-all cursor-pointer"
                title="Close player"
                aria-label="Close and dismiss player"
              >
                <X size={15} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
