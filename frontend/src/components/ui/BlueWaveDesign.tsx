import React from 'react';

interface BlueWaveDesignProps {
  variant?: 'full' | 'compact' | 'sheet';
  isPlaying?: boolean;
  className?: string;
}

export const BlueWaveDesign: React.FC<BlueWaveDesignProps> = ({
  variant = 'full',
  isPlaying = false,
  className = ''
}) => {
  if (variant === 'compact') {
    return (
      <div className={`w-full h-2.5 overflow-hidden pointer-events-none relative ${className}`}>
        <svg
          viewBox="0 0 600 24"
          preserveAspectRatio="none"
          className="w-[200%] h-full absolute bottom-0 left-0"
        >
          <defs>
            <linearGradient id="waveGradCompact" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#0284c7" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.4" />
            </linearGradient>
            <linearGradient id="waveGradFront" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0.8" />
            </linearGradient>
          </defs>
          <path
            className={isPlaying ? 'animate-wave-slow' : ''}
            fill="url(#waveGradCompact)"
            d="M0,12 C75,4 150,20 225,12 C300,4 375,20 450,12 C525,4 600,20 675,12 L675,24 L0,24 Z"
          />
        </svg>
      </div>
    );
  }

  // Full / Sheet variant: Signature 3-layer organic flowing blue waves
  return (
    <div className={`pointer-events-none overflow-hidden select-none ${className}`}>
      <svg
        viewBox="0 0 1200 240"
        preserveAspectRatio="none"
        className="w-[200%] h-full absolute bottom-0 left-0"
      >
        <defs>
          <linearGradient id="waveGradFront" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.65" />
            <stop offset="100%" stopColor="#0284c7" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="waveGradMid" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#7dd3fc" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.65" />
          </linearGradient>
          <linearGradient id="waveGradBack" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#bae6fd" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#7dd3fc" stopOpacity="0.45" />
          </linearGradient>
        </defs>

        {/* Wave 1: Back slow fluid wave */}
        <path
          className={isPlaying ? 'animate-wave-slow' : ''}
          fill="url(#waveGradBack)"
          d="M0,80 C150,140 350,20 500,80 C650,140 850,20 1000,80 C1150,140 1350,20 1500,80 L1500,240 L0,240 Z"
        />

        {/* Wave 2: Middle gentle wave */}
        <path
          className={isPlaying ? 'animate-wave-fast' : ''}
          fill="url(#waveGradMid)"
          d="M0,110 C200,60 400,160 600,100 C800,40 1000,150 1200,110 C1400,60 1600,150 1800,110 L1800,240 L0,240 Z"
        />

        {/* Wave 3: Foreground vibrant wave */}
        <path
          className={isPlaying ? 'animate-wave-slow' : ''}
          fill="url(#waveGradFront)"
          d="M0,140 C180,90 320,180 520,130 C720,80 900,170 1100,130 C1300,90 1480,180 1680,130 L1680,240 L0,240 Z"
        />
      </svg>
    </div>
  );
};
