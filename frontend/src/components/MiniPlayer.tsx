import React from 'react';
import { Play, Pause, FastForward, ChevronUp } from 'lucide-react';
import { PlaybackState } from '../types';
import { formatDuration } from '../services/learningEngine';

interface MiniPlayerProps {
  playbackState: PlaybackState;
  onTogglePlay: () => void;
  onSeekRelative: (seconds: number) => void;
  onOpenFullScreen: () => void;
}

export const MiniPlayer: React.FC<MiniPlayerProps> = ({
  playbackState,
  onTogglePlay,
  onSeekRelative,
  onOpenFullScreen
}) => {
  const { currentAudio, isPlaying, positionSeconds, durationSeconds } = playbackState;

  if (!currentAudio) return null;

  const progressPercent = durationSeconds > 0 ? (positionSeconds / durationSeconds) * 100 : 0;

  return (
    <div className="fixed bottom-16 left-0 right-0 z-30 px-3 pb-2 max-w-md mx-auto pointer-events-none">
      <div className="pointer-events-auto bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-2xl shadow-[0_6px_24px_rgba(0,0,0,0.07)] overflow-hidden transition-all hover:border-slate-300">
        {/* Thin top scrub/progress indicator */}
        <div className="w-full bg-slate-100 h-1">
          <div
            className="bg-amber-500 h-full transition-all duration-200"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="p-3 flex items-center justify-between gap-3">
          {/* Audio Info & Expand Target */}
          <div
            className="flex-1 min-w-0 flex items-center gap-3 cursor-pointer select-none"
            onClick={onOpenFullScreen}
          >
            <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 flex-shrink-0 shadow-2xs">
              <ChevronUp size={18} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider font-mono">
                  {currentAudio.subject_name || 'Study Audio'}
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {formatDuration(positionSeconds)} / {formatDuration(durationSeconds || currentAudio.duration_seconds)}
                </span>
              </div>
              <h4 className="text-xs font-bold text-slate-900 truncate leading-tight mt-0.5">
                {currentAudio.title}
              </h4>
            </div>
          </div>

          {/* Player Controls */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => onSeekRelative(30)}
              className="p-2 text-slate-400 hover:text-slate-800 active:scale-95 transition-transform"
              title="Forward 30s"
              aria-label="Fast forward 30 seconds"
            >
              <FastForward size={16} />
            </button>

            <button
              onClick={onTogglePlay}
              className="p-2 rounded-full bg-slate-900 text-white hover:bg-slate-800 active:scale-90 transition-transform shadow-xs"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause size={16} fill="currentColor" />
              ) : (
                <Play size={16} fill="currentColor" className="translate-x-0.5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
