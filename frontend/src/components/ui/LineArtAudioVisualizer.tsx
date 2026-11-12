import React from 'react';

export interface LineArtAudioVisualizerProps {
  subjectName?: string;
  isPlaying?: boolean;
  className?: string;
  variant?: 'medallion' | 'turntable' | 'background' | 'ambient';
}

export const LineArtAudioVisualizer: React.FC<LineArtAudioVisualizerProps> = ({
  subjectName = 'Physics',
  isPlaying = false,
  className = '',
  variant = 'medallion'
}) => {
  const norm = (subjectName || '').toLowerCase();

  // Subject-driven palette for center label and lighting
  const isPhysics = norm.includes('physic');
  const isChem = norm.includes('chem');
  const isBio = norm.includes('bio');
  const isMath = norm.includes('math');

  const labelGradId = `labelGrad-${subjectName.replace(/\s+/g, '')}`;
  const sheenGradId = `vinylSheen-${subjectName.replace(/\s+/g, '')}`;

  const primaryColor = isPhysics
    ? '#24A1DE'
    : isChem
    ? '#f43f5e'
    : isBio
    ? '#10b981'
    : isMath
    ? '#f59e0b'
    : '#6366f1';

  const secondaryColor = isPhysics
    ? '#0284c7'
    : isChem
    ? '#e11d48'
    : isBio
    ? '#059669'
    : isMath
    ? '#d97706'
    : '#4338ca';

  // Ambient silk soundwave backdrop (Zero dashed lines, pure liquid silk curves)
  if (variant === 'background' || variant === 'ambient') {
    return (
      <div
        className={`pointer-events-none absolute inset-0 overflow-hidden select-none opacity-25 ${className}`}
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 600 160"
          preserveAspectRatio="none"
          className={`w-[140%] h-full absolute -top-2 -left-6 ${
            isPlaying ? 'animate-wave-slow' : ''
          }`}
        >
          <defs>
            <linearGradient id="bgContourGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={primaryColor} stopOpacity="0.4" />
              <stop offset="50%" stopColor={secondaryColor} stopOpacity="0.7" />
              <stop offset="100%" stopColor={primaryColor} stopOpacity="0.1" />
            </linearGradient>
          </defs>

          {/* Continuous smooth fluid silk wave 1 */}
          <path
            d="M0,90 C120,40 220,130 340,75 C460,20 540,110 650,65 C760,20 840,100 950,70"
            fill="none"
            stroke="url(#bgContourGrad)"
            strokeWidth="1.2"
          />

          {/* Harmonic companion wave 2 */}
          <path
            d="M0,110 C140,70 240,140 360,95 C480,50 560,130 670,85 C780,40 860,120 970,90"
            fill="none"
            stroke="url(#bgContourGrad)"
            strokeWidth="0.8"
            strokeOpacity="0.6"
          />
        </svg>
      </div>
    );
  }

  // Medallion / Turntable: Aesthetic Vinyl Record Player with Real Grooves, Sheen & Tonearm
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full drop-shadow-md"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Label Gradient */}
          <linearGradient id={labelGradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={primaryColor} />
            <stop offset="100%" stopColor={secondaryColor} />
          </linearGradient>

          {/* Vinyl Sheen Light Reflection */}
          <linearGradient id={sheenGradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.35" />
            <stop offset="50%" stopColor="#ffffff" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.25" />
          </linearGradient>

          {/* Ambient Disc Halo */}
          <radialGradient id="discHalo" cx="48%" cy="52%" r="50%">
            <stop offset="70%" stopColor={primaryColor} stopOpacity="0.25" />
            <stop offset="100%" stopColor={primaryColor} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Ambient Halo Glow */}
        <circle cx="48" cy="52" r="44" fill="url(#discHalo)" />

        {/* ==================================================== */}
        {/* ROTATING VINYL DISC GROUP                            */}
        {/* ==================================================== */}
        <g
          className={isPlaying ? 'animate-spin-slow' : ''}
          style={{ transformOrigin: '48px 52px' }}
        >
          {/* Vinyl Platter Body */}
          <circle
            cx="48"
            cy="52"
            r="41"
            fill="#0b0e14"
            stroke="#1f2633"
            strokeWidth="1.2"
          />

          {/* Micro Grooves (Acoustic Fidelity Lines) */}
          <circle cx="48" cy="52" r="37" stroke="#161c28" strokeWidth="0.65" />
          <circle cx="48" cy="52" r="33.5" stroke="#222a3d" strokeWidth="0.65" />
          <circle cx="48" cy="52" r="30" stroke="#161c28" strokeWidth="0.65" />
          <circle cx="48" cy="52" r="26.5" stroke="#242d40" strokeWidth="0.65" />
          <circle cx="48" cy="52" r="23" stroke="#18202e" strokeWidth="0.65" />
          <circle cx="48" cy="52" r="19.5" stroke="#242d40" strokeWidth="0.65" />

          {/* Vinyl Light Glint Reflections (Opposing conical highlights) */}
          <path
            d="M48,52 L19,30 A41,41 0 0,1 37,13 Z"
            fill={`url(#${sheenGradId})`}
          />
          <path
            d="M48,52 L77,74 A41,41 0 0,1 59,91 Z"
            fill={`url(#${sheenGradId})`}
          />

          {/* Center Record Label */}
          <circle
            cx="48"
            cy="52"
            r="14"
            fill={`url(#${labelGradId})`}
            stroke="#ffffff"
            strokeWidth="0.8"
            strokeOpacity="0.4"
          />

          {/* Center Label Inner Ring */}
          <circle
            cx="48"
            cy="52"
            r="10.5"
            stroke="#ffffff"
            strokeWidth="0.6"
            strokeOpacity="0.3"
            strokeDasharray="2 1.5"
          />

          {/* Center Spindle Hole */}
          <circle cx="48" cy="52" r="3" fill="#090d16" />
          <circle cx="48" cy="52" r="1.5" fill="#e2e8f0" />
        </g>

        {/* ==================================================== */}
        {/* SOUND RIPPLE RINGS (EMIT WHEN PLAYING)              */}
        {/* ==================================================== */}
        {isPlaying && (
          <g>
            <circle
              cx="58"
              cy="48"
              r="4"
              stroke="#38bdf8"
              strokeWidth="0.8"
              opacity="0.8"
              className="animate-ping"
            />
            <circle
              cx="58"
              cy="48"
              r="7"
              stroke="#38bdf8"
              strokeWidth="0.6"
              opacity="0.4"
            />
          </g>
        )}

        {/* ==================================================== */}
        {/* PRECISION HIGH-END TONEARM                           */}
        {/* ==================================================== */}
        <g className="transition-transform duration-500 ease-out">
          {/* Base Gimbal Mount in Top Right */}
          <circle
            cx="84"
            cy="18"
            r="6"
            fill="#151b26"
            stroke="#333f54"
            strokeWidth="1.2"
          />
          <circle cx="84" cy="18" r="3.2" fill="#242d3d" />
          <circle cx="84" cy="18" r="1.4" fill="#cbd5e1" />

          {/* Tonearm Beam: Polished aluminum line */}
          <path
            d={isPlaying ? 'M84,18 L73,38 L58,48' : 'M84,18 L75,34 L66,38'}
            fill="none"
            stroke="#cbd5e1"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-all duration-500"
          />

          {/* Stylus Headshell & Cartridge */}
          <g
            transform={
              isPlaying
                ? 'translate(58, 48) rotate(-22)'
                : 'translate(66, 38) rotate(-10)'
            }
            className="transition-transform duration-500"
          >
            <rect
              x="-1"
              y="-2.5"
              width="7"
              height="4.5"
              rx="1"
              fill="#0f172a"
              stroke="#94a3b8"
              strokeWidth="0.8"
            />
            {/* Jewel indicator dot */}
            <circle cx="4.5" cy="-0.2" r="1" fill={primaryColor} />
          </g>
        </g>
      </svg>
    </div>
  );
};
