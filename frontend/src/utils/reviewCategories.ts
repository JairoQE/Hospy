export const REVIEW_CATEGORY_KEYS = [
  "limpieza",
  "ubicacion",
  "servicio",
  "relacion_calidad_precio",
  "instalaciones",
  "comodidad_habitacion",
  "descanso",
  "wifi",
  "desayuno",
] as const;

export type ReviewCategoryKey = (typeof REVIEW_CATEGORY_KEYS)[number];

export const REVIEW_DISTRIBUTION_KEYS = [
  "excelente",
  "muy_bueno",
  "bueno",
  "razonable",
  "malo",
] as const;

export type ReviewDistributionKey = (typeof REVIEW_DISTRIBUTION_KEYS)[number];

export function defaultCategoryRatings(): Record<ReviewCategoryKey, number> {
  return REVIEW_CATEGORY_KEYS.reduce(
    (acc, key) => {
      acc[key] = 5;
      return acc;
    },
    {} as Record<ReviewCategoryKey, number>,
  );
}

export function categoryLabelKey(key: ReviewCategoryKey): string {
  return `reviews.categories.${key}`;
}

export function distributionLabelKey(key: ReviewDistributionKey): string {
  return `reviews.distribution.${key}`;
}

export function scoreToTen(ratingFive: number): number {
  return Math.round(ratingFive * 2 * 10) / 10;
}
