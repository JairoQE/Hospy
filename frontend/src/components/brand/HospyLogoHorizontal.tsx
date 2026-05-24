interface Props {
  height?: number;
  className?: string;
}

/** Logo horizontal: ícono + nombre (header escritorio). */
export function HospyLogoHorizontal({ height = 36, className = "" }: Props) {
  const width = Math.round((220 / 48) * height);
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 220 48"
      width={width}
      height={height}
      className={className}
      role="img"
      aria-label="Hospy"
    >
      <g transform="translate(0, 2) scale(0.305556)">
        <rect width="144" height="144" rx="32" fill="#1D9E75" />
        <polygon points="72,20 128,64 16,64" fill="#0A5240" />
        <line x1="72" y1="20" x2="72" y2="36" stroke="#E1F5EE" strokeWidth="3" strokeLinecap="round" />
        <rect x="22" y="64" width="100" height="64" rx="4" fill="#0F6E56" />
        <rect x="32" y="76" width="28" height="24" rx="5" fill="#E1F5EE" opacity="0.95" />
        <line x1="46" y1="76" x2="46" y2="100" stroke="#1D9E75" strokeWidth="1.8" />
        <line x1="32" y1="88" x2="60" y2="88" stroke="#1D9E75" strokeWidth="1.8" />
        <rect x="84" y="76" width="28" height="24" rx="5" fill="#E1F5EE" opacity="0.95" />
        <line x1="98" y1="76" x2="98" y2="100" stroke="#1D9E75" strokeWidth="1.8" />
        <line x1="84" y1="88" x2="112" y2="88" stroke="#1D9E75" strokeWidth="1.8" />
        <path d="M58 128 L58 108 Q72 94 86 108 L86 128 Z" fill="#E1F5EE" opacity="0.9" />
        <circle cx="82" cy="118" r="2.8" fill="#1D9E75" />
        <line
          x1="14"
          y1="128"
          x2="130"
          y2="128"
          stroke="#E1F5EE"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.35"
        />
        <g transform="translate(116, 22)">
          <line x1="0" y1="-8" x2="0" y2="8" stroke="#E1F5EE" strokeWidth="2" strokeLinecap="round" opacity="0.85" />
          <line x1="-8" y1="0" x2="8" y2="0" stroke="#E1F5EE" strokeWidth="2" strokeLinecap="round" opacity="0.85" />
        </g>
      </g>
      <text
        x="54"
        y="22"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize="30"
        fontWeight="700"
        fill="#0F6E56"
        letterSpacing="-1"
      >
        Hospy
      </text>
      <text
        x="54"
        y="38"
        fontFamily="Arial, sans-serif"
        fontSize="10"
        fill="#5F9E8A"
        letterSpacing="1.2"
      >
        SIST · HOSPEDAJES
      </text>
    </svg>
  );
}
