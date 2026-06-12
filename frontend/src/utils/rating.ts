import type { Language } from "../i18n/translations";
import { translate } from "../i18n/translations";
import { getLocaleCurrencyConfig } from "./localeCurrencyConfig";

export function ratingLabel(score: number, language?: Language): string {
  const lang = language ?? getLocaleCurrencyConfig().language;
  if (score >= 9) return translate("detail.rating.fantastic", lang);
  if (score >= 8) return translate("detail.rating.excellent", lang);
  if (score >= 7) return translate("detail.rating.veryGood", lang);
  if (score >= 6) return translate("detail.rating.good", lang);
  if (score >= 5) return translate("detail.rating.pleasant", lang);
  return translate("detail.rating.acceptable", lang);
}

/** Convierte promedio almacenado (1–5) a escala 10 para mostrar en tarjetas. */
export function toTenPointScore(rating: number): number {
  if (rating <= 0) return 0;
  return rating <= 5 ? rating * 2 : rating;
}

export function ratingStars(score: number): number {
  if (score <= 0) return 0;
  return Math.min(5, Math.round(score / 2));
}
