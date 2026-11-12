import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Play,
  Pause,
  Scissors,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Volume2
} from 'lucide-react';
import { formatDuration } from '@/services/learningEngine';

export interface AudioTrimmerProps {
  durationSeconds: number;
  audioUrl?: string | null;
  waveformPeaks?: number[];
  initialStartSeconds?: number;
  initialEndSeconds?: number;
  onTrimChange: (start: number, end: number, fadeIn: boolean, fadeOut: boolean) => void;
  className?: string;
}

export const AudioTrimmer: React.FC<AudioTrimmerProps> = ({
  durationSeconds,
  audioUrl,
  waveformPeaks = [],
  initialStartSeconds = 0,
  initialEndSeconds,
  onTrimChange,
  className = ''
}) => {
  const totalDuration = Math.max(0.5, durationSeconds);
  const [startSeconds, setStartSeconds] = useState(initialStartSeconds);
  const [endSeconds, setEndSeconds] = useState(initialEndSeconds ?? totalDuration);
  const [fadeIn, setFadeIn] = useState(true);
  const [fadeOut, setFadeOut] = useState(true);
  const [showFineTune, setShowFineTune] = useState(false);

  // Playback preview state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(startSeconds);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Keep references to current boundaries for audio event listeners
  const startSecondsRef = useRef(startSeconds);
  startSecondsRef.current = startSeconds;
  const endSecondsRef = useRef(endSeconds);
  endSecondsRef.current = endSeconds;

  // Dragging state
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [activeDrag, setActiveDrag] = useState<'start' | 'end' | 'window' | null>(null);
  const dragStartXRef = useRef<number>(0);
  const dragInitialStartRef = useRef<number>(0);
  const dragInitialEndRef = useRef<number>(0);

  // Normalized peaks: exactly 48 clean vertical bars
  const peaks = useMemo(() => {
    if (waveformPeaks.length >= 20) {
      const targetCount = 48;
      const resampled: number[] = [];
      const step = waveformPeaks.length / targetCount;
      for (let i = 0; i < targetCount; i++) {
        const idx = Math.min(waveformPeaks.length - 1, Math.floor(i * step));
        resampled.push(Math.max(12, Math.min(100, waveformPeaks[idx])));
      }
      return resampled;
    }
    // Natural fallback audio curve
    return Array.from({ length: 48 }, (_, i) => {
      const normalized = i / 48;
      const envelope = Math.sin(normalized * Math.PI);
      const ripple = Math.sin(i * 0.7) * 20 + Math.cos(i * 1.3) * 15;
      return Math.max(15, Math.min(95, Math.round(25 + envelope * 45 + ripple)));
    });
  }, [waveformPeaks]);

  // Sync state to parent
  useEffect(() => {
    onTrimChange(startSeconds, endSeconds, fadeIn, fadeOut);
  }, [startSeconds, endSeconds, fadeIn, fadeOut, onTrimChange]);

  // Audio preview playback sync: Recreated ONLY when audioUrl changes!
  useEffect(() => {
    if (!audioUrl) return;

    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    const handleTimeUpdate = () => {
      if (!audio) return;
      setCurrentTime(audio.currentTime);

      // Loop or pause when reaching current end boundary
      if (audio.currentTime >= endSecondsRef.current) {
        audio.pause();
        audio.currentTime = startSecondsRef.current;
        setCurrentTime(startSecondsRef.current);
        setIsPlaying(false);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      if (audio) {
        audio.currentTime = startSecondsRef.current;
        setCurrentTime(startSecondsRef.current);
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audioRef.current = null;
    };
  }, [audioUrl]);

  // Toggle Play / Pause preview of trimmed region
  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      // If playhead is outside current trim range, cue to start
      if (audio.currentTime < startSecondsRef.current || audio.currentTime >= endSecondsRef.current) {
        audio.currentTime = startSecondsRef.current;
        setCurrentTime(startSecondsRef.current);
      }
      audio.play().then(() => {
        setIsPlaying(true);
      }).catch(err => console.warn('Preview play warning:', err));
    }
  };

  // Convert pixel offset to seconds
  const pixelToSeconds = useCallback((clientX: number) => {
    if (!trackRef.current) return 0;
    const rect = trackRef.current.getBoundingClientRect();
    const clampedX = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const ratio = clampedX / rect.width;
    return Number((ratio * totalDuration).toFixed(2));
  }, [totalDuration]);

  // Pointer drag listeners for Left Handle, Right Handle, or entire Selection Window
  const handlePointerDown = (type: 'start' | 'end' | 'window', e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveDrag(type);
    dragStartXRef.current = e.clientX;
    dragInitialStartRef.current = startSeconds;
    dragInitialEndRef.current = endSeconds;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!activeDrag || !trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const deltaPixels = e.clientX - dragStartXRef.current;
    const deltaSeconds = (deltaPixels / rect.width) * totalDuration;

    if (activeDrag === 'start') {
      const newStart = Math.max(0, Math.min(endSeconds - 0.2, dragInitialStartRef.current + deltaSeconds));
      setStartSeconds(Number(newStart.toFixed(2)));
      if (audioRef.current && isPlaying) {
        audioRef.current.currentTime = newStart;
      }
    } else if (activeDrag === 'end') {
      const newEnd = Math.min(totalDuration, Math.max(startSeconds + 0.2, dragInitialEndRef.current + deltaSeconds));
      setEndSeconds(Number(newEnd.toFixed(2)));
    } else if (activeDrag === 'window') {
      const windowLen = dragInitialEndRef.current - dragInitialStartRef.current;
      let newStart = dragInitialStartRef.current + deltaSeconds;
      let newEnd = dragInitialEndRef.current + deltaSeconds;

      if (newStart < 0) {
        newStart = 0;
        newEnd = windowLen;
      } else if (newEnd > totalDuration) {
        newEnd = totalDuration;
        newStart = totalDuration - windowLen;
      }

      setStartSeconds(Number(newStart.toFixed(2)));
      setEndSeconds(Number(newEnd.toFixed(2)));
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (activeDrag) {
      setActiveDrag(null);
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
  };

  // Direct track click (seek or jump)
  const handleTrackClick = (e: React.MouseEvent) => {
    if (activeDrag) return;
    const clickedSec = pixelToSeconds(e.clientX);
    if (clickedSec < startSeconds) {
      setStartSeconds(clickedSec);
    } else if (clickedSec > endSeconds) {
      setEndSeconds(clickedSec);
    } else {
      if (audioRef.current) {
        audioRef.current.currentTime = clickedSec;
        setCurrentTime(clickedSec);
      }
    }
  };

  // Stepper fine-tuning
  const adjustStart = (delta: number) => {
    setStartSeconds(prev => Math.max(0, Math.min(endSeconds - 0.2, Number((prev + delta).toFixed(2)))));
  };

  const adjustEnd = (delta: number) => {
    setEndSeconds(prev => Math.min(totalDuration, Math.max(startSeconds + 0.2, Number((prev + delta).toFixed(2)))));
  };

  // Presets
  const applyPreset = (preset: 'full' | 'intro1' | 'outro1' | 'reset') => {
    if (preset === 'full' || preset === 'reset') {
      setStartSeconds(0);
      setEndSeconds(totalDuration);
    } else if (preset === 'intro1') {
      const cut = Math.min(1.5, totalDuration * 0.25);
      setStartSeconds(Number(cut.toFixed(2)));
    } else if (preset === 'outro1') {
      const cut = Math.max(startSeconds + 0.3, totalDuration - 1.5);
      setEndSeconds(Number(cut.toFixed(2)));
    }
  };

  // Percent calculations for styling
  const startPct = Math.max(0, Math.min(100, (startSeconds / totalDuration) * 100));
  const endPct = Math.max(0, Math.min(100, (endSeconds / totalDuration) * 100));
  const playheadPct = Math.max(0, Math.min(100, (currentTime / totalDuration) * 100));
  const selectedDuration = Math.max(0.1, endSeconds - startSeconds);

  // Time format helper with tenths: 0:04.2
  const formatAccurate = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    const tenths = Math.floor((sec % 1) * 10);
    return `${mins}:${secs.toString().padStart(2, '0')}.${tenths}`;
  };

  // Adaptive, non-overlapping ruler ticks generator
  const rulerTicks = useMemo(() => {
    const ticks: { label: string; pct: number }[] = [];
    let step = 1;
    let formatTenths = false;

    if (totalDuration <= 3) {
      step = 0.5;
      formatTenths = true;
    } else if (totalDuration <= 8) {
      step = 1;
    } else if (totalDuration <= 20) {
      step = 2;
    } else if (totalDuration <= 60) {
      step = 5;
    } else if (totalDuration <= 180) {
      step = 15;
    } else if (totalDuration <= 600) {
      step = 30;
    } else {
      step = 60;
    }

    const count = Math.floor(totalDuration / step);
    for (let i = 0; i <= count; i++) {
      const time = i * step;
      const pct = (time / totalDuration) * 100;
      let label = '';
      if (formatTenths) {
        label = `${time.toFixed(1)}s`;
      } else if (time >= 60) {
        const m = Math.floor(time / 60);
        const s = Math.floor(time % 60);
        label = `${m}:${s.toString().padStart(2, '0')}`;
      } else {
        label = `${Math.round(time)}s`;
      }
      ticks.push({ label, pct });
    }

    // Ensure final duration is displayed if not close to last tick
    const lastTickTime = count * step;
    if (totalDuration - lastTickTime > step * 0.4) {
      const finalLabel = totalDuration >= 60
        ? `${Math.floor(totalDuration / 60)}:${Math.floor(totalDuration % 60).toString().padStart(2, '0')}`
        : `${Math.round(totalDuration)}s`;
      ticks.push({ label: finalLabel, pct: 100 });
    }

    return ticks;
  }, [totalDuration]);

  return (
    <div className={`bg-white border border-slate-200/90 rounded-3xl p-4 shadow-2xs select-none space-y-3.5 ${className}`}>
      {/* Top Header: Title, Trim Stats & Badges */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-2xs">
            <Scissors size={15} strokeWidth={2.4} />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-950 uppercase tracking-wider">
              Visual Audio Trimmer
            </h3>
            <p className="text-[10px] text-slate-400 font-mono">
              Drag handles to crop recording
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 shadow-2xs">
            <span>{formatAccurate(startSeconds)}</span>
            <span className="text-emerald-400">→</span>
            <span>{formatAccurate(endSeconds)}</span>
            <span className="text-slate-400 font-normal">({formatDuration(Math.round(selectedDuration))})</span>
          </span>
        </div>
      </div>

      {/* TIMELINE RULER & WAVEFORM CANVAS */}
      <div className="space-y-1.5 pt-0.5">
        {/* Adaptive Timeline Ruler */}
        <div className="relative h-4 px-1 text-[9px] font-mono text-slate-400 select-none overflow-hidden">
          {rulerTicks.map((tick, idx) => (
            <div
              key={idx}
              className="absolute -translate-x-1/2 flex flex-col items-center"
              style={{ left: `${Math.min(98, Math.max(2, tick.pct))}%` }}
            >
              <span>{tick.label}</span>
              <div className="w-px h-1 bg-slate-300 mt-0.5" />
            </div>
          ))}
        </div>

        {/* Waveform Track Container (Modern Studio Track) */}
        <div
          ref={trackRef}
          onClick={handleTrackClick}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="relative h-24 bg-slate-950 rounded-2xl overflow-hidden cursor-crosshair touch-none border border-slate-800/80 shadow-inner group"
        >
          {/* Subtle Studio Grid Lines */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px)] bg-[size:10%_100%] pointer-events-none" />

          {/* Background Full Waveform (Dimmed Slate) */}
          <div className="absolute inset-0 flex items-center justify-between px-2 gap-0.5 opacity-25 pointer-events-none">
            {peaks.map((val, idx) => (
              <div
                key={idx}
                className="flex-1 bg-slate-400 rounded-full"
                style={{ height: `${val}%` }}
              />
            ))}
          </div>

          {/* ACTIVE TRIM SELECTION REGION (Vibrant Waveform inside selection) */}
          <div
            onPointerDown={(e) => handlePointerDown('window', e)}
            className="absolute top-0 bottom-0 bg-emerald-500/15 border-y border-emerald-400/40 cursor-grab active:cursor-grabbing z-10 transition-colors hover:bg-emerald-500/20"
            style={{
              left: `${startPct}%`,
              width: `${Math.max(0.5, endPct - startPct)}%`
            }}
          >
            {/* Waveform inside selection: Glowing Emerald Bars */}
            <div className="absolute inset-0 flex items-center justify-between px-1 gap-0.5 pointer-events-none">
              {peaks.map((val, idx) => {
                const barPct = (idx / peaks.length) * 100;
                const isInside = barPct >= startPct && barPct <= endPct;
                return (
                  <div
                    key={idx}
                    className={`flex-1 rounded-full transition-opacity duration-150 ${
                      isInside ? 'bg-gradient-to-t from-emerald-500 to-teal-300 opacity-100 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'opacity-0'
                    }`}
                    style={{ height: `${val}%` }}
                  />
                );
              })}
            </div>
          </div>

          {/* LEFT HANDLE (START CROP) */}
          <div
            onPointerDown={(e) => handlePointerDown('start', e)}
            className="absolute top-0 bottom-0 z-20 w-5 -translate-x-1/2 flex flex-col items-center justify-center cursor-ew-resize select-none touch-none"
            style={{ left: `${startPct}%` }}
          >
            {/* Full-height tactile grip bar */}
            <div className="w-2 h-full bg-emerald-400 hover:bg-emerald-300 rounded-l-md shadow-lg flex flex-col items-center justify-center gap-1 transition-colors">
              <div className="w-0.5 h-3 bg-slate-950/60 rounded-full" />
              <div className="w-0.5 h-3 bg-slate-950/60 rounded-full" />
            </div>

            {/* Floating Timecode Pill */}
            {(activeDrag === 'start' || activeDrag === 'window') && (
              <div className="absolute -top-7 bg-slate-900 text-emerald-300 font-mono text-[9px] font-bold px-1.5 py-0.5 rounded-md border border-slate-700 shadow-md whitespace-nowrap pointer-events-none z-30">
                {formatAccurate(startSeconds)}
              </div>
            )}
          </div>

          {/* RIGHT HANDLE (END CROP) */}
          <div
            onPointerDown={(e) => handlePointerDown('end', e)}
            className="absolute top-0 bottom-0 z-20 w-5 -translate-x-1/2 flex flex-col items-center justify-center cursor-ew-resize select-none touch-none"
            style={{ left: `${endPct}%` }}
          >
            {/* Full-height tactile grip bar */}
            <div className="w-2 h-full bg-emerald-400 hover:bg-emerald-300 rounded-r-md shadow-lg flex flex-col items-center justify-center gap-1 transition-colors">
              <div className="w-0.5 h-3 bg-slate-950/60 rounded-full" />
              <div className="w-0.5 h-3 bg-slate-950/60 rounded-full" />
            </div>

            {/* Floating Timecode Pill */}
            {(activeDrag === 'end' || activeDrag === 'window') && (
              <div className="absolute -top-7 bg-slate-900 text-emerald-300 font-mono text-[9px] font-bold px-1.5 py-0.5 rounded-md border border-slate-700 shadow-md whitespace-nowrap pointer-events-none z-30">
                {formatAccurate(endSeconds)}
              </div>
            )}
          </div>

          {/* PLAYHEAD SCRUBBER */}
          {isPlaying && (
            <div
              className="absolute top-0 bottom-0 z-25 w-0.5 bg-white pointer-events-none shadow-[0_0_8px_rgba(255,255,255,0.8)]"
              style={{ left: `${playheadPct}%` }}
            >
              <div className="w-2 h-2 -translate-x-1/2 rounded-full bg-white shadow-sm -mt-0.5" />
            </div>
          )}
        </div>
      </div>

      {/* MINIMALIST CONTROLS ROW */}
      <div className="flex items-center justify-between gap-2 pt-0.5">
        {/* Play/Pause Preview Button */}
        <button
          type="button"
          onClick={togglePlay}
          className="h-9 px-3.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-semibold text-xs flex items-center gap-2 active:scale-95 transition-all shadow-2xs cursor-pointer shrink-0"
        >
          {isPlaying ? (
            <>
              <Pause size={13} fill="currentColor" />
              <span>Pause</span>
            </>
          ) : (
            <>
              <Play size={13} fill="currentColor" className="translate-x-0.5" />
              <span>Preview</span>
            </>
          )}
        </button>

        {/* Quick Crop Presets */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
          <button
            type="button"
            onClick={() => applyPreset('full')}
            className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-[10px] font-semibold text-slate-700 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
            title="Reset to full recording"
          >
            <RotateCcw size={10} className="inline mr-1 -mt-0.5 text-slate-500" />
            Full
          </button>

          <button
            type="button"
            onClick={() => applyPreset('intro1')}
            className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-[10px] font-semibold text-slate-700 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
            title="Cut first 1.5s intro silence"
          >
            -Intro
          </button>

          <button
            type="button"
            onClick={() => applyPreset('outro1')}
            className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-[10px] font-semibold text-slate-700 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
            title="Cut last 1.5s outro"
          >
            -Outro
          </button>
        </div>

        {/* Toggle Fine-Tune Drawer */}
        <button
          type="button"
          onClick={() => setShowFineTune(!showFineTune)}
          className={`h-8 px-2 rounded-lg border text-[11px] font-medium flex items-center gap-1 transition-all cursor-pointer ${
            showFineTune
              ? 'bg-slate-900 border-slate-900 text-white'
              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
          title="Fine-tune audio cut points"
        >
          <SlidersHorizontal size={12} />
          <span>Tune</span>
          {showFineTune ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      </div>

      {/* COLLAPSIBLE FINE-TUNING DRAWER */}
      {showFineTune && (
        <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 animate-in fade-in duration-200">
          {/* Start Steppers */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-2 space-y-1">
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="text-slate-500 uppercase font-semibold">Start Cut</span>
              <span className="font-bold text-slate-950 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                {formatAccurate(startSeconds)}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {[-1.0, -0.1, 0.1, 1.0].map((step) => (
                <button
                  key={step}
                  type="button"
                  onClick={() => adjustStart(step)}
                  className="py-1 rounded-md bg-white hover:bg-slate-100 border border-slate-200 text-[9px] font-mono font-bold text-slate-700 active:scale-95 transition-all cursor-pointer shadow-2xs"
                >
                  {step > 0 ? `+${step}` : step}s
                </button>
              ))}
            </div>
          </div>

          {/* End Steppers */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-2 space-y-1">
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="text-slate-500 uppercase font-semibold">End Cut</span>
              <span className="font-bold text-slate-950 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                {formatAccurate(endSeconds)}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {[-1.0, -0.1, 0.1, 1.0].map((step) => (
                <button
                  key={step}
                  type="button"
                  onClick={() => adjustEnd(step)}
                  className="py-1 rounded-md bg-white hover:bg-slate-100 border border-slate-200 text-[9px] font-mono font-bold text-slate-700 active:scale-95 transition-all cursor-pointer shadow-2xs"
                >
                  {step > 0 ? `+${step}` : step}s
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* AUDIO FADE SETTINGS ROW */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px] text-slate-600">
        <div className="flex items-center gap-1 text-slate-400 font-medium">
          <Volume2 size={12} />
          <span>Smooth Transitions</span>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 cursor-pointer font-medium hover:text-slate-900 transition-colors">
            <input
              type="checkbox"
              checked={fadeIn}
              onChange={(e) => setFadeIn(e.target.checked)}
              className="w-3.5 h-3.5 rounded text-emerald-600 accent-emerald-600 cursor-pointer"
            />
            <span>Fade In</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer font-medium hover:text-slate-900 transition-colors">
            <input
              type="checkbox"
              checked={fadeOut}
              onChange={(e) => setFadeOut(e.target.checked)}
              className="w-3.5 h-3.5 rounded text-emerald-600 accent-emerald-600 cursor-pointer"
            />
            <span>Fade Out</span>
          </label>
        </div>
      </div>
    </div>
  );
};
