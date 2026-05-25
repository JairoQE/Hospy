import { useId } from "react";

interface Props {
  size?: number;
  className?: string;
  animated?: boolean;
  /** `fab` llena el círculo (botón flotante); `compact` solo robot (mensajes). */
  variant?: "full" | "fab" | "compact";
}

/** Logo oficial de Hospix — robot pixel con gradiente azul. */
export function HospixAvatar({
  size = 40,
  className = "",
  animated = false,
  variant = "full",
}: Props) {
  const rawId = useId().replace(/:/g, "");
  const bgGrad = `${rawId}-bgGrad`;
  const robotBody = `${rawId}-robotBody`;
  const antennaGrad = `${rawId}-antennaGrad`;
  const shadow = `${rawId}-shadow`;
  const glow = `${rawId}-glow`;

  const isFab = variant === "fab";
  const isCompact = variant === "compact";
  const showRings = !isCompact && !isFab;
  const showLabel = !isCompact;
  const fgScale = isFab ? 1.32 : isCompact ? 1.55 : 1.1;
  const contentY = isCompact ? 102 : 88;
  const shadowBlur = isFab ? 2 : 6;
  /* Compact: círculo completo (evita recortar antena/cabeza en avatares pequeños). */
  const viewBox = "0 0 200 200";

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={viewBox}
      width={size}
      height={size}
      className={`hospix-avatar${animated ? " hospix-avatar--pulse" : ""} ${className}`.trim()}
      role="img"
      aria-label="Hospix"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id={bgGrad} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#1E3A8A" />
        </linearGradient>
        <linearGradient id={robotBody} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#F8FAFC" />
          <stop offset="100%" stopColor="#CBD5E1" />
        </linearGradient>
        <linearGradient id={antennaGrad} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#14B8A6" />
          <stop offset="100%" stopColor="#0F766E" />
        </linearGradient>
        <filter id={shadow} x="-15%" y="-15%" width="130%" height="130%">
          <feDropShadow dx="0" dy="2" stdDeviation={shadowBlur} floodColor="#0F172A" floodOpacity="0.3" />
        </filter>
        <filter id={glow} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <clipPath id={`${rawId}-clip`}>
          <circle cx="100" cy="100" r="100" />
        </clipPath>
      </defs>

      <g clipPath={isCompact ? undefined : `url(#${rawId}-clip)`}>
        <circle cx="100" cy="100" r="100" fill={`url(#${bgGrad})`} filter={isFab ? undefined : `url(#${shadow})`} />

        <g transform={`translate(100, 100) scale(${fgScale}) translate(-100, -100)`}>
          {showRings && (
            <>
              <circle
                cx="100"
                cy="100"
                r="88"
                fill="none"
                stroke="#3B82F6"
                strokeWidth="2"
                strokeDasharray="6 4"
                opacity="0.4"
              />
              <circle cx="100" cy="100" r="82" fill="none" stroke="#60A5FA" strokeWidth="1" opacity="0.3" />
            </>
          )}

          <g transform={`translate(100, ${contentY}) translate(-36, -36)`}>
          <line
            x1="36"
            y1="8"
            x2="36"
            y2="18"
            stroke={`url(#${antennaGrad})`}
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle cx="36" cy="6" r="5" fill="#14B8A6" filter={`url(#${glow})`} />
          <path
            d="M31 2 Q36 -3 41 2"
            fill="none"
            stroke="#FBBF24"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.8"
          />

          <rect
            x="16"
            y="18"
            width="40"
            height="36"
            rx="8"
            fill={`url(#${robotBody})`}
            stroke="#94A3B8"
            strokeWidth="1.5"
          />

          <rect x="22" y="26" width="10" height="10" rx="2" fill="#1E293B" />
          <rect x="24" y="28" width="4" height="4" fill="#38BDF8" />
          <rect x="40" y="26" width="10" height="10" rx="2" fill="#1E293B" />
          <rect x="42" y="28" width="4" height="4" fill="#38BDF8" />

          <rect x="28" y="44" width="6" height="3" fill="#10B981" rx="1" />
          <rect x="38" y="44" width="6" height="3" fill="#10B981" rx="1" />

          <rect x="18" y="40" width="4" height="4" fill="#F472B6" rx="1" opacity="0.7" />
          <rect x="50" y="40" width="4" height="4" fill="#F472B6" rx="1" opacity="0.7" />

          <rect x="24" y="56" width="24" height="18" rx="6" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="1" />

          <circle cx="32" cy="64" r="3" fill="#F59E0B" />
          <circle cx="40" cy="64" r="3" fill="#3B82F6" />

          <rect x="10" y="44" width="6" height="20" rx="3" fill="#CBD5E1" stroke="#94A3B8" strokeWidth="1" />
          <rect x="56" y="44" width="6" height="20" rx="3" fill="#CBD5E1" stroke="#94A3B8" strokeWidth="1" />

          <rect x="8" y="64" width="8" height="6" rx="2" fill="#94A3B8" />
          <rect x="56" y="64" width="8" height="6" rx="2" fill="#94A3B8" />

          <rect x="4" y="30" width="4" height="4" fill="#14B8A6" rx="0.5" opacity="0.7" />
          <rect x="66" y="50" width="5" height="5" fill="#FBBF24" rx="0.5" opacity="0.7" />
          <rect x="12" y="72" width="4" height="4" fill="#60A5FA" rx="0.5" opacity="0.6" />
          <rect x="58" y="18" width="3" height="3" fill="#14B8A6" rx="0.5" opacity="0.8" />
          </g>

          {showLabel && (
            <>
              <text
                x="100"
                y="158"
                fontFamily="Inter, system-ui, sans-serif"
                fontWeight="800"
                fontSize="18"
                fill="#FFFFFF"
                textAnchor="middle"
                letterSpacing="2"
              >
                Hospix
              </text>
              <line
                x1="72"
                y1="168"
                x2="128"
                y2="168"
                stroke="#60A5FA"
                strokeWidth="1.5"
                strokeLinecap="round"
                opacity="0.6"
              />
              <rect x="96" y="176" width="8" height="8" fill="#14B8A6" rx="1.5" opacity="0.9" />
            </>
          )}
        </g>
      </g>
    </svg>
  );
}
