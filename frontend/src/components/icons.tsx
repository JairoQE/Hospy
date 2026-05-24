/** Iconos SVG inline (estilo Material) — sin dependencias extra. */

interface IconProps {
  size?: number;
  className?: string;
}

export function IconMapPin({ size = 20, className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden
    >
      <path
        fill="currentColor"
        d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"
      />
    </svg>
  );
}

export function IconCalendar({ size = 20, className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden
    >
      <path
        fill="currentColor"
        d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM5 8V6h14v2H5z"
      />
    </svg>
  );
}

export function IconSearch({ size = 20, className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden
    >
      <path
        fill="currentColor"
        d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
      />
    </svg>
  );
}

export function IconUser({ size = 20, className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden
    >
      <path
        fill="currentColor"
        d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
      />
    </svg>
  );
}

export function IconMail({ size = 20, className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden
    >
      <path
        fill="currentColor"
        d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5L4 8V6l8 5 8-5v2z"
      />
    </svg>
  );
}

export function IconLock({ size = 20, className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden
    >
      <path
        fill="currentColor"
        d="M18 8h-1V6a5 5 0 0 0-10 0v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm3.1-9H8.9V6a3.1 3.1 0 0 1 6.2 0v2z"
      />
    </svg>
  );
}

export function IconEye({ size = 20, className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden
    >
      <path
        fill="currentColor"
        d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"
      />
    </svg>
  );
}

export function IconEyeOff({ size = 20, className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden
    >
      <path
        fill="currentColor"
        d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46A11.804 11.804 0 0 0 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55a3 3 0 0 0 3.74 3.74l1.55 1.55a5 5 0 0 1-6.84-6.84z"
      />
    </svg>
  );
}

export function IconCheck({ size = 20, className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden
    >
      <path
        fill="currentColor"
        d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"
      />
    </svg>
  );
}

export function IconSend({ size = 20, className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden
    >
      <path
        fill="currentColor"
        d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z"
      />
    </svg>
  );
}

export function IconMenu({ size = 24, className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <path
        fill="currentColor"
        d="M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z"
      />
    </svg>
  );
}

export function IconClose({ size = 24, className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <path
        fill="currentColor"
        d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
      />
    </svg>
  );
}

export function IconArrowUp({ size = 20, className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <path fill="currentColor" d="M7.41 15.41 12 10.83l4.59 4.58L18 14l-6-6-6 6z" />
    </svg>
  );
}

export function IconChevronLeft({ size = 20, className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <path fill="currentColor" d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
    </svg>
  );
}

export function IconChevronRight({ size = 20, className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <path fill="currentColor" d="M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
    </svg>
  );
}

export function IconChevronDown({ size = 20, className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <path fill="currentColor" d="M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z" />
    </svg>
  );
}

export function IconWarning({ size = 20, className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <path
        fill="currentColor"
        d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"
      />
    </svg>
  );
}

export function IconSpinner({ size = 20, className }: IconProps) {
  return (
    <svg
      className={`icon-spinner${className ? ` ${className}` : ""}`}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden
    >
      <path
        fill="currentColor"
        d="M12 4V2A10 10 0 0 0 2 12h2a8 8 0 0 1 8-8z"
        opacity="0.9"
      />
    </svg>
  );
}
