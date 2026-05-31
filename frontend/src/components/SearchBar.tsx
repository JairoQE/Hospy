import { useState } from "react";
import { DateRangePicker } from "./calendar/DateRangePicker";
import { todayPlusDays } from "../utils/format";

export interface SearchFilters {
  ciudad: string;
  entrada: string;
  salida: string;
  tipo: string;
  precio_min: string;
  precio_max: string;
  ordenar: string;
  departamento?: string;
  provincia?: string;
  distrito?: string;
}

interface Props {
  initial?: Partial<SearchFilters>;
  onSearch: (filters: SearchFilters) => void;
}

export function SearchBar({ initial, onSearch }: Props) {
  const [f, setF] = useState<SearchFilters>({
    ciudad: initial?.ciudad ?? "",
    entrada: initial?.entrada ?? todayPlusDays(7),
    salida: initial?.salida ?? todayPlusDays(9),
    tipo: initial?.tipo ?? "",
    precio_min: initial?.precio_min ?? "",
    precio_max: initial?.precio_max ?? "",
    ordenar: initial?.ordenar ?? "-rating",
  });

  const update = (key: keyof SearchFilters, value: string) =>
    setF((prev) => ({ ...prev, [key]: value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(f);
  };

  return (
    <form className="search-bar card" onSubmit={submit}>
      <div className="search-grid">
        <label>
          Ciudad
          <input
            type="text"
            placeholder="Ej. Lima"
            value={f.ciudad}
            onChange={(e) => update("ciudad", e.target.value)}
          />
        </label>
        <div className="search-bar-dates">
          <DateRangePicker
            startDate={f.entrada}
            endDate={f.salida}
            minDate={todayPlusDays(0)}
            onChange={(start, end) => {
              update("entrada", start);
              update("salida", end);
            }}
          />
        </div>
        <label>
          Tipo
          <select value={f.tipo} onChange={(e) => update("tipo", e.target.value)}>
            <option value="">Todos</option>
          <option value="hotel">Hotel</option>
          <option value="hostal">Hostal</option>
          <option value="hospedaje">Hospedaje</option>
          <option value="casa_departamento">Casa o departamento</option>
          </select>
        </label>
        <label>
          Precio máx.
          <input
            type="number"
            min={0}
            placeholder="S/"
            value={f.precio_max}
            onChange={(e) => update("precio_max", e.target.value)}
          />
        </label>
        <label>
          Ordenar
          <select value={f.ordenar} onChange={(e) => update("ordenar", e.target.value)}>
            <option value="-rating">Mejor valorados</option>
            <option value="precio">Precio (menor a mayor)</option>
            <option value="-precio">Precio (mayor a menor)</option>
            <option value="nombre">Nombre A-Z</option>
          </select>
        </label>
      </div>
      <button type="submit" className="btn btn-primary">
        Buscar hospedajes
      </button>
    </form>
  );
}
