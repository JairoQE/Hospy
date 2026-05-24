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
    nombre: "Iquitos",
    subtitle: "Loreto, Perú",
    ciudad: "Iquitos",
    departamento: "Loreto",
    tipo: "distrito",
  },
];
