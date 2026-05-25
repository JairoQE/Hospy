import { useState } from "react";
import type { DestinationOption } from "../../data/destinationOptions";
import { PrimeIcon } from "../PrimeIcon";
import { useLocaleCurrency } from "../../context/LocaleCurrencyContext";
import { DateRangePicker } from "../calendar/DateRangePicker";
import { todayPlusDays } from "../../utils/format";
import type { SearchFilters } from "../SearchBar";
import { DestinationAutocomplete } from "./DestinationAutocomplete";

interface Props {
  onSearch: (filters: SearchFilters) => void;
}

export function HomeHeroSearch({ onSearch }: Props) {
  const { t } = useLocaleCurrency();
  const [ciudad, setCiudad] = useState("");
  const [destination, setDestination] = useState<DestinationOption | null>(null);
  const [entrada, setEntrada] = useState(todayPlusDays(7));
  const [salida, setSalida] = useState(todayPlusDays(9));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const base: SearchFilters = {
      ciudad: "",
      entrada,
      salida,
      tipo: "",
      precio_min: "",
      precio_max: "",
      ordenar: "-rating",
    };

    if (!destination) {
      onSearch({ ...base, ciudad: ciudad.trim() });
      return;
    }

    if (destination.tipo === "departamento") {
      onSearch({
        ...base,
        departamento: destination.departamento ?? destination.nombre,
      });
      return;
    }

    if (destination.tipo === "provincia") {
      onSearch({
        ...base,
        departamento: destination.departamento ?? undefined,
        provincia: destination.provincia ?? destination.nombre,
      });
      return;
    }

    onSearch({
      ...base,
      ciudad: destination.ciudad,
      departamento: destination.departamento ?? undefined,
      provincia: destination.provincia ?? undefined,
      distrito: destination.distrito ?? destination.nombre,
    });
  };

  return (
    <form className="hero-search hero-search--v2" onSubmit={submit}>
      <label className="hero-search-field hero-search-field-wide hero-search-field-destination">
        <span className="hero-search-label">{t("search.where")}</span>
        <DestinationAutocomplete
          value={ciudad}
          onChange={(v) => {
            setCiudad(v);
            setDestination(null);
          }}
          onSelect={(opt) => setDestination(opt)}
          placeholder={t("search.destinationPlaceholder")}
        />
      </label>

      <div className="hero-search-field hero-search-field-dates">
        <DateRangePicker
          variant="hero"
          className="hero-date-picker"
          startDate={entrada}
          endDate={salida}
          minDate={todayPlusDays(0)}
          showPresets
          onChange={(start, end) => {
            setEntrada(start);
            if (end) setSalida(end);
          }}
        />
      </div>

      <button type="submit" className="btn btn-hero-search btn-hero-search--v2">
        <PrimeIcon name="pi-search" size={24} />
        <span>{t("search.searchBtn")}</span>
      </button>
    </form>
  );
}
