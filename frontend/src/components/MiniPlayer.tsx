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
      <div className="pointer-events-auto bg-surface-850/95 backdrop-blur-lg border border-surface-700/80 rounded-2xl shadow-xl overflow-hidden transition-all hover:border-surface-600">
        {/* Thin top progress bar */}
        <div className="w-full bg-surface-800 h-1">
          <div
            className="bg-amber-400 h-full transition-all duration-200"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="p-3 flex items-center justify-between gap-3">
          {/* Audio Info & Expand */}
          <div
            className="flex-1 min-w-0 flex items-center gap-3 cursor-pointer select-none"
            onClick={onOpenFullScreen}
          >
            <div className="w-10 h-10 rounded-xl bg-surface-800 border border-surface-700 flex items-center justify-center text-amber-400 flex-shrink-0">
              <ChevronUp size={20} />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-amber-400/90 truncate uppercase tracking-wider">
                {currentAudio.subject_name || 'Study Audio'}
              </p>
              <h4 className="text-sm font-bold text-surface-50 truncate leading-snug">
                {currentAudio.title}
              </h4>
              <p className="text-[11px] text-surface-400 font-mono mt-0.5">
                {formatDuration(positionSeconds)} / {formatDuration(durationSeconds || currentAudio.duration_seconds)}
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={() => onSeekRelative(30)}
              className="p-2 text-surface-400 hover:text-surface-100 active:scale-95 transition-transform"
              title="Fast Forward 30s"
              aria-label="Fast forward 30 seconds"
            >
              <FastForward size={18} />
            </button>

            <button
              onClick={onTogglePlay}
              className="p-2.5 rounded-full bg-amber-500 text-surface-950 hover:bg-amber-400 active:scale-90 transition-transform shadow-md"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="translate-x-0.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
