import { DateRangePicker } from "../calendar/DateRangePicker";
import { PrimeIcon } from "../PrimeIcon";

type Props = {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
};

export function AdminDateRangeField({ from, to, onChange }: Props) {
  const hasValue = Boolean(from || to);

  return (
    <div className="admin-date-range-inline">
      <DateRangePicker
        mode="range"
        startDate={from}
        endDate={to}
        onChange={onChange}
        checkInLabel="Desde"
        checkOutLabel="Hasta"
        showPresets={false}
        variant="admin"
        className="admin-date-range-inline__picker"
        confirmLabel="Listo"
        placeholder="dd/mm/yy"
        popoverWidth={340}
      />
      {hasValue && (
        <button
          type="button"
          className="admin-date-range-inline__clear"
          onClick={() => onChange("", "")}
          aria-label="Quitar rango de fechas"
          title="Quitar fechas"
        >
          <PrimeIcon name="pi-times" size={12} />
        </button>
      )}
    </div>
  );
}
