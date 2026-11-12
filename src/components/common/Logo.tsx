import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'hero';
  showText?: boolean;
  className?: string;
  glow?: boolean;
  animated?: boolean;
  layout?: 'horizontal' | 'vertical';
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showText = false,
  className = '',
  glow = true,
  animated = false,
  layout,
}) => {
  const isHorizontal = layout ? layout === 'horizontal' : size === 'sm' || size === 'md';

  const sizeConfig = {
    sm: { box: 'w-9 h-9', text: 'text-sm', sub: 'text-[9px]' },
    md: { box: 'w-11 h-11', text: 'text-base', sub: 'text-[10px]' },
    lg: { box: 'w-16 h-16', text: 'text-2xl', sub: 'text-xs' },
    xl: { box: 'w-24 h-24', text: 'text-3xl', sub: 'text-sm' },
    hero: { box: 'w-36 h-36', text: 'text-4xl', sub: 'text-base' },
  };

  const current = sizeConfig[size];

  return (
    <div
      className={`inline-flex ${
        isHorizontal ? 'flex-row items-center gap-2.5' : 'flex-col items-center'
      } select-none ${className}`}
    >
      {/* Exact Talksy Glowing Circular Logo from User Image */}
      <div className={`relative ${current.box} shrink-0 flex items-center justify-center`}>
        {/* Outer glowing neon green blurred ambient aura */}
        {glow && (
          <div
            className={`absolute -inset-2.5 rounded-full bg-[#00D68F] opacity-40 blur-xl pointer-events-none ${
              animated ? 'animate-pulse' : ''
            }`}
          />
        )}

        {/* Crisp High-Fidelity SVG of the ZappChat Emblem */}
        <svg
          viewBox="0 0 200 200"
          className="w-full h-full relative z-10 drop-shadow-[0_0_18px_rgba(0,214,143,0.65)]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Soft Ambient Shadow Filter */}
            <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#00D68F" floodOpacity="0.5" />
            </filter>

            {/* Neon Green Outer Ring Gradient */}
            <linearGradient id="neonGreenBorder" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4EFEB3" />
              <stop offset="50%" stopColor="#00D68F" />
              <stop offset="100%" stopColor="#00A86B" />
            </linearGradient>

            {/* Midnight Navy Inner Glass Radial Gradient */}
            <radialGradient id="darkGlass" cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#152B3C" />
              <stop offset="55%" stopColor="#0D1E2D" />
              <stop offset="100%" stopColor="#07111F" />
            </radialGradient>

            {/* Lightning Bolt Gradient */}
            <linearGradient id="lightningGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="60%" stopColor="#E6FFF5" />
              <stop offset="100%" stopColor="#00D68F" />
            </linearGradient>

            {/* Top Gloss Reflection */}
            <linearGradient id="glassGloss" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#4EFEB3" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#00D68F" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Deep Black / Midnight Outer Halo Disc */}
          <circle cx="100" cy="100" r="92" fill="#050C15" stroke="#1E3042" strokeWidth="2" />

          {/* Chat Bubble Outline with Tail at Bottom-Left */}
          <path
            d="M 100 24 C 58 24 24 58 24 100 C 24 117 30 133 40 146 L 29 178 L 65 169 C 76 173 88 176 100 176 C 142 176 176 142 176 100 C 176 58 142 24 100 24 Z"
            fill="url(#neonGreenBorder)"
          />

          {/* Inner Dark Glass Disc */}
          <path
            d="M 100 34 C 64 34 34 64 34 100 C 34 115 39 128 47 139 L 39 163 L 64 156 C 75 161 87 166 100 166 C 136 166 166 136 166 100 C 166 64 136 34 100 34 Z"
            fill="url(#darkGlass)"
          />

          {/* Top Glass Specular Arc Reflection */}
          <path
            d="M 46 80 C 56 52 81 38 112 38 C 142 38 155 54 160 74 C 141 57 116 51 88 57 C 69 61 54 70 46 80 Z"
            fill="url(#glassGloss)"
          />

          {/* Sound / Signal Wave Arcs on top-right */}
          <g opacity="0.95">
            <path
              d="M 124 64 C 132 72 137 83 137 95 C 137 107 132 118 124 126"
              stroke="#00D68F"
              strokeWidth="4.5"
              strokeLinecap="round"
              fill="none"
              filter="url(#softGlow)"
            />
            <path
              d="M 137 54 C 148 65 154 80 154 96 C 154 112 148 127 137 138"
              stroke="#00D68F"
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
              opacity="0.75"
            />
          </g>

          {/* Iconic Centerpiece: Dynamic "Zapp" Electric Lightning Bolt */}
          <g filter="url(#softGlow)">
            {/* Vibrant Outer Neon Glow Aura of Lightning */}
            <path
              d="M 105 48 L 72 102 L 95 102 L 83 150 L 126 94 L 102 94 Z"
              fill="#00D68F"
              opacity="0.5"
              transform="scale(1.08) translate(-7, -7)"
            />

            {/* Pure Crisp White & Emerald Foreground Lightning Bolt */}
            <path
              d="M 105 50 L 73 103 L 96 103 L 84 150 L 127 95 L 103 95 Z"
              fill="url(#lightningGrad)"
              stroke="#FFFFFF"
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </g>

          {/* Dynamic Connection Pulse Dot */}
          <circle cx="68" cy="74" r="5" fill="#00D68F" filter="url(#softGlow)" />
          <circle cx="68" cy="74" r="2.5" fill="#FFFFFF" />
        </svg>
      </div>

      {/* External Subtitle / Brand text if requested */}
      {showText && (
        <div className={`flex flex-col ${isHorizontal ? 'text-left' : 'items-center mt-2.5 text-center'}`}>
          <div className="flex items-center gap-1.5 leading-none">
            <span className={`font-black tracking-tight text-[#E8F0FA] ${current.text}`}>
              ZappChat
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#00D68F] shrink-0" />
          </div>
          <span className={`font-mono text-[#00D68F] font-semibold tracking-wider mt-0.5 uppercase ${current.sub}`}>
            {isHorizontal ? 'Messenger' : 'Your world · Your conversations'}
          </span>
        </div>
      )}
    </div>
  );
};
