import type { BrowseTile } from "../api/types";
import type { UbigeoItem } from "../components/home/LocationExplorer";

const GRADIENTS = [
  "linear-gradient(135deg, #1565c0 0%, #64b5f6 100%)",
  "linear-gradient(135deg, #6a1b9a 0%, #ce93d8 100%)",
  "linear-gradient(135deg, #bf360c 0%, #ff8a65 100%)",
  "linear-gradient(135deg, #00838f 0%, #4dd0e1 100%)",
  "linear-gradient(135deg, #1b5e20 0%, #81c784 100%)",
  "linear-gradient(135deg, #f57f17 0%, #ffd54f 100%)",
  "linear-gradient(135deg, #5d4037 0%, #a1887f 100%)",
  "linear-gradient(135deg, #283593 0%, #9fa8da 100%)",
];

function norm(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

function slugify(nombre: string): string {
  return norm(nombre).replace(/\s+/g, "-");
}

/** Los 25 departamentos del Perú (UBIGEO) con imágenes/degradados del admin si existen. */
export function mergeDepartmentTiles(
  ubigeo: UbigeoItem[],
  adminTiles: BrowseTile[],
): BrowseTile[] {
  const byKey = new Map<string, BrowseTile>();
  for (const tile of adminTiles) {
    byKey.set(norm(tile.title), tile);
    byKey.set(norm(tile.filter_value), tile);
    byKey.set(norm(tile.slug.replace(/-/g, " ")), tile);
  }

  return ubigeo
    .map((depto, index) => {
      const hit =
        byKey.get(norm(depto.nombre)) ??
        byKey.get(norm(depto.codigo)) ??
        null;
      if (hit) {
        return {
          ...hit,
          title: depto.nombre,
          filter_value: depto.nombre,
          order: Number.parseInt(depto.codigo, 10) || hit.order,
        };
      }
      return {
        id: 900_000 + index,
        group: "departamento" as const,
        title: depto.nombre,
        slug: slugify(depto.nombre),
        filter_value: depto.nombre,
        image_url: null,
        gradient_css: GRADIENTS[index % GRADIENTS.length],
        order: Number.parseInt(depto.codigo, 10) || index,
      };
    })
    .sort((a, b) => a.order - b.order);
}
