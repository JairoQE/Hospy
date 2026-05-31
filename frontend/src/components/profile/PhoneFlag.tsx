import { useState } from "react";

type Props = {
  iso: string;
  className?: string;
};

/** Bandera como imagen (los emojis no se ven en Windows y muestran "PE", "US", etc.). */
export function PhoneFlag({ iso, className = "phone-input-flag" }: Props) {
  const [failed, setFailed] = useState(false);
  const code = iso.toLowerCase();

  if (failed) {
    return (
      <span className={`${className} phone-input-flag-fallback`} aria-hidden>
        {iso}
      </span>
    );
  }

  return (
    <img
      className={className}
      src={`https://flagcdn.com/w40/${code}.png`}
      srcSet={`https://flagcdn.com/w80/${code}.png 2x`}
      width={24}
      height={18}
      alt=""
      aria-hidden
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
