/** Límites aproximados para volar el mapa al hacer zoom por país. */
export const COUNTRY_BOUNDS: Record<string, [[number, number], [number, number]]> = {
  PE: [
    [-18.5, -81.5],
    [-0.05, -68.5],
  ],
  US: [
    [24.5, -125],
    [49.5, -66],
  ],
  CA: [
    [41, -141],
    [70, -52],
  ],
  DE: [
    [47.2, 5.8],
    [55.1, 15.5],
  ],
  FI: [
    [59.5, 19.5],
    [70.2, 31.5],
  ],
  ES: [
    [36, -9.5],
    [43.8, 4.5],
  ],
  MX: [
    [14.5, -118.5],
    [32.7, -86.5],
  ],
  BR: [
    [-33.8, -73.5],
    [5.3, -34.5],
  ],
  AR: [
    [-55.2, -73.6],
    [-21.8, -53.5],
  ],
  CL: [
    [-56.0, -75.6],
    [-17.5, -66.4],
  ],
  CO: [
    [-4.3, -79.0],
    [13.5, -66.8],
  ],
};

export const WORLD_BOUNDS: [[number, number], [number, number]] = [
  [-55, -130],
  [72, 40],
];

export const PERU_BOUNDS = COUNTRY_BOUNDS.PE;

export function boundsForCountry(code: string): [[number, number], [number, number]] | null {
  return COUNTRY_BOUNDS[code.toUpperCase()] ?? null;
}
