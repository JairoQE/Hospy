import { PrimeIcon } from "../PrimeIcon";

export type OwnerPanelTab = "dashboard" | "hospedajes" | "reservas" | "consultas" | "nuevo";

type Props = {
  tab: OwnerPanelTab;
  onTabChange: (tab: OwnerPanelTab) => void;
};

const NAV_ITEMS: { id: OwnerPanelTab; label: string; icon: string }[] = [
  { id: "dashboard", label: "Dashboard", icon: "pi-chart-bar" },
  { id: "hospedajes", label: "Mis hospedajes", icon: "pi-home" },
  { id: "reservas", label: "Reservas", icon: "pi-calendar" },
  { id: "consultas", label: "Consultas", icon: "pi-comments" },
];

export function OwnerPanelNav({ tab, onTabChange }: Props) {
  return (
    <nav className="owner-panel-nav" aria-label="Secciones del panel">
      <ul className="owner-panel-nav-list">
        {NAV_ITEMS.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className={`owner-panel-nav-link${tab === item.id ? " is-active" : ""}`}
              onClick={() => onTabChange(item.id)}
              aria-current={tab === item.id ? "page" : undefined}
            >
              <PrimeIcon name={item.icon} size={20} />
              {item.label}
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className={`owner-panel-nav-new${tab === "nuevo" ? " is-active" : ""}`}
        onClick={() => onTabChange("nuevo")}
        aria-current={tab === "nuevo" ? "page" : undefined}
      >
        <PrimeIcon name="pi-plus" size={18} />
        Nuevo hospedaje
      </button>
    </nav>
  );
}
