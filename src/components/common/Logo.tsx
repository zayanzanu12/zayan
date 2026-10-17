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

        {/* Crisp High-Fidelity SVG of the exact Talksy Badge */}
        <svg
          viewBox="0 0 200 200"
          className="w-full h-full relative z-10 drop-shadow-[0_0_18px_rgba(0,214,143,0.65)]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Soft Ambient Shadow Filter */}
            <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#00D68F" floodOpacity="0.4" />
            </filter>

            {/* Neon Green Outer Ring Gradient */}
            <linearGradient id="neonGreenBorder" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4EFEB3" />
              <stop offset="50%" stopColor="#00D68F" />
              <stop offset="100%" stopColor="#00A86B" />
            </linearGradient>

            {/* Dark Inner Glass Radial Gradient */}
            <radialGradient id="darkGlass" cx="40%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#0b241c" />
              <stop offset="60%" stopColor="#04120e" />
              <stop offset="100%" stopColor="#010604" />
            </radialGradient>

            {/* Top Gloss Reflection */}
            <linearGradient id="glassGloss" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#4EFEB3" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#4EFEB3" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Deep Black / Dark Green Ambient Outer Halo Disc */}
          <circle cx="100" cy="100" r="92" fill="#010705" />

          {/* Chat Bubble Outline with Tail at Bottom-Left */}
          <path
            d="M 100 22 C 57 22 22 57 22 100 C 22 118 28 134 38 147 L 27 180 L 63 171 C 74 175 87 178 100 178 C 143 178 178 143 178 100 C 178 57 143 22 100 22 Z"
            fill="url(#neonGreenBorder)"
          />

          {/* Inner Dark Glass Disc */}
          <path
            d="M 100 32 C 63 32 32 63 32 100 C 32 115 37 129 45 140 L 37 165 L 64 158 C 74 163 87 168 100 168 C 137 168 168 137 168 100 C 168 63 137 32 100 32 Z"
            fill="url(#darkGlass)"
          />

          {/* Top Glass Specular Arc Reflection */}
          <path
            d="M 45 78 C 55 50 80 36 112 36 C 144 36 156 52 161 74 C 142 56 116 50 88 56 C 68 60 53 69 45 78 Z"
            fill="url(#glassGloss)"
          />

          {/* Voice Waves & Phone Handset Group (Tilted -6 deg) */}
          <g transform="translate(100, 92) rotate(-6) translate(-100, -92)">
            {/* Sound Wave 1 (Inner) */}
            <path
              d="M 102 74 C 107 79 110 86 110 93 C 110 100 107 107 102 112"
              stroke="#00D68F"
              strokeWidth="5"
              strokeLinecap="round"
              fill="none"
            />

            {/* Sound Wave 2 (Middle) */}
            <path
              d="M 112 65 C 120 73 125 84 125 95 C 125 106 120 117 112 125"
              stroke="#00D68F"
              strokeWidth="5.5"
              strokeLinecap="round"
              fill="none"
            />

            {/* Sound Wave 3 (Outer) */}
            <path
              d="M 123 56 C 134 67 141 81 141 96 C 141 111 134 125 123 136"
              stroke="#00D68F"
              strokeWidth="6"
              strokeLinecap="round"
              fill="none"
            />

            {/* Pure Crisp White Phone Handset */}
            <path
              d="M 94 72 C 92 68 87 66 82 68 L 72 73 C 67 75 64 80 66 85 C 72 98 84 118 104 127 C 109 129 114 127 117 122 L 123 113 C 125 109 124 103 119 101 L 107 94 C 103 92 98 94 95 98 L 92 101 C 86 96 80 89 77 82 L 81 79 C 85 76 87 71 85 67 Z"
              fill="#ffffff"
              filter="drop-shadow(0 2px 6px rgba(0,0,0,0.5))"
            />
          </g>

          {/* Tilted 3D White Typography: "Talksy" overlapping the bottom */}
          <g transform="translate(100, 150) rotate(-6) translate(-100, -150)">
            {/* 3D Dark Green Shadow Contour */}
            <text
              x="100"
              y="155"
              textAnchor="middle"
              fill="#011b13"
              stroke="#011b13"
              strokeWidth="10"
              strokeLinejoin="round"
              fontSize="48"
              fontWeight="900"
              fontFamily="'Plus Jakarta Sans', system-ui, sans-serif"
              letterSpacing="-0.03em"
            >
              Talksy
            </text>

            {/* Vibrant Green Outline */}
            <text
              x="100"
              y="152"
              textAnchor="middle"
              fill="#012b1e"
              stroke="#00D68F"
              strokeWidth="4"
              strokeLinejoin="round"
              fontSize="48"
              fontWeight="900"
              fontFamily="'Plus Jakarta Sans', system-ui, sans-serif"
              letterSpacing="-0.03em"
            >
              Talksy
            </text>

            {/* Crisp Pure White Foreground Text */}
            <text
              x="100"
              y="150"
              textAnchor="middle"
              fill="#ffffff"
              fontSize="48"
              fontWeight="900"
              fontFamily="'Plus Jakarta Sans', system-ui, sans-serif"
              letterSpacing="-0.03em"
            >
              Talksy
            </text>
          </g>
        </svg>
      </div>

      {/* External Subtitle / Brand text if requested */}
      {showText && (
        <div className={`flex flex-col ${isHorizontal ? 'text-left' : 'items-center mt-2.5 text-center'}`}>
          <div className="flex items-center gap-1.5 leading-none">
            <span className={`font-black tracking-tight text-[#E8F0FA] ${current.text}`}>
              Talksy
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
