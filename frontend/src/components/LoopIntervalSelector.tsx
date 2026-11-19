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
    <div className="space-y-3 select-none text-slate-900">
      {/* 1. Unified Loop Studio Card (Header + Dual Slider) */}
      <div className="bg-slate-50/90 p-3 sm:p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <div
              className={`size-6 rounded-lg flex items-center justify-center transition-colors ${
                activeLoop?.enabled ? 'bg-amber-100 text-amber-700' : 'bg-slate-200/70 text-slate-600'
              }`}
            >
              <BookmarkCheck
                size={14}
                className={activeLoop?.enabled ? 'text-amber-600' : 'text-slate-500'}
              />
            </div>
            <span className="font-bold text-slate-800">Repeat Interval</span>
          </div>

          <div className="flex items-center gap-1.5 font-mono text-[11px]">
            <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded-lg border border-slate-200 shadow-2xs">
              {formatDuration(startSec)} → {formatDuration(endSec)}
            </span>
            <span className="text-slate-500 font-semibold text-[10.5px]">({Math.round(loopDuration)}s)</span>
          </div>
        </div>

        <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 px-0.5">
          <span className="flex items-center gap-1.5">
            <span
              className={`size-1.5 rounded-full ${
                activeLoop?.enabled ? 'bg-amber-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            Drag handles A &amp; B or slide range
          </span>
          <span
            className={`font-semibold px-1.5 py-0.5 rounded-md text-[10px] ${
              activeLoop?.enabled ? 'bg-amber-100 text-amber-800 font-bold' : 'text-slate-500'
            }`}
          >
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

        <div className="flex justify-between text-[10px] font-mono text-slate-400 px-0.5">
          <span>0:00</span>
          <span className="text-slate-600 font-medium flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-emerald-500 inline-block" />
            Playback at {formatDuration(currentPosition)}
          </span>
          <span>{formatDuration(safeDuration)}</span>
        </div>
      </div>

      {/* 2. Precision Stepper Fine-Tuning Cards for A and B */}
      <div className="grid grid-cols-2 gap-2">
        {/* Point A Controls */}
        <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-200/90 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-bold text-amber-700 flex items-center gap-1.5">
              <span className="size-4 rounded-full bg-amber-500 text-white flex items-center justify-center text-[9px] font-mono font-bold shadow-2xs">
                A
              </span>
              Start Point
            </span>
            <span className="font-mono font-bold text-slate-900 bg-white px-1.5 py-0.5 rounded border border-slate-200/80 text-[11px] shadow-2xs">
              {formatDuration(startSec)}
            </span>
          </div>

          <div className="flex items-center justify-between gap-1 bg-white p-0.5 rounded-lg border border-slate-200/90 shadow-2xs">
            <button
              type="button"
              onClick={() => nudgeStart(-1)}
              className="flex-1 py-1 px-1 rounded-md hover:bg-slate-100 text-slate-700 text-[10px] font-mono font-bold active:scale-95 transition-all cursor-pointer text-center"
              title="Nudge Point A backward 1s"
            >
              -1s
            </button>
            <button
              type="button"
              onClick={() => {
                const cur = Math.max(0, Math.min(endSec - 0.5, currentPosition));
                setStartSec(cur);
                if (activeLoop?.enabled) onSetLoop(cur, endSec);
              }}
              className="flex-1 py-1 px-1 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/70 text-[10px] font-mono font-bold active:scale-95 transition-all cursor-pointer text-center shadow-2xs"
              title="Set Point A to current playback time"
            >
              Now
            </button>
            <button
              type="button"
              onClick={() => nudgeStart(1)}
              className="flex-1 py-1 px-1 rounded-md hover:bg-slate-100 text-slate-700 text-[10px] font-mono font-bold active:scale-95 transition-all cursor-pointer text-center"
              title="Nudge Point A forward 1s"
            >
              +1s
            </button>
          </div>
        </div>

        {/* Point B Controls */}
        <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-200/90 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-bold text-amber-700 flex items-center gap-1.5">
              <span className="size-4 rounded-full bg-amber-500 text-white flex items-center justify-center text-[9px] font-mono font-bold shadow-2xs">
                B
              </span>
              End Point
            </span>
            <span className="font-mono font-bold text-slate-900 bg-white px-1.5 py-0.5 rounded border border-slate-200/80 text-[11px] shadow-2xs">
              {formatDuration(endSec)}
            </span>
          </div>

          <div className="flex items-center justify-between gap-1 bg-white p-0.5 rounded-lg border border-slate-200/90 shadow-2xs">
            <button
              type="button"
              onClick={() => nudgeEnd(-1)}
              className="flex-1 py-1 px-1 rounded-md hover:bg-slate-100 text-slate-700 text-[10px] font-mono font-bold active:scale-95 transition-all cursor-pointer text-center"
              title="Nudge Point B backward 1s"
            >
              -1s
            </button>
            <button
              type="button"
              onClick={() => {
                const cur = Math.min(safeDuration, Math.max(startSec + 0.5, currentPosition));
                setEndSec(cur);
                if (activeLoop?.enabled) onSetLoop(startSec, cur);
              }}
              className="flex-1 py-1 px-1 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/70 text-[10px] font-mono font-bold active:scale-95 transition-all cursor-pointer text-center shadow-2xs"
              title="Set Point B to current playback time"
            >
              Now
            </button>
            <button
              type="button"
              onClick={() => nudgeEnd(1)}
              className="flex-1 py-1 px-1 rounded-md hover:bg-slate-100 text-slate-700 text-[10px] font-mono font-bold active:scale-95 transition-all cursor-pointer text-center"
              title="Nudge Point B forward 1s"
            >
              +1s
            </button>
          </div>
        </div>
      </div>

      {/* 3. Sleek Quick Interval Presets */}
      <div className="space-y-1.5 pt-0.5">
        <div className="flex items-center justify-between px-0.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Quick Interval Presets
          </span>
          <span className="text-[10px] font-mono text-slate-400">from current time</span>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {[
            { label: '5s Loop', len: 5 },
            { label: '10s Loop', len: 10 },
            { label: '15s Loop', len: 15 },
            { label: '30s Loop', len: 30 }
          ].map((preset) => (
            <button
              key={preset.len}
              type="button"
              onClick={() => applyPreset(preset.len)}
              className="py-1.5 px-1 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 hover:border-amber-300 text-[10px] font-mono font-bold transition-all active:scale-95 cursor-pointer text-center shadow-2xs"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Primary Commit & Toggle Action */}
      <div className="pt-0.5 flex items-center gap-2">
        <button
          type="button"
          onClick={handleActivateOrToggle}
          className={`flex-1 py-2.5 px-3 rounded-2xl text-xs font-bold transition-all active:scale-[0.98] shadow-sm flex items-center justify-center gap-2 cursor-pointer ${
            activeLoop?.enabled
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-extrabold shadow-amber-500/25 ring-2 ring-amber-400/40'
              : 'bg-slate-900 hover:bg-slate-800 text-white font-extrabold shadow-slate-900/15'
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
            type="button"
            onClick={onClearLoop}
            className="py-2.5 px-3 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-2xs"
            title="Clear repeat loop"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
};
