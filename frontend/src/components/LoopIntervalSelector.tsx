import React, { useState, useEffect } from 'react';
import { BookmarkCheck, RotateCcw, Check } from 'lucide-react';
import { formatDuration } from '../services/learningEngine';
import { RangeSlider } from './ui/range-slider';

interface LoopIntervalSelectorProps {
  currentPosition: number;
  duration: number;
  activeLoop: { enabled: boolean; startSeconds: number; endSeconds: number } | null;
  onSetLoop: (start: number, end: number) => void;
  onClearLoop: () => void;
  onSeek: (seconds: number) => void;
}

export const LoopIntervalSelector: React.FC<LoopIntervalSelectorProps> = ({
  currentPosition,
  duration,
  activeLoop,
  onSetLoop,
  onClearLoop,
  onSeek
}) => {
  const safeDuration = Math.max(1, duration && Number.isFinite(duration) ? duration : 60);

  // Local state for interactive slider manipulation
  const [startSec, setStartSec] = useState<number>(() => {
    if (activeLoop?.enabled) return activeLoop.startSeconds;
    return Math.max(0, Math.floor(currentPosition));
  });

  const [endSec, setEndSec] = useState<number>(() => {
    if (activeLoop?.enabled) return activeLoop.endSeconds;
    return Math.min(safeDuration, Math.max(startSec + 5, Math.floor(currentPosition) + 10));
  });

  // Sync when activeLoop prop changes externally
  useEffect(() => {
    if (activeLoop?.enabled) {
      setStartSec(activeLoop.startSeconds);
      setEndSec(activeLoop.endSeconds);
    }
  }, [activeLoop?.enabled, activeLoop?.startSeconds, activeLoop?.endSeconds]);

  const loopDuration = Math.max(0.1, endSec - startSec);

  const handleSliderChange = (newStart: number, newEnd: number) => {
    setStartSec(newStart);
    setEndSec(newEnd);
  };

  const handleSliderCommit = (newStart: number, newEnd: number) => {
    setStartSec(newStart);
    setEndSec(newEnd);
    if (activeLoop?.enabled) {
      onSetLoop(newStart, newEnd);
    }
  };

  const applyPreset = (lengthSeconds: number) => {
    const cur = Math.max(0, Math.min(safeDuration - 1, currentPosition));
    const newStart = cur;
    const newEnd = Math.min(safeDuration, cur + lengthSeconds);
    setStartSec(newStart);
    setEndSec(newEnd);
    onSetLoop(newStart, newEnd);
  };

  const handleActivateOrToggle = () => {
    if (activeLoop?.enabled) {
      onClearLoop();
    } else {
      onSetLoop(startSec, endSec);
      onSeek(startSec);
    }
  };

  const nudgeStart = (delta: number) => {
    const next = Math.max(0, Math.min(endSec - 0.5, startSec + delta));
    setStartSec(next);
    if (activeLoop?.enabled) onSetLoop(next, endSec);
  };

  const nudgeEnd = (delta: number) => {
    const next = Math.min(safeDuration, Math.max(startSec + 0.5, endSec + delta));
    setEndSec(next);
    if (activeLoop?.enabled) onSetLoop(startSec, next);
  };

  return (
    <div className="space-y-3.5 select-none text-white">
      {/* 1. Header Status & Interval Badge */}
      <div className="flex items-center justify-between bg-zinc-900/90 p-2.5 rounded-2xl border border-zinc-800 text-xs">
        <div className="flex items-center gap-1.5">
          <BookmarkCheck
            size={16}
            className={activeLoop?.enabled ? 'text-amber-400' : 'text-zinc-500'}
          />
          <span className="font-semibold text-zinc-200">Repeat Interval</span>
        </div>

        <div className="flex items-center gap-1.5 font-mono text-[11px]">
          <span className="font-bold text-white bg-zinc-800 px-2 py-0.5 rounded-lg border border-zinc-700 shadow-2xs">
            {formatDuration(startSec)} → {formatDuration(endSec)}
          </span>
          <span className="text-zinc-400 font-medium">({Math.round(loopDuration)}s)</span>
        </div>
      </div>

      {/* 2. Visual Interactive Range Slider */}
      <div className="space-y-1 bg-zinc-900/80 p-3 rounded-2xl border border-zinc-800/90">
        <div className="flex justify-between items-center text-[10px] font-mono text-zinc-400 px-1">
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-amber-400 inline-block" />
            Drag handles A &amp; B or slide range
          </span>
          <span className={activeLoop?.enabled ? 'font-bold text-amber-400' : 'text-zinc-400'}>
            {activeLoop?.enabled ? 'Looping Active' : 'Previewing'}
          </span>
        </div>

        {/* Dual Handle Range Slider */}
        <RangeSlider
          startValue={startSec}
          endValue={endSec}
          min={0}
          max={safeDuration}
          step={0.25}
          currentPlaybackPosition={currentPosition}
          onChange={handleSliderChange}
          onCommit={handleSliderCommit}
        />

        <div className="flex justify-between text-[10px] font-mono text-zinc-500 px-0.5 pt-0.5">
          <span>0:00</span>
          <span>Playback at {formatDuration(currentPosition)}</span>
          <span>{formatDuration(safeDuration)}</span>
        </div>
      </div>

      {/* 3. Minimalist Fine-Tuning Cards for A and B */}
      <div className="grid grid-cols-2 gap-2">
        {/* Point A Controls */}
        <div className="bg-zinc-900/90 p-2.5 rounded-xl border border-zinc-800 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-bold text-amber-400 flex items-center gap-1">
              <span className="size-4 rounded-full bg-amber-500 text-black flex items-center justify-center text-[9px] font-mono font-bold">
                A
              </span>
              Start Point
            </span>
            <span className="font-mono font-bold text-white">{formatDuration(startSec)}</span>
          </div>

          <div className="flex items-center justify-between gap-1">
            <button
              onClick={() => nudgeStart(-1)}
              className="py-1 px-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[10px] font-mono font-bold active:scale-95 transition-all cursor-pointer"
              title="Nudge Point A backward 1s"
            >
              -1s
            </button>
            <button
              onClick={() => {
                const cur = Math.max(0, Math.min(endSec - 0.5, currentPosition));
                setStartSec(cur);
                if (activeLoop?.enabled) onSetLoop(cur, endSec);
              }}
              className="py-1 px-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-bold active:scale-95 transition-all cursor-pointer"
              title="Set Point A to current playback time"
            >
              Now
            </button>
            <button
              onClick={() => nudgeStart(1)}
              className="py-1 px-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[10px] font-mono font-bold active:scale-95 transition-all cursor-pointer"
              title="Nudge Point A forward 1s"
            >
              +1s
            </button>
          </div>
        </div>

        {/* Point B Controls */}
        <div className="bg-zinc-900/90 p-2.5 rounded-xl border border-zinc-800 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-bold text-amber-400 flex items-center gap-1">
              <span className="size-4 rounded-full bg-amber-500 text-black flex items-center justify-center text-[9px] font-mono font-bold">
                B
              </span>
              End Point
            </span>
            <span className="font-mono font-bold text-white">{formatDuration(endSec)}</span>
          </div>

          <div className="flex items-center justify-between gap-1">
            <button
              onClick={() => nudgeEnd(-1)}
              className="py-1 px-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[10px] font-mono font-bold active:scale-95 transition-all cursor-pointer"
              title="Nudge Point B backward 1s"
            >
              -1s
            </button>
            <button
              onClick={() => {
                const cur = Math.min(safeDuration, Math.max(startSec + 0.5, currentPosition));
                setEndSec(cur);
                if (activeLoop?.enabled) onSetLoop(startSec, cur);
              }}
              className="py-1 px-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-bold active:scale-95 transition-all cursor-pointer"
              title="Set Point B to current playback time"
            >
              Now
            </button>
            <button
              onClick={() => nudgeEnd(1)}
              className="py-1 px-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[10px] font-mono font-bold active:scale-95 transition-all cursor-pointer"
              title="Nudge Point B forward 1s"
            >
              +1s
            </button>
          </div>
        </div>
      </div>

      {/* 4. Minimalist Quick Interval Presets */}
      <div className="space-y-1.5 pt-0.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block px-0.5">
          Quick Interval Presets
        </span>
        <div className="grid grid-cols-4 gap-1.5">
          {[
            { label: '5s Loop', len: 5 },
            { label: '10s Loop', len: 10 },
            { label: '15s Loop', len: 15 },
            { label: '30s Loop', len: 30 }
          ].map((preset) => (
            <button
              key={preset.len}
              onClick={() => applyPreset(preset.len)}
              className="py-1.5 px-1 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 hover:border-zinc-700 text-[10px] font-mono font-semibold transition-all active:scale-95 cursor-pointer text-center"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* 5. Primary Commit & Toggle Action */}
      <div className="pt-1 flex items-center gap-2">
        <button
          onClick={handleActivateOrToggle}
          className={`flex-1 py-2.5 px-3 rounded-2xl text-xs font-bold transition-all active:scale-98 shadow-sm flex items-center justify-center gap-2 cursor-pointer ${
            activeLoop?.enabled
              ? 'bg-amber-400 hover:bg-amber-300 text-black font-extrabold shadow-amber-500/25 ring-2 ring-amber-400/40'
              : 'bg-white hover:bg-zinc-200 text-black font-extrabold shadow-white/20'
          }`}
        >
          {activeLoop?.enabled ? (
            <>
              <Check size={14} strokeWidth={2.5} />
              <span>Active Repeat Loop ({formatDuration(startSec)}–{formatDuration(endSec)})</span>
            </>
          ) : (
            <>
              <RotateCcw size={14} />
              <span>Activate Loop ({formatDuration(startSec)} → {formatDuration(endSec)})</span>
            </>
          )}
        </button>

        {activeLoop?.enabled && (
          <button
            onClick={onClearLoop}
            className="py-2.5 px-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-rose-400 border border-rose-900/40 hover:border-rose-700 text-xs font-bold transition-all active:scale-95 cursor-pointer"
            title="Clear repeat loop"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
};
