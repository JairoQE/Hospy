export function ratingLabel(score: number): string {
  if (score >= 9) return "Fantástico";
  if (score >= 8) return "Muy bien";
  if (score >= 7) return "Bien";
  if (score >= 6) return "Agradable";
  return "Aceptable";
}

export function ratingStars(score: number): number {
  if (score <= 0) return 0;
  return Math.min(5, Math.round(score / 2));
}
