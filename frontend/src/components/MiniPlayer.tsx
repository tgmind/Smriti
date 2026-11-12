import React, { useState } from 'react';
import {
  X,
  ListMusic
} from 'lucide-react';
import { AudioItem, PlaybackState } from '../types';
import { formatDuration } from '../services/learningEngine';

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

/**
 * Compact Music Player
 * Permanently docked above the Navigation bar in a black-white-modern slaty grey aesthetic.
 * Pressing on the player or its queue button directly opens the Full Screen Player.
 */
export const MiniPlayer: React.FC<MiniPlayerProps> = ({
  playbackState,
  audioQueue = [],
  onSeek,
  onOpenFullScreen,
  onCycleSpeed,
  onDismiss,
}) => {
  const {
    currentAudio,
    isPlaying,
    positionSeconds,
    durationSeconds,
    playbackSpeed
  } = playbackState;

  const [hoverTime, setHoverTime] = useState<{ x: number; time: string } | null>(null);
  const [scrubPosition, setScrubPosition] = useState<number | null>(null);

  if (!currentAudio) return null;

  // Safe duration and position calculations to prevent NaN or Infinity
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

  // Subject notes count in queue
  const currentSubId = currentAudio.subject_id;
  const currentSubName = (currentAudio.subject_name || '').toLowerCase();
  const subjectAudioList = audioQueue.filter((a) => {
    if (currentSubId && a.subject_id === currentSubId) return true;
    if (currentSubName && a.subject_name && a.subject_name.toLowerCase() === currentSubName) return true;
    return false;
  });
  const activeSubjectQueue = subjectAudioList.length > 0 ? subjectAudioList : audioQueue;

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
    setScrubPosition(null);
  };

  return (
    <div
      className="w-full bg-slate-950/98 backdrop-blur-2xl text-white select-none transition-all duration-200 border-b border-white/10"
      data-testid="compact-music-player"
    >
      <div className="w-full">
        {/* Main interactive bar: Pressing opens FullScreenPlayer */}
        <div
          className="pl-4 pr-3 py-2.5 flex items-center justify-between gap-3 cursor-pointer group/player"
          onClick={onOpenFullScreen}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              onOpenFullScreen();
            }
          }}
          title="Press to open full screen player"
          aria-label={`Open full screen player for ${currentAudio.title}`}
        >
          {/* Left: Track Metadata & Title */}
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <div className="flex items-center gap-2 min-w-0">
              <h4 className="text-[13px] sm:text-[13.5px] font-semibold text-white truncate leading-tight group-hover/player:text-slate-200 transition-colors tracking-tight">
                {currentAudio.title}
              </h4>
              {isPlaying && (
                <span
                  className="inline-flex items-end gap-0.5 h-2.5 w-2.5 shrink-0 text-slate-300 mb-0.5"
                  title="Playing"
                  aria-hidden="true"
                >
                  <span className="w-0.5 bg-slate-300 rounded-full animate-eq-1 h-full" />
                  <span className="w-0.5 bg-slate-300 rounded-full animate-eq-2 h-2/3" />
                  <span className="w-0.5 bg-slate-300 rounded-full animate-eq-3 h-4/5" />
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 font-medium leading-none mt-1">
              <span className="text-zinc-300 font-medium truncate">
                {currentAudio.subject_name || 'Academic Audio'}
              </span>
              <span className="text-zinc-600 font-bold">•</span>
              <span className="font-mono text-zinc-400 text-[10.5px] tracking-tight shrink-0">
                {formatDuration(currentDisplayPos)} / {formatDuration(safeDuration)}
              </span>
            </div>
          </div>

          {/* Right Action Cluster: Speed Pill + Queue Button (opens Full Screen) + Dismiss */}
          <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
            {/* Speed Pill */}
            {onCycleSpeed && (
              <button
                type="button"
                onClick={onCycleSpeed}
                className="px-2 py-0.5 rounded-lg border border-slate-700 bg-slate-900/90 hover:bg-slate-800 text-slate-200 font-mono text-[10px] font-bold active:scale-90 transition-all cursor-pointer shadow-2xs"
                title="Cycle playback speed"
                aria-label={`Playback speed ${playbackSpeed}x`}
              >
                {`${playbackSpeed}X`}
              </button>
            )}

            {/* Queue / Full Screen Player Trigger */}
            <button
              type="button"
              onClick={onOpenFullScreen}
              className="size-7 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 flex items-center justify-center active:scale-90 transition-all cursor-pointer relative"
              title={`Open full player & queue (${activeSubjectQueue.length} notes)`}
              aria-label="Open playlist queue"
            >
              <ListMusic size={15} />
              {activeSubjectQueue.length > 1 && (
                <span className="absolute -top-1 -right-1 size-3.5 rounded-full bg-slate-200 text-slate-950 text-[8px] font-mono font-bold flex items-center justify-center shadow-xs">
                  {activeSubjectQueue.length}
                </span>
              )}
            </button>

            {/* Dismiss Player Button */}
            {onDismiss && (
              <button
                type="button"
                onClick={onDismiss}
                className="size-7 rounded-full text-zinc-400 hover:text-rose-400 hover:bg-rose-500/20 flex items-center justify-center active:scale-90 transition-all cursor-pointer"
                title="Close player"
                aria-label="Close and dismiss player"
              >
                <X size={15} />
              </button>
            )}
          </div>
        </div>

        {/* Mid Separation of Navigation and Compact Player: Audio Progress Bar */}
        <div
          className="w-full relative py-1 cursor-pointer group/midprogress select-none"
          title="Tap or drag along mid separation to seek"
          aria-label="Seek progress bar"
          role="slider"
          aria-valuenow={Math.round(currentDisplayPos)}
          aria-valuemin={0}
          aria-valuemax={Math.round(safeDuration)}
          onMouseMove={handleScrubberMouseMove}
          onMouseLeave={() => setHoverTime(null)}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            handleSeekInternal(pct * safeDuration);
          }}
        >
          {/* Base Track */}
          <div className="relative w-full h-[2.5px] group-hover/midprogress:h-[3.5px] bg-white/[0.08] transition-all overflow-visible">
            {/* Luminous Modern Slate-White Progress Fill */}
            <div
              className="h-full bg-gradient-to-r from-slate-400 via-slate-200 to-white relative shadow-[0_0_8px_rgba(255,255,255,0.4)] transition-[width] duration-100"
              style={{ width: `${progressPercent}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 size-2 bg-white rounded-full shadow-[0_0_6px_rgba(255,255,255,0.9)] opacity-0 group-hover/midprogress:opacity-100 transition-opacity pointer-events-none" />
            </div>
          </div>

          {/* Hover Time Tooltip */}
          {hoverTime && (
            <div
              className="absolute -top-6 -translate-x-1/2 rounded bg-slate-900/95 backdrop-blur-sm px-1.5 py-0.5 text-[9px] font-mono text-slate-200 pointer-events-none z-30 shadow-md border border-white/10"
              style={{ left: `${hoverTime.x}px` }}
            >
              {hoverTime.time}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
