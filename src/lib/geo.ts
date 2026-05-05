/**
 * Geo utilities for Wanderful Journeys.
 * - reverseGeocode: lat/lng → { city, country, country_code, displayName } via Nominatim
 * - haversineKm: great-circle distance between two coords
 * - getCurrentPosition: Promise wrapper around navigator.geolocation
 *
 * Nominatim usage policy: 1 request/second max. Acceptable for a 2-user app.
 * https://operations.osmfoundation.org/policies/nominatim/
 */

export type ReverseGeocodeResult = {
  city: string | null;
  country: string | null;
  countryCode: string | null; // ISO 3166-1 alpha-2, lowercase
  displayName: string | null; // full formatted address from Nominatim
};

type NominatimResponse = {
  display_name?: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    hamlet?: string;
    municipality?: string;
    suburb?: string;
    county?: string;
    state?: string;
    country?: string;
    country_code?: string;
  };
};

/**
 * Reverse geocode a lat/lng to a human-readable place via Nominatim.
 * Returns null fields on failure rather than throwing — caller decides what to show.
 */
export async function reverseGeocode(
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<ReverseGeocodeResult> {
  const empty: ReverseGeocodeResult = {
    city: null,
    country: null,
    countryCode: null,
    displayName: null,
  };

  try {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("lat", lat.toString());
    url.searchParams.set("lon", lng.toString());
    url.searchParams.set("format", "json");
    url.searchParams.set("zoom", "14"); // city/town level granularity
    url.searchParams.set("addressdetails", "1");

    const res = await fetch(url.toString(), {
      headers: {
        // Nominatim requires a descriptive User-Agent, but browsers won't let us set it.
        // Setting Accept-Language is allowed and helps return localized names.
        "Accept-Language": "en",
      },
      signal,
    });

    if (!res.ok) return empty;

    const data = (await res.json()) as NominatimResponse;
    const addr = data.address ?? {};

    // Nominatim returns "city" only for actual cities. Fall back through the hierarchy.
    const city =
      addr.city ??
      addr.town ??
      addr.village ??
      addr.hamlet ??
      addr.municipality ??
      addr.suburb ??
      addr.county ??
      addr.state ??
      null;

    return {
      city,
      country: addr.country ?? null,
      countryCode: addr.country_code ? addr.country_code.toLowerCase() : null,
      displayName: data.display_name ?? null,
    };
  } catch {
    return empty;
  }
}

/**
 * Build a human-friendly location label from a reverse-geocode result.
 * "Florence, Italy" or "Florence" or "" if nothing usable.
 */
export function formatLocationLabel(geo: ReverseGeocodeResult): string {
  if (geo.city && geo.country) return `${geo.city}, ${geo.country}`;
  if (geo.city) return geo.city;
  if (geo.country) return geo.country;
  return "";
}

/**
 * Haversine great-circle distance in kilometers between two lat/lng points.
 */
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Promise wrapper around navigator.geolocation.getCurrentPosition.
 * Used as iOS Safari fallback — Safari strips EXIF GPS on upload.
 */
export function getCurrentPosition(
  options: PositionOptions = {
    enableHighAccuracy: true,
    timeout: 10_000,
    maximumAge: 60_000,
  },
): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Geolocation is not available in this browser."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      options,
    );
  });
}
