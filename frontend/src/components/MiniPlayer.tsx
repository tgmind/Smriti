import React from 'react';
import { Play, Pause, FastForward, RotateCcw, ChevronUp } from 'lucide-react';
import { PlaybackState } from '../types';
import { formatDuration } from '../services/learningEngine';

interface MiniPlayerProps {
  playbackState: PlaybackState;
  onTogglePlay: () => void;
  onSeek?: (seconds: number) => void;
  onSeekRelative: (seconds: number) => void;
  onOpenFullScreen: () => void;
  onCycleSpeed?: () => void;
}

export const MiniPlayer: React.FC<MiniPlayerProps> = ({
  playbackState,
  onTogglePlay,
  onSeek,
  onSeekRelative,
  onOpenFullScreen,
  onCycleSpeed
}) => {
  const { currentAudio, isPlaying, positionSeconds, durationSeconds } = playbackState;

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

  return (
    <div className="fixed bottom-20 left-0 right-0 z-30 px-3 pb-1 max-w-md mx-auto pointer-events-none animate-in slide-in-from-bottom-2 duration-200">
      <div className="pointer-events-auto bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.08)] overflow-hidden transition-all hover:border-slate-300">
        {/* Interactive Top Scrub / Progress Bar */}
        <div
          className="w-full bg-slate-100 hover:bg-slate-200/80 h-1.5 cursor-pointer relative group transition-colors select-none"
          title="Tap or drag to seek"
          onClick={(e) => {
            if (!onSeek) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            onSeek(pct * safeDuration);
          }}
        >
          <div
            className="bg-emerald-500 h-full transition-all duration-100 rounded-r-full"
            style={{ width: `${progressPercent}%` }}
          />
          {/* Thumb indicator on hover */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-slate-900 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none -translate-x-1/2 shadow-xs"
            style={{ left: `${progressPercent}%` }}
          />
        </div>

        <div className="p-3 flex items-center justify-between gap-3">
          {/* Audio Info & Expand Target */}
          <div
            className="flex-1 min-w-0 flex items-center gap-3 cursor-pointer select-none group"
            onClick={onOpenFullScreen}
          >
            <div className="w-9 h-9 rounded-xl bg-slate-100 group-hover:bg-slate-200 border border-slate-200 flex items-center justify-center text-slate-700 flex-shrink-0 shadow-2xs transition-colors">
              <ChevronUp size={18} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider font-mono">
                  {currentAudio.subject_name || 'Study Audio'}
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {formatDuration(safePosition)} / {formatDuration(safeDuration)}
                </span>
              </div>
              <h4 className="text-xs font-bold text-slate-900 truncate leading-tight mt-0.5 group-hover:text-emerald-700 transition-colors">
                {currentAudio.title}
              </h4>
            </div>
          </div>

          {/* Player Controls */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {onCycleSpeed && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCycleSpeed();
                }}
                className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-[10px] font-mono font-bold text-slate-700 active:scale-90 transition-all shadow-2xs cursor-pointer"
                title="Cycle playback speed"
                aria-label={`Playback speed ${playbackState.playbackSpeed}x`}
              >
                {playbackState.playbackSpeed}x
              </button>
            )}

            <button
              onClick={() => onSeekRelative(-10)}
              className="p-1.5 text-slate-400 hover:text-slate-800 active:scale-90 transition-transform cursor-pointer"
              title="Rewind 10s"
              aria-label="Rewind 10 seconds"
            >
              <RotateCcw size={15} />
            </button>

            <button
              onClick={() => onSeekRelative(15)}
              className="p-1.5 text-slate-400 hover:text-slate-800 active:scale-90 transition-transform cursor-pointer"
              title="Forward 15s"
              aria-label="Fast forward 15 seconds"
            >
              <FastForward size={16} />
            </button>

            <button
              onClick={onTogglePlay}
              className={`p-2.5 rounded-full text-white active:scale-90 transition-transform shadow-xs cursor-pointer ${
                isPlaying ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-slate-900 hover:bg-slate-800'
              }`}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause size={15} fill="currentColor" />
              ) : (
                <Play size={15} fill="currentColor" className="translate-x-0.5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
