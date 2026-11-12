import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  Scissors
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
  const totalDuration = Math.max(1, durationSeconds);
  const [startSeconds, setStartSeconds] = useState(initialStartSeconds);
  const [endSeconds, setEndSeconds] = useState(initialEndSeconds ?? totalDuration);
  const [fadeIn, setFadeIn] = useState(true);
  const [fadeOut, setFadeOut] = useState(true);

  // Playback preview state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(startSeconds);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Dragging state
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [activeDrag, setActiveDrag] = useState<'start' | 'end' | 'window' | null>(null);
  const dragStartXRef = useRef<number>(0);
  const dragInitialStartRef = useRef<number>(0);
  const dragInitialEndRef = useRef<number>(0);

  // Normalize peaks
  const peaks = waveformPeaks.length > 0
    ? waveformPeaks
    : new Array(40).fill(0).map((_, i) => 20 + Math.sin(i * 0.4) * 30 + (i % 3) * 15);

  // Notify parent on change
  useEffect(() => {
    onTrimChange(startSeconds, endSeconds, fadeIn, fadeOut);
  }, [startSeconds, endSeconds, fadeIn, fadeOut, onTrimChange]);

  // Audio preview playback sync
  useEffect(() => {
    if (!audioUrl) return;
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    const handleTimeUpdate = () => {
      if (!audio) return;
      setCurrentTime(audio.currentTime);

      // Loop or stop at trim boundary
      if (audio.currentTime >= endSeconds) {
        audio.pause();
        audio.currentTime = startSeconds;
        setCurrentTime(startSeconds);
        setIsPlaying(false);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      if (audio) {
        audio.currentTime = startSeconds;
        setCurrentTime(startSeconds);
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
  }, [audioUrl, startSeconds, endSeconds]);

  // Toggle Play / Pause preview of trimmed region
  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      // If outside boundary, jump to start
      if (audio.currentTime < startSeconds || audio.currentTime >= endSeconds) {
        audio.currentTime = startSeconds;
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
      const newStart = Math.max(0, Math.min(endSeconds - 0.5, dragInitialStartRef.current + deltaSeconds));
      setStartSeconds(Number(newStart.toFixed(2)));
      if (audioRef.current && isPlaying) {
        audioRef.current.currentTime = newStart;
      }
    } else if (activeDrag === 'end') {
      const newEnd = Math.min(totalDuration, Math.max(startSeconds + 0.5, dragInitialEndRef.current + deltaSeconds));
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
      // Seek within window
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
  const applyPreset = (preset: 'full' | 'intro3' | 'outro3' | 'playhead') => {
    if (preset === 'full') {
      setStartSeconds(0);
      setEndSeconds(totalDuration);
    } else if (preset === 'intro3') {
      setStartSeconds(Math.min(3, totalDuration * 0.3));
    } else if (preset === 'outro3') {
      setEndSeconds(Math.max(startSeconds + 0.5, totalDuration - 3));
    } else if (preset === 'playhead') {
      setStartSeconds(currentTime);
    }
  };

  // Percent calculations for styling
  const startPct = (startSeconds / totalDuration) * 100;
  const endPct = (endSeconds / totalDuration) * 100;
  const playheadPct = (currentTime / totalDuration) * 100;
  const selectedDuration = Math.max(0.1, endSeconds - startSeconds);

  // Time format helper with tenths: 00:04.2
  const formatAccurate = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    const tenths = Math.floor((sec % 1) * 10);
    return `${mins}:${secs.toString().padStart(2, '0')}.${tenths}`;
  };

  // Ruler tick marks (e.g. 5 or 6 ticks)
  const rulerTicks = [];
  const numTicks = 6;
  for (let i = 0; i <= numTicks; i++) {
    const sec = (totalDuration / numTicks) * i;
    rulerTicks.push({
      sec: Math.round(sec),
      pct: (i / numTicks) * 100
    });
  }

  return (
    <div className={`space-y-3.5 bg-white border border-slate-200/90 rounded-3xl p-4.5 shadow-2xs select-none ${className}`}>
      {/* Header with Title and Current Selection Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shadow-2xs">
            <Scissors size={15} />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-950 uppercase tracking-wider">
              Visual Audio Trimmer
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">
              Drag handles or use steppers
            </span>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[11px] font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full inline-block">
            {formatAccurate(startSeconds)} → {formatAccurate(endSeconds)} ({formatDuration(Math.round(selectedDuration))})
          </span>
        </div>
      </div>

      {/* TIMELINE RULER & WAVEFORM CANVAS */}
      <div className="space-y-1 pt-1">
        {/* Timeline Ruler (Seconds Ticks) */}
        <div className="relative h-4 px-1 text-[9px] font-mono text-slate-400 select-none">
          {rulerTicks.map((tick, idx) => (
            <div
              key={idx}
              className="absolute -translate-x-1/2 flex flex-col items-center"
              style={{ left: `${tick.pct}%` }}
            >
              <span>{tick.sec}s</span>
              <div className="w-px h-1 bg-slate-300 mt-0.5" />
            </div>
          ))}
        </div>

        {/* Waveform Track Container */}
        <div
          ref={trackRef}
          onClick={handleTrackClick}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="relative h-24 bg-slate-50 border border-slate-200/80 rounded-2xl overflow-hidden cursor-crosshair touch-none"
        >
          {/* Background Full Waveform (Dimmed) */}
          <div className="absolute inset-0 flex items-center justify-between px-2 gap-0.5 opacity-30 pointer-events-none">
            {peaks.map((val, idx) => (
              <div
                key={idx}
                className="flex-1 bg-slate-400 rounded-full"
                style={{ height: `${val}%` }}
              />
            ))}
          </div>

          {/* ACTIVE TRIM SELECTION REGION (Highlighted Overlay like Image 3) */}
          <div
            onPointerDown={(e) => handlePointerDown('window', e)}
            className="absolute top-0 bottom-0 bg-emerald-500/20 border-y border-emerald-400/60 cursor-grab active:cursor-grabbing z-10 transition-colors hover:bg-emerald-500/25"
            style={{
              left: `${startPct}%`,
              width: `${Math.max(0.5, endPct - startPct)}%`
            }}
          >
            {/* Waveform inside selection: Bright Emerald */}
            <div className="absolute inset-0 flex items-center justify-between px-1 gap-0.5 pointer-events-none">
              {peaks.map((val, idx) => {
                const barPct = (idx / peaks.length) * 100;
                const isInside = barPct >= startPct && barPct <= endPct;
                return (
                  <div
                    key={idx}
                    className={`flex-1 rounded-full transition-all ${
                      isInside ? 'bg-emerald-600' : 'opacity-0'
                    }`}
                    style={{ height: `${val}%` }}
                  />
                );
              })}
            </div>
          </div>

          {/* LEFT HANDLE (TRIM START) */}
          <div
            onPointerDown={(e) => handlePointerDown('start', e)}
            className="absolute top-0 bottom-0 z-20 w-3 -translate-x-1/2 flex flex-col items-center justify-between cursor-ew-resize group select-none"
            style={{ left: `${startPct}%` }}
          >
            {/* Top Handle Badge */}
            <div className="w-3.5 h-3.5 rounded-full bg-emerald-600 shadow-md ring-2 ring-white flex items-center justify-center text-white scale-110 group-hover:scale-125 transition-transform">
              <div className="w-1 h-1 bg-white rounded-full" />
            </div>

            {/* Vertical Marker Line */}
            <div className="w-0.5 h-full bg-emerald-600 shadow-xs" />

            {/* Bottom Grab Pip */}
            <div className="w-3.5 h-3.5 rounded-full bg-emerald-600 shadow-md ring-2 ring-white flex items-center justify-center text-white scale-110 group-hover:scale-125 transition-transform">
              <div className="w-1 h-1 bg-white rounded-full" />
            </div>

            {/* Floating Time Label on Hover / Drag */}
            <div className="absolute -bottom-6 bg-slate-900 text-white font-mono text-[9px] font-bold px-1.5 py-0.5 rounded shadow-md pointer-events-none whitespace-nowrap z-30">
              {formatAccurate(startSeconds)}
            </div>
          </div>

          {/* RIGHT HANDLE (TRIM END) */}
          <div
            onPointerDown={(e) => handlePointerDown('end', e)}
            className="absolute top-0 bottom-0 z-20 w-3 -translate-x-1/2 flex flex-col items-center justify-between cursor-ew-resize group select-none"
            style={{ left: `${endPct}%` }}
          >
            {/* Top Handle Badge */}
            <div className="w-3.5 h-3.5 rounded-full bg-emerald-600 shadow-md ring-2 ring-white flex items-center justify-center text-white scale-110 group-hover:scale-125 transition-transform">
              <div className="w-1 h-1 bg-white rounded-full" />
            </div>

            {/* Vertical Marker Line */}
            <div className="w-0.5 h-full bg-emerald-600 shadow-xs" />

            {/* Bottom Grab Pip */}
            <div className="w-3.5 h-3.5 rounded-full bg-emerald-600 shadow-md ring-2 ring-white flex items-center justify-center text-white scale-110 group-hover:scale-125 transition-transform">
              <div className="w-1 h-1 bg-white rounded-full" />
            </div>

            {/* Floating Time Label on Hover / Drag */}
            <div className="absolute -bottom-6 bg-slate-900 text-white font-mono text-[9px] font-bold px-1.5 py-0.5 rounded shadow-md pointer-events-none whitespace-nowrap z-30">
              {formatAccurate(endSeconds)}
            </div>
          </div>

          {/* PLAYHEAD SCRUBBER (Follows audio position) */}
          {isPlaying && (
            <div
              className="absolute top-0 bottom-0 z-20 w-px bg-slate-950 pointer-events-none shadow-md"
              style={{ left: `${playheadPct}%` }}
            >
              <div className="w-2.5 h-2.5 -translate-x-1/2 rounded-full bg-slate-950 shadow-sm" />
            </div>
          )}
        </div>
      </div>

      {/* QUICK PRESETS ROW */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar pt-1">
        <button
          type="button"
          onClick={() => applyPreset('full')}
          className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-[11px] font-semibold text-slate-700 whitespace-nowrap active:scale-95 transition-all shadow-2xs cursor-pointer"
        >
          Keep Full
        </button>
        <button
          type="button"
          onClick={() => applyPreset('intro3')}
          className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-[11px] font-semibold text-slate-700 whitespace-nowrap active:scale-95 transition-all shadow-2xs cursor-pointer"
        >
          Trim 3s Intro
        </button>
        <button
          type="button"
          onClick={() => applyPreset('outro3')}
          className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-[11px] font-semibold text-slate-700 whitespace-nowrap active:scale-95 transition-all shadow-2xs cursor-pointer"
        >
          Trim 3s Outro
        </button>
        <button
          type="button"
          onClick={() => applyPreset('playhead')}
          className="px-2.5 py-1 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200/70 text-[11px] font-semibold text-amber-800 whitespace-nowrap active:scale-95 transition-all shadow-2xs cursor-pointer"
        >
          Start at {formatDuration(Math.floor(currentTime))}
        </button>
      </div>

      {/* NUMERIC STEPPERS FOR START AND END TIME (Fine-Tuning) */}
      <div className="grid grid-cols-2 gap-2.5 pt-0.5">
        {/* START TIME STEPPERS */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-2.5 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-slate-500 font-semibold uppercase">Start Cut</span>
            <span className="font-bold text-slate-950 bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs">
              {formatAccurate(startSeconds)}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-1">
            {[-1.0, -0.1, 0.1, 1.0].map((step) => (
              <button
                key={step}
                type="button"
                onClick={() => adjustStart(step)}
                className="py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-[10px] font-mono font-bold text-slate-700 active:scale-95 transition-all shadow-2xs cursor-pointer"
              >
                {step > 0 ? `+${step}` : step}s
              </button>
            ))}
          </div>
        </div>

        {/* END TIME STEPPERS */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-2.5 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-slate-500 font-semibold uppercase">End Cut</span>
            <span className="font-bold text-slate-950 bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs">
              {formatAccurate(endSeconds)}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-1">
            {[-1.0, -0.1, 0.1, 1.0].map((step) => (
              <button
                key={step}
                type="button"
                onClick={() => adjustEnd(step)}
                className="py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-[10px] font-mono font-bold text-slate-700 active:scale-95 transition-all shadow-2xs cursor-pointer"
              >
                {step > 0 ? `+${step}` : step}s
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* AUDIO PREVIEW CONTROLLER & FADE OPTIONS */}
      <div className="pt-1 flex items-center justify-between gap-3 border-t border-slate-100">
        {/* Play Trimmed Audio Preview Button */}
        <button
          type="button"
          onClick={togglePlay}
          className="flex-1 py-2.5 px-3 rounded-2xl bg-slate-950 hover:bg-slate-800 text-white font-semibold text-xs flex items-center justify-center gap-2 active:scale-98 transition-all shadow-xs cursor-pointer"
        >
          {isPlaying ? (
            <>
              <Pause size={14} fill="currentColor" />
              <span>Pause Trim</span>
            </>
          ) : (
            <>
              <Play size={14} fill="currentColor" className="translate-x-0.5" />
              <span>Preview Trimmed ({formatDuration(Math.round(selectedDuration))})</span>
            </>
          )}
        </button>

        {/* Fade In & Out Options (Prevents audio clicks) */}
        <div className="flex items-center gap-2 shrink-0">
          <label className="flex items-center gap-1.5 text-xs text-slate-600 font-medium cursor-pointer">
            <input
              type="checkbox"
              checked={fadeIn}
              onChange={(e) => setFadeIn(e.target.checked)}
              className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
            />
            <span>Fade In</span>
          </label>

          <label className="flex items-center gap-1.5 text-xs text-slate-600 font-medium cursor-pointer">
            <input
              type="checkbox"
              checked={fadeOut}
              onChange={(e) => setFadeOut(e.target.checked)}
              className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
            />
            <span>Fade Out</span>
          </label>
        </div>
      </div>
    </div>
  );
};
