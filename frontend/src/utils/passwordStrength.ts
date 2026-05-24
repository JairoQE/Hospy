export type PasswordStrength = {
  score: number;
  label: string;
  percent: number;
  tone: "weak" | "fair" | "good" | "strong";
};

export function scorePassword(password: string): PasswordStrength {
  if (!password) {
    return { score: 0, label: "", percent: 0, tone: "weak" };
  }

  let points = 0;
  if (password.length >= 8) points += 1;
  if (password.length >= 12) points += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) points += 1;
  else if (/[a-zA-Z]/.test(password)) points += 0.5;
  if (/\d/.test(password)) points += 1;
  if (/[^a-zA-Z0-9]/.test(password)) points += 0.5;

  const score = Math.min(4, Math.floor(points));
  const percent = Math.min(100, (score / 4) * 100);

  const labels = ["Muy débil", "Débil", "Aceptable", "Buena", "Fuerte"];
  const tones: PasswordStrength["tone"][] = ["weak", "weak", "fair", "good", "strong"];

  return {
    score,
    label: labels[score] ?? "",
    percent: password.length < 8 ? Math.min(percent, 25) : percent,
    tone: tones[score] ?? "weak",
  };
}
