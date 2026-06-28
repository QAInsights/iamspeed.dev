/** @jsxImportSource preact */

interface CarSilhouetteProps {
  idSuffix?: string;
  animating?: boolean;
}

export function CarSilhouette({ idSuffix = "", animating = false }: CarSilhouetteProps) {
  const neonGlowId = `neon-glow${idSuffix}`;
  const glowEffectId = `glow-effect${idSuffix}`;
  const rearWheelClipId = `rear-wheel-clip${idSuffix}`;
  const frontWheelClipId = `front-wheel-clip${idSuffix}`;

  return (
    <div class="llm-car-container">
      <svg viewBox="0 0 1200 240" fill="none" class="llm-car-svg" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id={neonGlowId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.05" />
            <stop offset="30%" stop-color="var(--accent)" stop-opacity="0.85" />
            <stop offset="50%" stop-color="#a5b4fc" stop-opacity="1" />
            <stop offset="70%" stop-color="var(--accent)" stop-opacity="0.85" />
            <stop offset="100%" stop-color="var(--accent)" stop-opacity="0.05" />
          </linearGradient>
          <filter id={glowEffectId} x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <clipPath id={rearWheelClipId}>
            <path d="M 185 190 L 273 190 L 273 220 L 185 220 Z" />
          </clipPath>
          <clipPath id={frontWheelClipId}>
            <path d="M 978 190 L 1066 190 L 1066 220 L 978 220 Z" />
          </clipPath>
        </defs>

        {/* Ground line */}
        <line x1="50" y1="210" x2="1150" y2="210" stroke={`url(#${neonGlowId})`} stroke-width="1.5" opacity="0.3" />

        {/* Rear wheel */}
        <g clip-path={`url(#${rearWheelClipId})`}>
          {animating && (
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0 229 180"
              to="360 229 180"
              dur="1.5s"
              repeatCount="indefinite"
            />
          )}
          <circle cx="229" cy="180" r="30" stroke={`url(#${neonGlowId})`} stroke-width="2" filter={`url(#${glowEffectId})`} opacity="0.9" />
          <circle cx="229" cy="180" r="9" stroke={`url(#${neonGlowId})`} stroke-width="1.2" filter={`url(#${glowEffectId})`} opacity="0.7" />
          <line x1="229" y1="180" x2="229" y2="150" stroke={`url(#${neonGlowId})`} stroke-width="1.5" />
          <line x1="229" y1="180" x2="229" y2="210" stroke={`url(#${neonGlowId})`} stroke-width="1.5" />
          <line x1="229" y1="180" x2="199" y2="180" stroke={`url(#${neonGlowId})`} stroke-width="1.5" />
          <line x1="229" y1="180" x2="259" y2="180" stroke={`url(#${neonGlowId})`} stroke-width="1.5" />
        </g>

        {/* Front wheel */}
        <g clip-path={`url(#${frontWheelClipId})`}>
          {animating && (
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0 1022 180"
              to="360 1022 180"
              dur="1.5s"
              repeatCount="indefinite"
            />
          )}
          <circle cx="1022" cy="180" r="30" stroke={`url(#${neonGlowId})`} stroke-width="2" filter={`url(#${glowEffectId})`} opacity="0.9" />
          <circle cx="1022" cy="180" r="9" stroke={`url(#${neonGlowId})`} stroke-width="1.2" filter={`url(#${glowEffectId})`} opacity="0.7" />
          <line x1="1022" y1="180" x2="1022" y2="150" stroke={`url(#${neonGlowId})`} stroke-width="1.5" />
          <line x1="1022" y1="180" x2="1022" y2="210" stroke={`url(#${neonGlowId})`} stroke-width="1.5" />
          <line x1="1022" y1="180" x2="992" y2="180" stroke={`url(#${neonGlowId})`} stroke-width="1.5" />
          <line x1="1022" y1="180" x2="1052" y2="180" stroke={`url(#${neonGlowId})`} stroke-width="1.5" />
        </g>

        {/* Main Body silhouette (Clean 2D sports car profile - stretched with concentric arches) */}
        <path 
          d="M 30 190 L 58 140 L 172 140 L 488 80 L 622 80 L 880 120 L 1022 130 L 1170 190 L 1066 190 A 44 44 0 0 0 978 190 L 273 190 A 44 44 0 0 0 185 190 L 30 190 Z"
          stroke={`url(#${neonGlowId})`} 
          stroke-width="2.5" 
          stroke-linecap="round" 
          filter={`url(#${glowEffectId})`}
        />

        {/* Side Window */}
        <path 
          d="M 500 88 L 615 88 L 820 122 L 400 122 Z" 
          stroke={`url(#${neonGlowId})`} 
          stroke-width="1.5" 
          stroke-linecap="round" 
          filter={`url(#${glowEffectId})`}
          opacity="0.8"
        />

        {/* Character line Crease */}
        <path d="M 87 145 L 937 145" stroke={`url(#${neonGlowId})`} stroke-width="1.2" stroke-linecap="round" filter={`url(#${glowEffectId})`} opacity="0.6" />

        {/* Headlight and Taillight (Minimal glow bars) */}
        <line x1="1165" y1="160" x2="1165" y2="185" stroke="#60a5fa" stroke-width="2" stroke-linecap="round" filter={`url(#${glowEffectId})`} />
        <line x1="35" y1="145" x2="35" y2="185" stroke="#f43f5e" stroke-width="2" stroke-linecap="round" filter={`url(#${glowEffectId})`} />
      </svg>
    </div>
  );
}
