import { useAccessibility } from "../../context/AccessibilityContext";
import { AccessibilityIcon } from "./AccessibilityIcon";

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
      <AccessibilityIcon className="a11y-trigger-icon" />
    </button>
  );
}
