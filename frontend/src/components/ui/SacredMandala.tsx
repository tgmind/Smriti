import React from 'react';

export interface SacredMandalaProps {
  className?: string;
}

export const SacredMandala: React.FC<SacredMandalaProps> = ({
  className = 'w-full h-full'
}) => {
  const size = 400;
  const cx = 200.0;
  const cy = 200.0;

  const r_inner = 118;
  const r_base = 124;
  const r_mid = 138;
  const r_tip = 158;
  const r_outer_ring = 148;
  const r_rays = 164;

  const numPetals = 16;
  const petals = [];

  for (let i = 0; i < numPetals; i++) {
    const a1 = (2 * Math.PI * i) / numPetals;
    const a2 = (2 * Math.PI * (i + 1)) / numPetals;
    const amid = (a1 + a2) / 2;

    const x1 = cx + r_base * Math.cos(a1);
    const y1 = cy + r_base * Math.sin(a1);
    const x2 = cx + r_base * Math.cos(a2);
    const y2 = cy + r_base * Math.sin(a2);

    const xt = cx + r_tip * Math.cos(amid);
    const yt = cy + r_tip * Math.sin(amid);

    const c1x = cx + (r_base + 20) * Math.cos(a1 + 0.04);
    const c1y = cy + (r_base + 20) * Math.sin(a1 + 0.04);
    const c2x = cx + (r_base + 20) * Math.cos(a2 - 0.04);
    const c2y = cy + (r_base + 20) * Math.sin(a2 - 0.04);

    const xs = cx + (r_base + 6) * Math.cos(amid);
    const ys = cy + (r_base + 6) * Math.sin(amid);

    const xd = cx + (r_tip + 3.5) * Math.cos(amid);
    const yd = cy + (r_tip + 3.5) * Math.sin(amid);

    petals.push(
      <g key={`petal-${i}`}>
        <path
          d={`M ${x1.toFixed(2)} ${y1.toFixed(2)} Q ${c1x.toFixed(2)} ${c1y.toFixed(2)} ${xt.toFixed(2)} ${yt.toFixed(2)} Q ${c2x.toFixed(2)} ${c2y.toFixed(2)} ${x2.toFixed(2)} ${y2.toFixed(2)}`}
          fill="#FFFDF7"
          fillOpacity={0.4}
          stroke="#C59A63"
          strokeWidth="1.1"
          opacity={0.88}
        />
        <line
          x1={xs.toFixed(2)}
          y1={ys.toFixed(2)}
          x2={xt.toFixed(2)}
          y2={yt.toFixed(2)}
          stroke="#D4A373"
          strokeWidth="0.8"
          opacity={0.65}
        />
        <circle
          cx={xd.toFixed(2)}
          cy={yd.toFixed(2)}
          r="1.8"
          fill="#C59A63"
          opacity={0.9}
        />
      </g>
    );
  }

  const rays = [];
  for (let i = 0; i < 32; i++) {
    const angle = (2 * Math.PI * i) / 32;
    const isMajor = i % 2 === 0;
    const x1 = cx + (r_outer_ring + 2) * Math.cos(angle);
    const y1 = cy + (r_outer_ring + 2) * Math.sin(angle);
    const rayLength = isMajor ? r_rays : r_rays - 5;
    const x2 = cx + rayLength * Math.cos(angle);
    const y2 = cy + rayLength * Math.sin(angle);

    rays.push(
      <g key={`ray-${i}`}>
        <line
          x1={x1.toFixed(2)}
          y1={y1.toFixed(2)}
          x2={x2.toFixed(2)}
          y2={y2.toFixed(2)}
          stroke="#D4A373"
          strokeWidth={isMajor ? '1.0' : '0.65'}
          opacity={0.7}
        />
        {isMajor && (
          <circle
            cx={x2.toFixed(2)}
            cy={y2.toFixed(2)}
            r="1.4"
            fill="#C59A63"
            opacity={0.8}
          />
        )}
      </g>
    );
  }

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Soft warm circular backplate tint */}
      <circle
        cx={cx}
        cy={cy}
        r={r_rays}
        fill="#FAF2DD"
        fillOpacity={0.28}
      />

      {/* Radiant Sun Rays */}
      {rays}

      {/* Outer Perimeter Rings */}
      <circle
        cx={cx}
        cy={cy}
        r={r_outer_ring}
        fill="none"
        stroke="#C59A63"
        strokeWidth="1.1"
        opacity={0.75}
      />
      <circle
        cx={cx}
        cy={cy}
        r={r_outer_ring - 4}
        fill="none"
        stroke="#D4A373"
        strokeWidth="0.6"
        strokeDasharray="2 3"
        opacity={0.6}
      />

      {/* 16 Sacred Lotus Petals */}
      {petals}

      {/* Middle Concentric Circles */}
      <circle
        cx={cx}
        cy={cy}
        r={r_mid}
        fill="none"
        stroke="#D4A373"
        strokeWidth="0.8"
        opacity={0.65}
      />
      <circle
        cx={cx}
        cy={cy}
        r={r_base + 5}
        fill="none"
        stroke="#C59A63"
        strokeWidth="1"
        opacity={0.7}
      />

      {/* Beaded Dotted Ring */}
      <circle
        cx={cx}
        cy={cy}
        r={r_base}
        fill="none"
        stroke="#C59A63"
        strokeWidth="1.3"
        strokeDasharray="1 4"
        opacity={0.75}
      />

      {/* Inner Framing Rings */}
      <circle
        cx={cx}
        cy={cy}
        r={r_inner + 4}
        fill="none"
        stroke="#D4A373"
        strokeWidth="0.8"
        opacity={0.55}
      />
      <circle
        cx={cx}
        cy={cy}
        r={r_inner}
        fill="none"
        stroke="#C59A63"
        strokeWidth="1.2"
        opacity={0.75}
      />
    </svg>
  );
};
