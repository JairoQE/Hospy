/** Reverse geocode (Nominatim) → etiqueta corta legible. */
export async function reverseGeocodeLabel(
  lat: number,
  lng: number,
): Promise<string | null> {
  const url =
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}` +
    `&lon=${lng}&zoom=16&addressdetails=1`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "Accept-Language": "es",
    },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    display_name?: string;
    address?: {
      road?: string;
      neighbourhood?: string;
      suburb?: string;
      city?: string;
      town?: string;
      village?: string;
      municipality?: string;
      state?: string;
    };
  };
  const a = data.address;
  if (!a) {
    const first = data.display_name?.split(",")[0]?.trim();
    return first || null;
  }
  const place =
    a.city || a.town || a.village || a.municipality || a.suburb || "";
  const street = a.road || a.neighbourhood || a.suburb || "";
  if (street && place && street.toLowerCase() !== place.toLowerCase()) {
    return `${street}, ${place}`;
  }
  return street || place || data.display_name?.split(",")[0]?.trim() || null;
}

export function formatLocationLabel(
  address?: string | null,
  city?: string | null,
): string | null {
  const addr = (address || "").trim();
  const c = (city || "").trim();
  if (addr && c && !addr.toLowerCase().includes(c.toLowerCase())) {
    return `${addr}, ${c}`;
  }
  return addr || c || null;
}
