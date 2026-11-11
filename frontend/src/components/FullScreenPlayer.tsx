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
  CheckCircle2
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

  const [showTimerMenu, setShowTimerMenu] = useState(false);
  const [showABPanel, setShowABPanel] = useState(false);

  if (!currentAudio) return null;

  const totalDuration = durationSeconds || currentAudio.duration_seconds || 1;
  const progressPercent = Math.min(100, (positionSeconds / totalDuration) * 100);

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
    <div className="fixed inset-0 z-50 bg-white flex flex-col justify-between overflow-y-auto safe-top safe-bottom p-5 text-slate-900 animate-in fade-in duration-150">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={onClose}
          className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 active:scale-95 transition-transform"
          aria-label="Collapse player"
        >
          <ChevronDown size={20} />
        </button>

        <div className="text-center">
          <span className="px-3 py-0.5 rounded-full bg-slate-100 border border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-800">
            Study Mode
          </span>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
            {currentAudio.subject_name || 'Academic Audio'}
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onToggleFavorite(currentAudio.id)}
            className={`p-2 rounded-full border active:scale-95 transition-colors ${
              currentAudio.is_favorite
                ? 'bg-amber-50 border-amber-300 text-amber-600'
                : 'bg-slate-100 border-slate-200 text-slate-400 hover:text-slate-700'
            }`}
            aria-label="Favorite audio"
          >
            <Star size={18} fill={currentAudio.is_favorite ? 'currentColor' : 'none'} />
          </button>

          <button
            onClick={() => onToggleOffline(currentAudio)}
            className={`p-2 rounded-full border active:scale-95 transition-colors ${
              currentAudio.is_downloaded_offline
                ? 'bg-emerald-50 border-emerald-300 text-emerald-600'
                : 'bg-slate-100 border-slate-200 text-slate-400 hover:text-slate-700'
            }`}
            title={currentAudio.is_downloaded_offline ? 'Saved Offline' : 'Save for Offline Study'}
            aria-label="Toggle offline download"
          >
            {currentAudio.is_downloaded_offline ? <CheckCircle2 size={18} /> : <Download size={18} />}
          </button>
        </div>
      </div>

      {/* Visual Identity / Waveform Area */}
      <div className="flex-1 flex flex-col items-center justify-center my-3 max-w-sm mx-auto w-full">
        <div className="relative w-full aspect-square max-h-60 rounded-3xl bg-slate-50 border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-5 flex flex-col items-center justify-center overflow-hidden">
          {/* Waveform Bars */}
          <div className="relative z-10 w-full flex items-center justify-center gap-1.5 h-24 px-2">
            {peaks.map((height, idx) => {
              const barProgress = (idx / peaks.length) * 100;
              const isPast = barProgress <= progressPercent;

              return (
                <div
                  key={idx}
                  className={`w-1.5 rounded-full transition-all duration-150 ${
                    isPast
                      ? 'bg-amber-500'
                      : 'bg-slate-200'
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
            <div className="relative z-10 flex flex-wrap gap-1.5 justify-center mt-3 max-h-12 overflow-hidden">
              {currentAudio.key_terms.slice(0, 3).map((term, i) => (
                <span
                  key={i}
                  className="px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-[10px] text-slate-700 font-mono shadow-2xs"
                >
                  {term}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Audio Titles */}
        <div className="text-center mt-4 px-3 w-full">
          <h2 className="text-base font-extrabold text-slate-950 tracking-tight leading-snug line-clamp-2">
            {currentAudio.title}
          </h2>
          {currentAudio.description && (
            <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
              {currentAudio.description}
            </p>
          )}
        </div>
      </div>

      {/* Player Controls & Scrubber */}
      <div className="max-w-md mx-auto w-full space-y-3.5">
        {/* Scrubber Slider */}
        <div className="space-y-1">
          <input
            type="range"
            min="0"
            max={totalDuration}
            step="0.5"
            value={positionSeconds}
            onChange={(e) => onSeek(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500 focus:outline-none"
            aria-label="Audio scrubber"
          />
          <div className="flex justify-between text-[11px] font-mono text-slate-500 px-0.5">
            <span>{formatDuration(positionSeconds)}</span>
            <span>-{formatDuration(Math.max(0, totalDuration - positionSeconds))}</span>
          </div>
        </div>

        {/* Primary Controls Row */}
        <div className="flex items-center justify-between px-3">
          {/* Rewind 10s */}
          <button
            onClick={() => onSeekRelative(-10)}
            className="p-2.5 text-slate-500 hover:text-slate-900 active:scale-95 transition-transform"
            aria-label="Rewind 10 seconds"
          >
            <RotateCcw size={20} />
          </button>

          {/* Previous Track / Restart */}
          <button
            onClick={() => onSeek(0)}
            className="p-2.5 text-slate-500 hover:text-slate-900 active:scale-95 transition-transform"
            aria-label="Restart track"
          >
            <SkipBack size={22} />
          </button>

          {/* Main Play/Pause Button */}
          <button
            onClick={onTogglePlay}
            className="p-4.5 rounded-full bg-slate-900 text-white hover:bg-slate-800 shadow-md shadow-slate-900/15 active:scale-95 transition-transform"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause size={24} fill="currentColor" />
            ) : (
              <Play size={24} fill="currentColor" className="translate-x-0.5" />
            )}
          </button>

          {/* Fast Forward 30s */}
          <button
            onClick={() => onSeekRelative(30)}
            className="p-2.5 text-slate-500 hover:text-slate-900 active:scale-95 transition-transform"
            aria-label="Forward 30 seconds"
          >
            <RotateCw size={20} />
          </button>

          {/* Repeat Mode */}
          <button
            onClick={onToggleRepeat}
            className={`p-2.5 active:scale-95 transition-colors ${
              isRepeatTrack
                ? 'text-amber-600 font-bold'
                : isRepeatQueue
                ? 'text-sky-600 font-bold'
                : 'text-slate-400 hover:text-slate-700'
            }`}
            aria-label="Toggle repeat mode"
            title={isRepeatTrack ? 'Repeat Track' : isRepeatQueue ? 'Repeat All' : 'Repeat Off'}
          >
            {isRepeatTrack ? <Repeat1 size={20} /> : <Repeat size={20} />}
          </button>
        </div>

        {/* 1-Tap Quick Seek Jumps Bar */}
        <div className="flex items-center justify-center gap-1.5 pt-0.5">
          {[-15, -5, 5, 15].map((delta) => (
            <button
              key={delta}
              onClick={() => onSeekRelative(delta)}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-[10px] font-bold active:scale-95 transition-all border border-slate-200/60"
            >
              {delta > 0 ? `+${delta}s` : `${delta}s`}
            </button>
          ))}
        </div>

        {/* 1-Tap Playback Speed Segmented Bar */}
        <div className="flex items-center justify-between gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
          {[0.75, 1.0, 1.25, 1.5, 2.0].map((spd) => {
            const isSelected = playbackSpeed === spd;
            return (
              <button
                key={spd}
                onClick={() => onSetSpeed(spd)}
                className={`flex-1 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                  isSelected
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {spd}x
              </button>
            );
          })}
        </div>

        {/* Secondary Toolstrip: Sleep Timer, A-B Loop, Active Recall */}
        <div className="pt-1.5 border-t border-slate-200 grid grid-cols-3 gap-2">

          {/* A-B Loop */}
          <button
            onClick={() => setShowABPanel(!showABPanel)}
            className={`py-2 px-2 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1 transition-all ${
              abLoop?.enabled
                ? 'bg-sky-50 border-sky-300 text-sky-800'
                : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <span className="font-mono text-[11px]">A⇄B</span>
            {abLoop?.enabled && <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />}
          </button>

          {/* Sleep Timer */}
          <button
            onClick={() => setShowTimerMenu(!showTimerMenu)}
            className={`py-2 px-2 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1 transition-all ${
              sleepTimerRemainingSeconds
                ? 'bg-amber-50 border-amber-300 text-amber-800'
                : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Timer size={12} />
            <span className="font-mono text-[11px]">
              {sleepTimerRemainingSeconds ? `${Math.ceil(sleepTimerRemainingSeconds / 60)}m` : 'Sleep'}
            </span>
          </button>

          {/* Active Recall Action */}
          <button
            onClick={onOpenAssessment}
            className="py-2 px-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-slate-950 flex items-center justify-center gap-1 shadow-2xs active:scale-95 transition-all"
          >
            <Zap size={12} fill="currentColor" />
            <span>Recall</span>
          </button>
        </div>

        {/* Sleep Timer Selection Flyout */}
        {showTimerMenu && (
          <div className="bg-white border border-slate-200 p-2.5 rounded-2xl shadow-lg flex flex-wrap justify-between gap-1 animate-in fade-in zoom-in-95 duration-100">
            {timerOptions.map((opt, i) => (
              <button
                key={i}
                onClick={() => {
                  onSetSleepTimer(opt.minutes);
                  setShowTimerMenu(false);
                }}
                className="py-1.5 px-2.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {/* A-B Loop Controls Panel */}
        {showABPanel && (
          <div className="bg-white border border-sky-200 p-3 rounded-2xl shadow-md space-y-2 animate-in fade-in duration-100">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-sky-800">A–B Repeat Segment</span>
              <span className="text-[11px] text-slate-500 font-mono">
                {abLoop?.enabled
                  ? `${formatDuration(abLoop.startSeconds)} → ${formatDuration(abLoop.endSeconds)}`
                  : 'Loop Disabled'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => onToggleABLoop(positionSeconds, abLoop?.endSeconds || totalDuration)}
                className="py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-xs font-mono text-slate-700 hover:bg-slate-200 active:scale-95"
              >
                Set A ({formatDuration(positionSeconds)})
              </button>
              <button
                onClick={() => onToggleABLoop(abLoop?.startSeconds || 0, positionSeconds)}
                className="py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-xs font-mono text-slate-700 hover:bg-slate-200 active:scale-95"
              >
                Set B ({formatDuration(positionSeconds)})
              </button>
              <button
                onClick={() => onToggleABLoop(undefined, undefined)}
                className="py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold hover:bg-rose-100 active:scale-95"
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
