/** Destino seleccionado en el buscador del hero (UBIGEO Perú). */
export interface DestinationOption {
  nombre: string;
  subtitle: string;
  ciudad: string;
  departamento?: string | null;
  provincia?: string | null;
  distrito?: string | null;
  tipo: "departamento" | "provincia" | "distrito";
}

/** Sugerencias rápidas al enfocar sin escribir. */
export const TOP_DESTINATIONS: DestinationOption[] = [
  {
    nombre: "Lima",
    subtitle: "Perú",
    ciudad: "Lima",
    departamento: "Lima",
    tipo: "departamento",
  },
  {
    nombre: "Miraflores",
    subtitle: "Lima, Perú",
    ciudad: "Miraflores",
    departamento: "Lima",
    provincia: "Lima",
    distrito: "Miraflores",
    tipo: "distrito",
  },
  {
    nombre: "Cusco",
    subtitle: "Cusco, Perú",
    ciudad: "Cusco",
    departamento: "Cusco",
    tipo: "departamento",
  },
  {
    nombre: "Arequipa",
    subtitle: "Arequipa, Perú",
    ciudad: "Arequipa",
    departamento: "Arequipa",
    tipo: "departamento",
  },
  {
    nombre: "Huánuco",
    subtitle: "Huánuco, Perú",
    ciudad: "Huánuco",
    departamento: "Huánuco",
    tipo: "departamento",
  },
  {
    // "Tingo María" es una ciudad capital (no siempre figura como distrito en UBIGEO).
    // Para filtros, se mapea al distrito donde cae (aprox. "Rupa Rupa") para mantener el buscador funcional.
    nombre: "Tingo María",
    subtitle: "Huánuco, Perú",
    ciudad: "Rupa Rupa",
    departamento: "Huánuco",
    provincia: "Leoncio Prado",
    distrito: "Rupa Rupa",
    tipo: "distrito",
  },
  {
    nombre: "Iquitos",
    subtitle: "Loreto, Perú",
    ciudad: "Iquitos",
    departamento: "Loreto",
    tipo: "distrito",
  },
];
