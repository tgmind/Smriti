import React, { useState } from 'react';
import {
  ChevronDown,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  SkipBack,
  Repeat,
  Repeat1,
  Timer,
  Zap,
  Star,
  Download,
  CheckCircle2,
  Sliders
} from 'lucide-react';
import { AudioItem, PlaybackState } from '../types';
import { formatDuration } from '../services/learningEngine';

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
  onOpenAssessment: () => void;
}

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
  onToggleOffline,
  onOpenAssessment
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

  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showTimerMenu, setShowTimerMenu] = useState(false);
  const [showABPanel, setShowABPanel] = useState(false);

  if (!currentAudio) return null;

  const totalDuration = durationSeconds || currentAudio.duration_seconds || 1;
  const progressPercent = Math.min(100, (positionSeconds / totalDuration) * 100);

  const speedOptions = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5];
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
    : [20, 40, 60, 80, 50, 70, 90, 60, 40, 65, 85, 75, 55, 45, 60, 80, 70, 50, 30, 40];

  return (
    <div className="fixed inset-0 z-50 bg-surface-950/98 backdrop-blur-2xl flex flex-col justify-between overflow-y-auto safe-top safe-bottom p-5 text-surface-50">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onClose}
          className="p-2.5 rounded-full bg-surface-900 border border-surface-800 text-surface-300 hover:text-surface-100 active:scale-95"
          aria-label="Collapse player"
        >
          <ChevronDown size={22} />
        </button>

        <div className="text-center">
          <span className="text-xs uppercase tracking-widest font-bold text-amber-400">
            Study Mode
          </span>
          <p className="text-xs text-surface-400 font-medium">
            {currentAudio.subject_name || 'Academic Audio'}
          </p>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onToggleFavorite(currentAudio.id)}
            className={`p-2.5 rounded-full border active:scale-95 transition-colors ${
              currentAudio.is_favorite
                ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
                : 'bg-surface-900 border-surface-800 text-surface-400 hover:text-surface-200'
            }`}
            aria-label="Favorite audio"
          >
            <Star size={18} fill={currentAudio.is_favorite ? 'currentColor' : 'none'} />
          </button>

          <button
            onClick={() => onToggleOffline(currentAudio)}
            className={`p-2.5 rounded-full border active:scale-95 transition-colors ${
              currentAudio.is_downloaded_offline
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                : 'bg-surface-900 border-surface-800 text-surface-400 hover:text-surface-200'
            }`}
            title={currentAudio.is_downloaded_offline ? 'Saved Offline' : 'Save for Offline Study'}
            aria-label="Toggle offline download"
          >
            {currentAudio.is_downloaded_offline ? <CheckCircle2 size={18} /> : <Download size={18} />}
          </button>
        </div>
      </div>

      {/* Visual Identity / Waveform Area */}
      <div className="flex-1 flex flex-col items-center justify-center my-4 max-w-sm mx-auto w-full">
        <div className="relative w-full aspect-square max-h-64 rounded-3xl bg-gradient-to-b from-surface-850 to-surface-900 border border-surface-800 shadow-2xl p-6 flex flex-col items-center justify-center overflow-hidden">
          {/* Subtle concentric rings */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
            <div className="w-48 h-48 rounded-full border border-amber-400/40 animate-pulse" />
            <div className="absolute w-32 h-32 rounded-full border border-teal-400/30" />
          </div>

          {/* Dynamic Waveform Bars */}
          <div className="relative z-10 w-full flex items-center justify-center gap-1.5 h-28 px-2">
            {peaks.map((height, idx) => {
              const barProgress = (idx / peaks.length) * 100;
              const isPast = barProgress <= progressPercent;

              return (
                <div
                  key={idx}
                  className={`w-1.5 rounded-full transition-all duration-150 ${
                    isPast
                      ? 'bg-gradient-to-t from-amber-500 to-amber-300'
                      : 'bg-surface-700/60'
                  }`}
                  style={{
                    height: `${Math.max(14, (height / 100) * 100)}%`,
                    transform: isPlaying && isPast ? 'scaleY(1.08)' : 'scaleY(1)'
                  }}
                />
              );
            })}
          </div>

          {/* Key terms pills */}
          {currentAudio.key_terms && currentAudio.key_terms.length > 0 && (
            <div className="relative z-10 flex flex-wrap gap-1.5 justify-center mt-3 max-h-14 overflow-hidden">
              {currentAudio.key_terms.slice(0, 3).map((term, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded-md bg-surface-800/80 border border-surface-700 text-[10px] text-surface-300 font-mono"
                >
                  {term}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Audio Titles */}
        <div className="text-center mt-5 px-4 w-full">
          <h2 className="text-xl font-bold text-surface-50 tracking-tight leading-snug line-clamp-2">
            {currentAudio.title}
          </h2>
          {currentAudio.description && (
            <p className="text-xs text-surface-400 mt-1 line-clamp-2 leading-relaxed">
              {currentAudio.description}
            </p>
          )}
        </div>
      </div>

      {/* Player Controls & Scrubber */}
      <div className="max-w-md mx-auto w-full space-y-4">
        {/* Scrubber Slider */}
        <div className="space-y-1.5">
          <input
            type="range"
            min="0"
            max={totalDuration}
            step="0.5"
            value={positionSeconds}
            onChange={(e) => onSeek(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-surface-800 rounded-lg appearance-none cursor-pointer accent-amber-400 focus:outline-none"
            aria-label="Audio scrubber"
          />
          <div className="flex justify-between text-xs font-mono text-surface-400 px-0.5">
            <span>{formatDuration(positionSeconds)}</span>
            <span>-{formatDuration(Math.max(0, totalDuration - positionSeconds))}</span>
          </div>
        </div>

        {/* Primary Controls Row */}
        <div className="flex items-center justify-between px-2">
          {/* Rewind 10s */}
          <button
            onClick={() => onSeekRelative(-10)}
            className="p-3 text-surface-300 hover:text-surface-100 active:scale-95 transition-transform"
            aria-label="Rewind 10 seconds"
          >
            <RotateCcw size={22} />
          </button>

          {/* Previous Track */}
          <button
            onClick={() => onSeek(0)}
            className="p-3 text-surface-300 hover:text-surface-100 active:scale-95 transition-transform"
            aria-label="Restart or previous track"
          >
            <SkipBack size={24} />
          </button>

          {/* Main Play/Pause Button */}
          <button
            onClick={onTogglePlay}
            className="p-5 rounded-full bg-gradient-to-tr from-amber-500 to-amber-400 text-surface-950 shadow-xl hover:brightness-110 active:scale-95 transition-transform"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause size={28} fill="currentColor" />
            ) : (
              <Play size={28} fill="currentColor" className="translate-x-0.5" />
            )}
          </button>

          {/* Next / Fast Forward */}
          <button
            onClick={() => onSeekRelative(30)}
            className="p-3 text-surface-300 hover:text-surface-100 active:scale-95 transition-transform"
            aria-label="Forward 30 seconds"
          >
            <RotateCw size={22} />
          </button>

          {/* Repeat Mode */}
          <button
            onClick={onToggleRepeat}
            className={`p-3 active:scale-95 transition-colors ${
              isRepeatTrack
                ? 'text-amber-400'
                : isRepeatQueue
                ? 'text-teal-400'
                : 'text-surface-400 hover:text-surface-200'
            }`}
            aria-label="Toggle repeat mode"
            title={isRepeatTrack ? 'Repeat Track' : isRepeatQueue ? 'Repeat All' : 'Repeat Off'}
          >
            {isRepeatTrack ? <Repeat1 size={22} /> : <Repeat size={22} />}
          </button>
        </div>

        {/* Secondary Toolstrip: Speed, A-B Loop, Sleep Timer, Active Recall */}
        <div className="pt-2 border-t border-surface-800/80 grid grid-cols-4 gap-2">
          {/* Speed Selector */}
          <button
            onClick={() => setShowSpeedMenu(!showSpeedMenu)}
            className={`py-2 px-2 rounded-xl text-xs font-mono font-semibold border flex items-center justify-center gap-1 transition-all ${
              playbackSpeed !== 1.0
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : 'bg-surface-900 border-surface-800 text-surface-300'
            }`}
          >
            <Sliders size={13} />
            <span>{playbackSpeed}x</span>
          </button>

          {/* A-B Loop */}
          <button
            onClick={() => setShowABPanel(!showABPanel)}
            className={`py-2 px-2 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1 transition-all ${
              abLoop?.enabled
                ? 'bg-teal-500/20 border-teal-500/40 text-teal-300'
                : 'bg-surface-900 border-surface-800 text-surface-300'
            }`}
          >
            <span className="font-mono text-[11px]">A⇄B</span>
            {abLoop?.enabled && <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />}
          </button>

          {/* Sleep Timer */}
          <button
            onClick={() => setShowTimerMenu(!showTimerMenu)}
            className={`py-2 px-2 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1 transition-all ${
              sleepTimerRemainingSeconds
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : 'bg-surface-900 border-surface-800 text-surface-300'
            }`}
          >
            <Timer size={13} />
            <span className="font-mono text-[11px]">
              {sleepTimerRemainingSeconds ? `${Math.ceil(sleepTimerRemainingSeconds / 60)}m` : 'Sleep'}
            </span>
          </button>

          {/* Active Recall Action */}
          <button
            onClick={onOpenAssessment}
            className="py-2 px-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-amber-500/20 to-teal-500/20 border border-amber-500/30 text-amber-300 hover:brightness-110 flex items-center justify-center gap-1"
          >
            <Zap size={13} className="text-amber-400" />
            <span>Recall</span>
          </button>
        </div>

        {/* Speed Selection Flyout */}
        {showSpeedMenu && (
          <div className="bg-surface-850 border border-surface-700 p-2.5 rounded-2xl flex flex-wrap justify-between gap-1 animate-in fade-in zoom-in-95 duration-100">
            {speedOptions.map((spd) => (
              <button
                key={spd}
                onClick={() => {
                  onSetSpeed(spd);
                  setShowSpeedMenu(false);
                }}
                className={`py-1.5 px-2.5 rounded-lg text-xs font-mono font-bold transition-colors ${
                  playbackSpeed === spd
                    ? 'bg-amber-500 text-surface-950'
                    : 'bg-surface-800 text-surface-300 hover:bg-surface-700'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        )}

        {/* Sleep Timer Selection Flyout */}
        {showTimerMenu && (
          <div className="bg-surface-850 border border-surface-700 p-2.5 rounded-2xl flex flex-wrap justify-between gap-1 animate-in fade-in zoom-in-95 duration-100">
            {timerOptions.map((opt, i) => (
              <button
                key={i}
                onClick={() => {
                  onSetSleepTimer(opt.minutes);
                  setShowTimerMenu(false);
                }}
                className="py-1.5 px-2.5 rounded-lg text-xs font-semibold bg-surface-800 text-surface-300 hover:bg-surface-700 transition-colors"
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {/* A-B Loop Controls Panel */}
        {showABPanel && (
          <div className="bg-surface-850 border border-teal-500/30 p-3 rounded-2xl space-y-2 animate-in fade-in duration-100">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-teal-400">A–B Repeat Segment</span>
              <span className="text-[11px] text-surface-400 font-mono">
                {abLoop?.enabled
                  ? `${formatDuration(abLoop.startSeconds)} → ${formatDuration(abLoop.endSeconds)}`
                  : 'Loop Disabled'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => onToggleABLoop(positionSeconds, abLoop?.endSeconds || totalDuration)}
                className="py-1.5 rounded-lg bg-surface-800 border border-surface-700 text-xs font-mono text-surface-200 active:scale-95"
              >
                Set A ({formatDuration(positionSeconds)})
              </button>
              <button
                onClick={() => onToggleABLoop(abLoop?.startSeconds || 0, positionSeconds)}
                className="py-1.5 rounded-lg bg-surface-800 border border-surface-700 text-xs font-mono text-surface-200 active:scale-95"
              >
                Set B ({formatDuration(positionSeconds)})
              </button>
              <button
                onClick={() => onToggleABLoop(undefined, undefined)}
                className="py-1.5 rounded-lg bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-semibold active:scale-95"
              >
                Clear Loop
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
