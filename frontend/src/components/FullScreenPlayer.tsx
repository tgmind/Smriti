import React, { useState } from 'react';
import {
  ChevronDown,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Repeat,
  Repeat1,
  Timer,
  Star,
  Download,
  CheckCircle2,
  Gauge,
  BookmarkCheck
} from 'lucide-react';
import { AudioItem, PlaybackState } from '../types';
import { formatDuration } from '../services/learningEngine';
import { Slider } from './ui/slider';
import { Badge } from './ui/badge';

interface FullScreenPlayerProps {
  playbackState: PlaybackState;
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
}

type ActiveToolPanel = 'none' | 'speed' | 'ab_loop' | 'sleep';

export const FullScreenPlayer: React.FC<FullScreenPlayerProps> = ({
  playbackState,
  onClose,
  onTogglePlay,
  onSeek,
  onSeekRelative,
  onSetSpeed,
  onToggleRepeat,
  onToggleABLoop,
  onSetSleepTimer,
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
    isRepeatQueue,
    abLoop,
    sleepTimerRemainingSeconds
  } = playbackState;

  const [activePanel, setActivePanel] = useState<ActiveToolPanel>('none');
  const [scrubPosition, setScrubPosition] = useState<number | null>(null);

  if (!currentAudio) return null;

  // Strict finite duration and position
  const safeDuration = (typeof durationSeconds === 'number' && Number.isFinite(durationSeconds) && durationSeconds > 0)
    ? durationSeconds
    : (currentAudio.duration_seconds && Number.isFinite(currentAudio.duration_seconds) && currentAudio.duration_seconds > 0)
      ? currentAudio.duration_seconds
      : 60;

  const safePosition = (typeof positionSeconds === 'number' && Number.isFinite(positionSeconds) && positionSeconds >= 0)
    ? positionSeconds
    : 0;

  const currentDisplayPos = scrubPosition !== null ? scrubPosition : safePosition;
  const remainingSeconds = Math.max(0, safeDuration - currentDisplayPos);

  const speedOptions = [0.75, 1.0, 1.25, 1.5, 2.0];
  const timerOptions = [
    { label: 'Off', minutes: null },
    { label: '5 min', minutes: 5 },
    { label: '15 min', minutes: 15 },
    { label: '30 min', minutes: 30 },
    { label: '45 min', minutes: 45 },
    { label: '60 min', minutes: 60 }
  ];

  const peaks = currentAudio.waveform_peaks && currentAudio.waveform_peaks.length > 0
    ? currentAudio.waveform_peaks
    : [25, 45, 65, 80, 50, 75, 90, 60, 40, 70, 85, 75, 55, 45, 65, 85, 70, 50, 35, 45, 60, 75, 90, 65, 45, 55, 70, 85];

  const loopRange = abLoop?.enabled ? {
    startPercent: (abLoop.startSeconds / safeDuration) * 100,
    endPercent: (abLoop.endSeconds / safeDuration) * 100
  } : null;

  const togglePanel = (panel: ActiveToolPanel) => {
    setActivePanel(prev => prev === panel ? 'none' : panel);
  };

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col justify-between h-[100dvh] max-h-[100dvh] overflow-hidden safe-top safe-bottom p-4 sm:p-6 text-slate-900 select-none animate-in fade-in duration-150">
      {/* 1. Top Header */}
      <header className="flex items-center justify-between shrink-0 h-12 w-full max-w-md mx-auto">
        <button
          onClick={onClose}
          className="size-9 rounded-full bg-slate-100 hover:bg-slate-200/80 border border-slate-200/80 text-slate-700 flex items-center justify-center active:scale-95 transition-all cursor-pointer shadow-2xs"
          aria-label="Collapse player"
        >
          <ChevronDown size={18} />
        </button>

        <div className="text-center px-2 min-w-0">
          <Badge
            variant="outline"
            className="text-[10px] font-bold uppercase tracking-wider text-slate-800 bg-slate-100/90 border-slate-200 shadow-2xs py-0.5 px-2.5"
          >
            Study Mode
          </Badge>
          <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
            {currentAudio.subject_name || 'Academic Audio'}
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onToggleFavorite(currentAudio.id)}
            className={`size-9 rounded-full border flex items-center justify-center active:scale-95 transition-all cursor-pointer shadow-2xs ${
              currentAudio.is_favorite
                ? 'bg-amber-50 border-amber-300 text-amber-600 shadow-amber-500/10'
                : 'bg-slate-100 hover:bg-slate-200/80 border-slate-200 text-slate-400 hover:text-slate-700'
            }`}
            aria-label="Favorite audio"
            title={currentAudio.is_favorite ? 'Favorited' : 'Add to Favorites'}
          >
            <Star size={16} fill={currentAudio.is_favorite ? 'currentColor' : 'none'} />
          </button>

          <button
            onClick={() => onToggleOffline(currentAudio)}
            className={`size-9 rounded-full border flex items-center justify-center active:scale-95 transition-all cursor-pointer shadow-2xs ${
              currentAudio.is_downloaded_offline
                ? 'bg-emerald-50 border-emerald-300 text-emerald-600'
                : 'bg-slate-100 hover:bg-slate-200/80 border-slate-200 text-slate-400 hover:text-slate-700'
            }`}
            title={currentAudio.is_downloaded_offline ? 'Saved Offline' : 'Save for Offline Study'}
            aria-label="Toggle offline download"
          >
            {currentAudio.is_downloaded_offline ? <CheckCircle2 size={16} /> : <Download size={16} />}
          </button>
        </div>
      </header>

      {/* 2. Visual Soundstage / Acoustic Canvas */}
      <section className="flex-1 min-h-0 flex flex-col items-center justify-center my-2 sm:my-3 w-full max-w-sm mx-auto">
        <div className="relative w-full aspect-square max-h-56 sm:max-h-64 rounded-3xl bg-gradient-to-b from-slate-50 via-white to-slate-50/90 border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-4 flex flex-col items-center justify-between overflow-hidden group">
          {/* Subtle Ambient Glow */}
          <div
            className={`absolute inset-0 bg-radial from-emerald-500/8 via-transparent to-transparent pointer-events-none transition-opacity duration-300 ${
              isPlaying ? 'opacity-100' : 'opacity-30'
            }`}
          />

          {/* Soundstage Top Badges */}
          <div className="relative z-10 w-full flex items-center justify-between">
            <span className="text-[10px] font-mono font-semibold tracking-wider text-slate-400 uppercase flex items-center gap-1.5">
              <span className={`size-1.5 rounded-full ${isPlaying ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
              {currentAudio.file_format ? currentAudio.file_format.toUpperCase() : 'AUDIO'} • {playbackSpeed}×
            </span>

            {abLoop?.enabled && (
              <Badge variant="amber" className="text-[10px] py-0 px-2 font-mono">
                LOOP {formatDuration(abLoop.startSeconds)}–{formatDuration(abLoop.endSeconds)}
              </Badge>
            )}
          </div>

          {/* Interactive Multi-Bar Frequency Waveform */}
          <div
            className="relative z-10 w-full flex items-center justify-center gap-1 sm:gap-1.5 h-24 px-1 cursor-pointer select-none"
            title="Tap any point on waveform to seek"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
              onSeek(pct * safeDuration);
            }}
          >
            {peaks.map((height, idx) => {
              const barProgress = (idx / peaks.length) * 100;
              const currentProgress = (currentDisplayPos / safeDuration) * 100;
              const isPast = barProgress <= currentProgress;

              return (
                <div
                  key={idx}
                  className={`w-1 sm:w-1.5 rounded-full transition-all duration-150 ${
                    isPast
                      ? 'bg-emerald-500 shadow-2xs shadow-emerald-500/20'
                      : 'bg-slate-200/90 hover:bg-slate-300'
                  }`}
                  style={{
                    height: `${Math.max(16, (height / 100) * 100)}%`,
                    transform: isPlaying && isPast ? 'scaleY(1.06)' : 'scaleY(1)'
                  }}
                />
              );
            })}
          </div>

          {/* Key Term Tags / Metadata Footer */}
          <div className="relative z-10 w-full flex items-center justify-center gap-1.5 overflow-hidden">
            {currentAudio.key_terms && currentAudio.key_terms.length > 0 ? (
              currentAudio.key_terms.slice(0, 3).map((term, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded-full bg-white/90 border border-slate-200/80 text-[10px] text-slate-600 font-mono shadow-2xs truncate max-w-[100px]"
                >
                  #{term}
                </span>
              ))
            ) : (
              <span className="text-[10px] text-slate-400 font-mono">
                Study Audio Track
              </span>
            )}
          </div>
        </div>

        {/* Audio Title & Subtitle */}
        <div className="text-center mt-3 sm:mt-4 px-2 w-full">
          <h2 className="text-base sm:text-lg font-bold text-slate-950 tracking-tight leading-snug line-clamp-1">
            {currentAudio.title}
          </h2>
          {currentAudio.description ? (
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-1 leading-normal font-normal">
              {currentAudio.description}
            </p>
          ) : (
            <p className="text-xs text-slate-400 mt-0.5 font-normal">
              {currentAudio.subject_name || 'Academic Concept'}
            </p>
          )}
        </div>
      </section>

      {/* 3. Controls & Scrubber Footer Container */}
      <footer className="w-full max-w-md mx-auto shrink-0 space-y-3 pt-1">
        {/* Scrubber with Timecode Monospace Labels */}
        <div className="space-y-1">
          <Slider
            value={currentDisplayPos}
            min={0}
            max={safeDuration}
            step={0.1}
            loopRange={loopRange}
            onChange={(val) => setScrubPosition(val)}
            onCommit={(finalVal) => {
              onSeek(finalVal);
              setScrubPosition(null);
            }}
            formatTooltip={(val) => formatDuration(val)}
            aria-label="Audio scrubber"
          />

          <div className="flex justify-between items-center text-xs font-mono font-medium text-slate-500 px-0.5 select-none">
            <span>{formatDuration(currentDisplayPos)}</span>
            {abLoop?.enabled && (
              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                A-B Loop Active
              </span>
            )}
            <span>-{formatDuration(remainingSeconds)}</span>
          </div>
        </div>

        {/* Primary Controls Row */}
        <div className="flex items-center justify-between px-2 sm:px-4">
          {/* Quick Speed Chip */}
          <button
            onClick={() => togglePanel('speed')}
            className={`h-9 px-2.5 rounded-xl border text-xs font-mono font-bold transition-all active:scale-95 cursor-pointer shadow-2xs flex items-center gap-1 ${
              activePanel === 'speed'
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-slate-100 hover:bg-slate-200/80 border-slate-200 text-slate-700'
            }`}
            title="Adjust playback speed"
            aria-label={`Playback speed ${playbackSpeed}x`}
          >
            <Gauge size={13} />
            <span>{playbackSpeed}x</span>
          </button>

          {/* Rewind 10s */}
          <button
            onClick={() => onSeekRelative(-10)}
            className="size-11 rounded-full text-slate-600 hover:text-slate-950 hover:bg-slate-100 flex items-center justify-center active:scale-90 transition-all cursor-pointer relative"
            aria-label="Rewind 10 seconds"
            title="Rewind 10 seconds"
          >
            <RotateCcw size={20} />
            <span className="absolute text-[8px] font-mono font-bold text-slate-600 top-4">10</span>
          </button>

          {/* Hero Play/Pause Button */}
          <button
            onClick={onTogglePlay}
            className={`size-16 sm:size-17 rounded-full text-white shadow-lg active:scale-95 transition-all flex items-center justify-center cursor-pointer ${
              isPlaying
                ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/25'
                : 'bg-slate-950 hover:bg-slate-900 shadow-slate-950/20'
            }`}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause size={26} fill="currentColor" />
            ) : (
              <Play size={26} fill="currentColor" className="translate-x-0.5" />
            )}
          </button>

          {/* Forward 15s */}
          <button
            onClick={() => onSeekRelative(15)}
            className="size-11 rounded-full text-slate-600 hover:text-slate-950 hover:bg-slate-100 flex items-center justify-center active:scale-90 transition-all cursor-pointer relative"
            aria-label="Forward 15 seconds"
            title="Forward 15 seconds"
          >
            <RotateCw size={20} />
            <span className="absolute text-[8px] font-mono font-bold text-slate-600 top-4">15</span>
          </button>

          {/* Repeat Mode */}
          <button
            onClick={onToggleRepeat}
            className={`size-9 rounded-full border flex items-center justify-center active:scale-90 transition-all cursor-pointer shadow-2xs ${
              isRepeatTrack
                ? 'bg-emerald-50 border-emerald-300 text-emerald-600'
                : isRepeatQueue
                ? 'bg-sky-50 border-sky-300 text-sky-600'
                : 'bg-slate-100 hover:bg-slate-200/80 border-slate-200 text-slate-400 hover:text-slate-700'
            }`}
            aria-label="Toggle repeat mode"
            title={isRepeatTrack ? 'Repeat Track' : isRepeatQueue ? 'Repeat All' : 'Repeat Off'}
          >
            {isRepeatTrack ? <Repeat1 size={17} /> : <Repeat size={17} />}
          </button>
        </div>

        {/* Study Utilities Segmented Bar */}
        <div className="grid grid-cols-2 gap-2 pt-0.5">
          {/* A-B Loop Utility Tab */}
          <button
            onClick={() => togglePanel('ab_loop')}
            className={`py-2 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activePanel === 'ab_loop'
                ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                : abLoop?.enabled
                ? 'bg-amber-50 border-amber-300 text-amber-800'
                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
            }`}
          >
            <BookmarkCheck size={14} className={activePanel === 'ab_loop' ? 'text-amber-400' : ''} />
            <span>A⇄B Repeat</span>
            {abLoop?.enabled && <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />}
          </button>

          {/* Sleep Timer Utility Tab */}
          <button
            onClick={() => togglePanel('sleep')}
            className={`py-2 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activePanel === 'sleep'
                ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                : sleepTimerRemainingSeconds
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
            }`}
          >
            <Timer size={14} className={activePanel === 'sleep' ? 'text-emerald-400' : ''} />
            <span>
              {sleepTimerRemainingSeconds
                ? `${Math.ceil(sleepTimerRemainingSeconds / 60)}m left`
                : 'Sleep Timer'}
            </span>
          </button>
        </div>

        {/* Collapsible Utility Drawers (Renders inline only when requested, saving space) */}
        {activePanel === 'speed' && (
          <div className="bg-slate-50 border border-slate-200/90 p-2 rounded-2xl shadow-xs animate-in fade-in zoom-in-98 duration-100">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 px-1 mb-1.5">
              <span>Playback Rate</span>
              <span className="font-mono text-slate-500">Current: {playbackSpeed}×</span>
            </div>
            <div className="grid grid-cols-5 gap-1">
              {speedOptions.map((spd) => {
                const isSelected = playbackSpeed === spd;
                return (
                  <button
                    key={spd}
                    onClick={() => {
                      onSetSpeed(spd);
                      setActivePanel('none');
                    }}
                    className={`py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/60'
                    }`}
                  >
                    {spd}x
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {activePanel === 'ab_loop' && (
          <div className="bg-amber-50/60 border border-amber-200/80 p-2.5 rounded-2xl shadow-xs space-y-2 animate-in fade-in zoom-in-98 duration-100">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-amber-900">Repeat Interval</span>
              <span className="text-[11px] text-amber-700 font-mono font-medium">
                {abLoop?.enabled
                  ? `${formatDuration(abLoop.startSeconds)} → ${formatDuration(abLoop.endSeconds)}`
                  : 'No Active Loop'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={() => onToggleABLoop(safePosition, abLoop?.endSeconds || safeDuration)}
                className="py-1.5 px-1 rounded-xl bg-white border border-amber-200 text-xs font-mono font-semibold text-slate-800 hover:bg-amber-100/50 active:scale-95 cursor-pointer shadow-2xs"
              >
                Set A ({formatDuration(safePosition)})
              </button>
              <button
                onClick={() => onToggleABLoop(abLoop?.startSeconds || 0, safePosition)}
                className="py-1.5 px-1 rounded-xl bg-white border border-amber-200 text-xs font-mono font-semibold text-slate-800 hover:bg-amber-100/50 active:scale-95 cursor-pointer shadow-2xs"
              >
                Set B ({formatDuration(safePosition)})
              </button>
              <button
                onClick={() => {
                  onToggleABLoop(undefined, undefined);
                  setActivePanel('none');
                }}
                className="py-1.5 px-1 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold hover:bg-rose-100 active:scale-95 cursor-pointer"
              >
                Clear Loop
              </button>
            </div>
          </div>
        )}

        {activePanel === 'sleep' && (
          <div className="bg-slate-50 border border-slate-200/90 p-2 rounded-2xl shadow-xs animate-in fade-in zoom-in-98 duration-100">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 px-1 mb-1.5">
              <span>Sleep Timer</span>
              <span className="font-mono text-slate-500">
                {sleepTimerRemainingSeconds ? `${Math.ceil(sleepTimerRemainingSeconds / 60)} min remaining` : 'Disabled'}
              </span>
            </div>
            <div className="grid grid-cols-6 gap-1">
              {timerOptions.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => {
                    onSetSleepTimer(opt.minutes);
                    setActivePanel('none');
                  }}
                  className={`py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    (opt.minutes === null && !sleepTimerRemainingSeconds) ||
                    (opt.minutes && sleepTimerRemainingSeconds && Math.abs(Math.ceil(sleepTimerRemainingSeconds / 60) - opt.minutes) <= 1)
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/60'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </footer>
    </div>
  );
};
