export type PhoneCountry = {
  iso: string;
  name: string;
  dial: string;
  /** Grupos de dígitos nacionales para mostrar (ej. 912 345 678). */
  groups: number[];
  maxNational: number;
};

export const PHONE_COUNTRIES: PhoneCountry[] = [
  { iso: "PE", name: "Perú", dial: "51", groups: [3, 3, 3], maxNational: 9 },
  { iso: "US", name: "Estados Unidos", dial: "1", groups: [3, 3, 4], maxNational: 10 },
  { iso: "MX", name: "México", dial: "52", groups: [3, 3, 4], maxNational: 10 },
  { iso: "CO", name: "Colombia", dial: "57", groups: [3, 3, 4], maxNational: 10 },
  { iso: "AR", name: "Argentina", dial: "54", groups: [3, 4, 4], maxNational: 10 },
  { iso: "CL", name: "Chile", dial: "56", groups: [1, 4, 4], maxNational: 9 },
  { iso: "EC", name: "Ecuador", dial: "593", groups: [2, 3, 4], maxNational: 9 },
  { iso: "BO", name: "Bolivia", dial: "591", groups: [3, 3, 3], maxNational: 8 },
  { iso: "VE", name: "Venezuela", dial: "58", groups: [3, 3, 4], maxNational: 10 },
  { iso: "BR", name: "Brasil", dial: "55", groups: [2, 5, 4], maxNational: 11 },
  { iso: "ES", name: "España", dial: "34", groups: [3, 3, 3], maxNational: 9 },
  { iso: "DE", name: "Alemania", dial: "49", groups: [3, 4, 4], maxNational: 11 },
  { iso: "FR", name: "Francia", dial: "33", groups: [1, 2, 2, 2, 2], maxNational: 9 },
  { iso: "GB", name: "Reino Unido", dial: "44", groups: [4, 3, 4], maxNational: 10 },
];

const DEFAULT_COUNTRY = PHONE_COUNTRIES[0];

const BY_DIAL_DESC = [...PHONE_COUNTRIES].sort(
  (a, b) => b.dial.length - a.dial.length,
);

export function flagEmoji(iso: string): string {
  return iso
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}

export function formatNationalDigits(digits: string, groups: number[]): string {
  const parts: string[] = [];
  let i = 0;
  for (const size of groups) {
    if (i >= digits.length) break;
    parts.push(digits.slice(i, i + size));
    i += size;
  }
  if (i < digits.length) {
    parts.push(digits.slice(i));
  }
  return parts.join(" ").trim();
}

export function parsePhoneValue(value: string): {
  country: PhoneCountry;
  nationalDigits: string;
} {
  const digits = value.replace(/\D/g, "");
  if (!digits) {
    return { country: DEFAULT_COUNTRY, nationalDigits: "" };
  }

  for (const country of BY_DIAL_DESC) {
    if (digits.startsWith(country.dial)) {
      return {
        country,
        nationalDigits: digits.slice(country.dial.length).slice(0, country.maxNational),
      };
    }
  }

  if (digits.length <= DEFAULT_COUNTRY.maxNational) {
    return { country: DEFAULT_COUNTRY, nationalDigits: digits };
  }

  return { country: DEFAULT_COUNTRY, nationalDigits: digits.slice(-DEFAULT_COUNTRY.maxNational) };
}

export function buildPhoneValue(country: PhoneCountry, nationalDigits: string): string {
  const national = nationalDigits.replace(/\D/g, "").slice(0, country.maxNational);
  if (!national) return "";
  const formatted = formatNationalDigits(national, country.groups);
  return `+${country.dial} ${formatted}`;
}

export function findCountryByIso(iso: string): PhoneCountry {
  return PHONE_COUNTRIES.find((c) => c.iso === iso) ?? DEFAULT_COUNTRY;
}
