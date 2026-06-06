/** Hotel/hostal/hospedaje → precio por habitación; casa/departamento → alojamiento completo. */
export type PricingModel = "per_room" | "per_unit";

const WHOLE_UNIT_TYPES = new Set(["casa_departamento"]);

export function getPricingModel(accommodationType: string | undefined | null): PricingModel {
  return accommodationType && WHOLE_UNIT_TYPES.has(accommodationType) ? "per_unit" : "per_room";
}

export function isWholeUnitPricing(accommodationType: string | undefined | null): boolean {
  return getPricingModel(accommodationType) === "per_unit";
}
