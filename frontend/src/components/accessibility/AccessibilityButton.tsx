import { useAccessibility } from "../../context/AccessibilityContext";

export function AccessibilityButton() {
  const { menuOpen, toggleMenu } = useAccessibility();

  return (
    <button
      type="button"
      className="a11y-trigger"
      onClick={toggleMenu}
      aria-expanded={menuOpen}
      aria-controls="a11y-menu-panel"
      aria-label="Menú de accesibilidad"
    >
      <svg
        className="a11y-trigger-icon"
        viewBox="0 0 48 48"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <rect width="48" height="48" rx="6" fill="#2b78c9" />
        <circle cx="24" cy="24" r="14" fill="#fff" />
        <path
          fill="#6eb5f0"
          d="M24 14c-1.2 0-2.2 1-2.2 2.2 0 1.2 1 2.2 2.2 2.2s2.2-1 2.2-2.2C26.2 15 25.2 14 24 14zm-6.8 4.5c-.9 0-1.6.7-1.6 1.6 0 .9.7 1.6 1.6 1.6h13.6c.9 0 1.6-.7 1.6-1.6 0-.9-.7-1.6-1.6-1.6H17.2zm-2.4 6.2c-.9 0-1.6.7-1.6 1.6v.2c0 .9.7 1.6 1.6 1.6h18.4c.9 0 1.6-.7 1.6-1.6v-.2c0-.9-.7-1.6-1.6-1.6H14.8z"
        />
        <circle cx="24" cy="18.5" r="2.2" fill="#6eb5f0" />
        <path
          fill="#6eb5f0"
          d="M17 27.5c0-1.2.9-2.1 2.1-2.1h13.8c1.2 0 2.1.9 2.1 2.1v1.2c0 .6-.5 1.1-1.1 1.1H18.1c-.6 0-1.1-.5-1.1-1.1v-1.2z"
        />
      </svg>
    </button>
  );
}
