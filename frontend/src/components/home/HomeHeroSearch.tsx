import { useState } from "react";
import type { DestinationOption } from "../../data/destinationOptions";
import { TOP_DESTINATIONS } from "../../data/destinationOptions";
import { api } from "../../api/client";
import { PrimeIcon } from "../PrimeIcon";
import { useLocaleCurrency } from "../../context/LocaleCurrencyContext";
import { DateRangePicker } from "../calendar/DateRangePicker";
import { todayPlusDays } from "../../utils/format";
import type { SearchFilters } from "../SearchBar";
import { DestinationAutocomplete } from "./DestinationAutocomplete";
import { normalizePlaceText } from "../../utils/normalizePlaceText";

interface Props {
  onSearch: (filters: SearchFilters) => void;
}

export function HomeHeroSearch({ onSearch }: Props) {
  const { t } = useLocaleCurrency();
  const [ciudad, setCiudad] = useState("");
  const [destination, setDestination] = useState<DestinationOption | null>(null);
  const [entrada, setEntrada] = useState(todayPlusDays(7));
  const [salida, setSalida] = useState(todayPlusDays(9));

  const resolveFreeTextDestination = async (
    query: string,
  ): Promise<DestinationOption | null> => {
    const q = query.trim();
    if (q.length < 2) return null;

    const target = normalizePlaceText(q);

    // 1) Match rápido con sugerencias locales (incluye "Tingo María")
    const localExact =
      TOP_DESTINATIONS.find((d) => normalizePlaceText(d.nombre) === target) ?? null;
    if (localExact) return localExact;

    // 2) Pregunta al backend UBIGEO y toma mejor match exacto
    try {
      const data = await api.get<DestinationOption[]>(
        `/ubigeo/buscar/?q=${encodeURIComponent(q)}&limit=20`,
        false,
      );
      const rows = Array.isArray(data) ? data : [];
      const exact =
        rows.find((d) => normalizePlaceText(d.nombre) === target) ??
        rows.find((d) => normalizePlaceText(d.ciudad) === target) ??
        null;
      return exact;
    } catch {
      return null;
    }
  };

  const submit = async (e: React.FormEvent) => {
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

    let dest = destination;
    if (!dest) {
      // Si el usuario escribe pero no selecciona, resolvemos a UBIGEO para enviar provincia/departamento/distrito correctos.
      dest = await resolveFreeTextDestination(ciudad);
      if (dest) setDestination(dest);
    }

    if (!dest) {
      onSearch({ ...base, ciudad: ciudad.trim() });
      return;
    }

    if (dest.tipo === "departamento") {
      onSearch({
        ...base,
        departamento: dest.departamento ?? dest.nombre,
      });
      return;
    }

    if (dest.tipo === "provincia") {
      onSearch({
        ...base,
        departamento: dest.departamento ?? undefined,
        provincia: dest.provincia ?? dest.nombre,
      });
      return;
    }

    onSearch({
      ...base,
      ciudad: dest.ciudad,
      departamento: dest.departamento ?? undefined,
      provincia: dest.provincia ?? undefined,
      distrito: dest.distrito ?? dest.nombre,
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
