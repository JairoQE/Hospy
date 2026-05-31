/** Normaliza para comparar nombres UBIGEO con `Accommodation.city` (tildes, guiones, espacios). */
export function normalizePlaceText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ");
}

export function cityMatchesDistritoName(city: string, distritoNombre: string): boolean {
  const a = normalizePlaceText(city);
  const b = normalizePlaceText(distritoNombre);
  if (!a || !b) return false;
  return a === b;
}
