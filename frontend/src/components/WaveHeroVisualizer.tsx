import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface WaveHeroVisualizerProps {
  isPlaying: boolean;
  subjectName: string;
  subjectColorHex?: string;
  subjectIcon: LucideIcon;
  className?: string;
}

/**
 * WaveHeroVisualizer
 * A modern, ethereal white & silver fluid wavy animation hero stage
 * that replaces the spinning vinyl disk.
 * Renders multi-layered harmonic acoustic wave sculptures on a pitch-black obsidian stage.
 */
export const WaveHeroVisualizer: React.FC<WaveHeroVisualizerProps> = ({
  isPlaying,
  subjectName,
  subjectColorHex = '#38bdf8',
  subjectIcon: SubjectIcon,
  className
}) => {
  return (
    <div
      className={cn(
        'w-full max-w-sm mx-auto aspect-square max-h-[290px] sm:max-h-[330px] relative flex flex-col items-center justify-between p-4 my-auto select-none overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-b from-zinc-900/60 via-zinc-950/80 to-black backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.9)] transition-all duration-500',
        isPlaying ? 'ring-1 ring-white/15 shadow-[0_0_50px_rgba(255,255,255,0.06)]' : 'opacity-85',
        className
      )}
    >
      {/* 1. Ambient Radial White/Silver Aura */}
      <div
        className={cn(
          'absolute inset-0 rounded-3xl transition-opacity duration-1000 pointer-events-none',
          isPlaying ? 'opacity-30' : 'opacity-10'
        )}
        style={{
          background: `radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.18) 0%, ${subjectColorHex}15 45%, transparent 70%)`
        }}
      />

      {/* 2. Floating Concept Pill at Top of Hero Stage (No Clipped Text) */}
      <div className="relative z-10 w-full flex items-center justify-between px-1 pt-1">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.07] hover:bg-white/[0.12] border border-white/15 backdrop-blur-xl shadow-lg transition-all max-w-[85%]">
          <div
            className="size-6 rounded-full flex items-center justify-center shrink-0 shadow-2xs"
            style={{ background: subjectColorHex + '33', color: subjectColorHex }}
          >
            <SubjectIcon size={13} strokeWidth={2.4} />
          </div>
          <span className="text-xs font-semibold text-white tracking-wide truncate">
            {subjectName}
          </span>
        </div>

        {/* Live Audio Activity Equalizer Indicator */}
        <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-white/[0.05] border border-white/10 backdrop-blur-md">
          {isPlaying ? (
            <span className="inline-flex items-end gap-0.5 h-3 w-3 text-white">
              <span className="w-0.5 bg-white rounded-full animate-eq-1 h-full shadow-[0_0_8px_white]" />
              <span className="w-0.5 bg-white rounded-full animate-eq-2 h-2/3 shadow-[0_0_8px_white]" />
              <span className="w-0.5 bg-white rounded-full animate-eq-3 h-4/5 shadow-[0_0_8px_white]" />
            </span>
          ) : (
            <span className="text-[10px] font-mono font-bold text-slate-400 tracking-wider">
              PAUSED
            </span>
          )}
        </div>
      </div>

      {/* 3. Centerpiece: Modern Fluid White Harmonic Wave Sculpture */}
      <div className="relative z-10 w-full flex-1 flex items-center justify-center overflow-hidden my-auto py-2">
        <svg
          viewBox="0 0 800 360"
          preserveAspectRatio="none"
          className="w-full h-full max-h-[170px] sm:max-h-[190px]"
        >
          <defs>
            {/* White/Silver Multi-stop Gradients */}
            <linearGradient id="heroWaveGrad1" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
              <stop offset="40%" stopColor="#e2e8f0" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
            </linearGradient>

            <linearGradient id="heroWaveGrad2" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#cbd5e1" stopOpacity="0.35" />
              <stop offset="50%" stopColor="#94a3b8" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0" />
            </linearGradient>

            <linearGradient id="heroWaveGrad3" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f8fafc" stopOpacity="0.55" />
              <stop offset="60%" stopColor="#ffffff" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0" />
            </linearGradient>

            <filter id="whiteGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Layer 1: Ambient Back Wave */}
          <path
            fill="url(#heroWaveGrad2)"
            className={isPlaying ? 'animate-wave-slow transition-all duration-700' : 'transition-all duration-700'}
            d={
              isPlaying
                ? 'M0,180 C120,110 240,250 360,170 C480,90 600,240 720,160 C760,135 800,150 800,180 L800,360 L0,360 Z'
                : 'M0,180 C200,178 400,182 600,180 C700,179 800,180 800,180 L800,360 L0,360 Z'
            }
          />

          {/* Layer 2: Harmonic Mid Wave */}
          <path
            fill="url(#heroWaveGrad1)"
            className={isPlaying ? 'animate-wave-fast transition-all duration-700' : 'transition-all duration-700'}
            d={
              isPlaying
                ? 'M0,190 C150,260 280,100 420,210 C560,320 680,120 800,200 L800,360 L0,360 Z'
                : 'M0,185 C200,183 400,187 600,185 C700,184 800,185 800,185 L800,360 L0,360 Z'
            }
          />

          {/* Layer 3: Foreground Dynamic Wave Fill */}
          <path
            fill="url(#heroWaveGrad3)"
            className={isPlaying ? 'animate-wave-slow transition-all duration-700' : 'transition-all duration-700'}
            d={
              isPlaying
                ? 'M0,205 C100,130 220,260 340,165 C460,70 580,270 700,185 C750,150 800,195 800,205 L800,360 L0,360 Z'
                : 'M0,190 C200,188 400,192 600,190 C700,189 800,190 800,190 L800,360 L0,360 Z'
            }
          />

          {/* Layer 4: Glowing Pure White Crest Ribbon Line */}
          <path
            fill="none"
            stroke="#ffffff"
            strokeWidth={isPlaying ? '2.5' : '1.5'}
            filter="url(#whiteGlow)"
            className={isPlaying ? 'animate-wave-slow transition-all duration-700' : 'transition-all duration-700 opacity-60'}
            d={
              isPlaying
                ? 'M0,205 C100,130 220,260 340,165 C460,70 580,270 700,185 C750,150 800,195 800,205'
                : 'M0,190 C200,188 400,192 600,190 C700,189 800,190 800,190'
            }
          />

          {/* Layer 5: High-Frequency Second Glowing White Crest Line */}
          <path
            fill="none"
            stroke="#cbd5e1"
            strokeWidth="1.5"
            strokeDasharray={isPlaying ? 'none' : '4 4'}
            className={isPlaying ? 'animate-wave-fast transition-all duration-700 opacity-80' : 'transition-all duration-700 opacity-40'}
            d={
              isPlaying
                ? 'M0,190 C150,260 280,100 420,210 C560,320 680,120 800,200'
                : 'M0,185 C200,183 400,187 600,185 C700,184 800,185 800,185'
            }
          />
        </svg>
      </div>

      {/* 4. Bottom Horizon Glow Bar */}
      <div className="relative z-10 w-full flex items-center justify-between px-2 pt-1 border-t border-white/[0.06] text-[10px] font-mono text-slate-400">
        <span className="flex items-center gap-1.5">
          <span
            className={cn(
              'size-1.5 rounded-full transition-all',
              isPlaying ? 'bg-white shadow-[0_0_8px_white]' : 'bg-slate-500'
            )}
          />
          <span className="tracking-wider uppercase font-semibold text-slate-300">
            {isPlaying ? 'Acoustic Fluid Engine' : 'Playback Suspended'}
          </span>
        </span>
        <span className="text-slate-400 font-mono">
          48kHz • Enhanced Lossless
        </span>
      </div>
    </div>
  );
};
