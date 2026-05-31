import { DateRangePicker } from "../calendar/DateRangePicker";
import { PrimeIcon } from "../PrimeIcon";

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

export function AdminDateField({ label, value, onChange }: Props) {
  return (
    <div className="admin-date-field">
      <DateRangePicker
        mode="single"
        startDate={value}
        endDate=""
        onChange={(start) => onChange(start)}
        checkInLabel={label}
        showPresets={false}
        variant="admin"
        className="admin-date-field__picker"
        confirmLabel="Listo"
        placeholder="dd/mm/yy"
      />
      {value ? (
        <button
          type="button"
          className="admin-date-field__clear"
          onClick={() => onChange("")}
          aria-label={`Quitar fecha (${label})`}
          title="Quitar fecha"
        >
          <PrimeIcon name="pi-times" size={12} />
        </button>
      ) : null}
    </div>
  );
}
