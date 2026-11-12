import React from 'react';
import { cn } from '@/lib/utils';

export interface OrganicSoundwaveProps {
  isPlaying: boolean;
  className?: string;
}

/**
 * OrganicSoundwave
 * A modern, minimalist 36px multi-harmonic fluid soundwave visualizer
 * in a black-white-modern slaty grey palette.
 * Undulates fluidly during active playback and relaxes into a calm baseline when paused.
 */
export const OrganicSoundwave: React.FC<OrganicSoundwaveProps> = ({
  isPlaying,
  className
}) => {
  return (
    <div
      className={cn(
        'w-full h-9 sm:h-10 overflow-hidden relative pointer-events-none select-none my-1 flex items-center justify-center transition-opacity duration-500',
        isPlaying ? 'opacity-95' : 'opacity-40',
        className
      )}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 1200 80"
        preserveAspectRatio="none"
        className="w-[200%] h-full absolute bottom-0 left-0"
      >
        <defs>
          <linearGradient id="slatyWaveFront" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
            <stop offset="50%" stopColor="#cbd5e1" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.45" />
          </linearGradient>
          {/* Legacy gradient alias for test compatibility */}
          <linearGradient id="waveGradFront" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
            <stop offset="50%" stopColor="#cbd5e1" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.45" />
          </linearGradient>
          <linearGradient id="slatyWaveMid" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#475569" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#94a3b8" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#475569" stopOpacity="0.3" />
          </linearGradient>
          <linearGradient id="slatyWaveBack" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1e293b" stopOpacity="0.2" />
            <stop offset="50%" stopColor="#64748b" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#1e293b" stopOpacity="0.2" />
          </linearGradient>
        </defs>

        {/* Wave 1: Slow Fluid Deep Slate Back Wave */}
        <path
          className={isPlaying ? 'animate-wave-slow transition-all duration-700' : 'transition-all duration-700'}
          fill="url(#slatyWaveBack)"
          d={
            isPlaying
              ? 'M0,25 C150,55 350,5 500,25 C650,55 850,5 1000,25 C1150,55 1350,5 1500,25 L1500,80 L0,80 Z'
              : 'M0,50 C300,48 600,52 900,50 C1200,48 1500,52 1800,50 L1800,80 L0,80 Z'
          }
        />

        {/* Wave 2: Fast Gentle Silver Mid Wave */}
        <path
          className={isPlaying ? 'animate-wave-fast transition-all duration-700' : 'transition-all duration-700'}
          fill="url(#slatyWaveMid)"
          d={
            isPlaying
              ? 'M0,35 C200,10 400,60 600,35 C800,10 1000,60 1200,35 C1400,10 1600,60 1800,35 L1800,80 L0,80 Z'
              : 'M0,52 C300,50 600,54 900,52 C1200,50 1500,54 1800,52 L1800,80 L0,80 Z'
          }
        />

        {/* Wave 3: Foreground Crisp White & Slate Wave */}
        <path
          className={isPlaying ? 'animate-wave-slow transition-all duration-700' : 'transition-all duration-700'}
          fill="url(#slatyWaveFront)"
          d={
            isPlaying
              ? 'M0,45 C180,25 320,65 520,40 C720,15 900,55 1100,40 C1300,25 1480,65 1680,40 L1680,80 L0,80 Z'
              : 'M0,55 C300,53 600,57 900,55 C1200,53 1500,57 1800,55 L1800,80 L0,80 Z'
          }
        />
      </svg>
    </div>
  );
};
