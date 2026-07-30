/**
 * Delivery zone for Jatek — Oujda, Morocco
 * Covers the city and its immediate suburbs within MAX_RADIUS_KM.
 */

export const OUJDA_CENTER = {
  latitude: 34.6878,
  longitude: -1.9076,
  name: "Oujda",
};

/** Maximum delivery radius in kilometres around Oujda city centre */
export const MAX_RADIUS_KM = 5;

/** Friendly out-of-zone message shown to the user. */
export const OUT_OF_ZONE_MESSAGE =
  "Désolé, cette adresse est en dehors de notre zone de livraison (5 km autour d'Oujda). Nous arrivons bientôt chez vous !";

/**
 * Haversine formula — returns the great-circle distance (km) between two
 * lat/lng points.
 */
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export interface ZoneCheckResult {
  inZone: boolean;
  distanceKm: number;
}

/**
 * Check whether a lat/lng coordinate is within the Oujda delivery zone.
 */
export function checkDeliveryZone(
  latitude: number,
  longitude: number
): ZoneCheckResult {
  const distanceKm = haversineKm(
    OUJDA_CENTER.latitude,
    OUJDA_CENTER.longitude,
    latitude,
    longitude
  );
  return { inZone: distanceKm <= MAX_RADIUS_KM, distanceKm };
}

const GOOGLE_PLACES_KEY = (process.env.EXPO_PUBLIC_GOOGLE_PLACES_KEY ?? "").trim();
const useGoogle = GOOGLE_PLACES_KEY.length > 0;

/**
 * Reverse geocode: coords → human-readable address.
 * Uses Google Geocoding API if EXPO_PUBLIC_GOOGLE_PLACES_KEY is set,
 * otherwise falls back to OpenStreetMap Nominatim.
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<{ address: string; displayName: string }> {
  if (useGoogle) {
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&language=fr&key=${GOOGLE_PLACES_KEY}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const first = data.results?.[0];
        if (first) {
          const display = first.formatted_address as string;
          return { address: display, displayName: display };
        }
      }
    } catch { /* fall through to Nominatim */ }
  }
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&accept-language=fr`;
  const res = await fetch(url, {
    headers: { "User-Agent": "JatekMobileApp/1.0" },
  });
  if (!res.ok) throw new Error("Reverse geocoding failed");
  const data = await res.json();

  const a = data.address ?? {};
  const parts = [
    a.road ?? a.pedestrian ?? a.footway,
    a.house_number,
    a.neighbourhood ?? a.suburb,
    a.city ?? a.town ?? a.village,
  ].filter(Boolean);

  const address =
    parts.join(", ") || data.display_name || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;

  return { address, displayName: data.display_name ?? address };
}

/**
 * Nominatim forward-geocode: text query → array of place suggestions,
 * biased towards Morocco.
 */
export interface PlaceSuggestion {
  placeId: number;
  displayName: string;
  shortName: string;
  secondaryText: string;
  latitude: number;
  longitude: number;
}

export async function searchPlaces(query: string): Promise<PlaceSuggestion[]> {
  if (query.trim().length < 3) return [];

  if (useGoogle) {
    try {
      const params = new URLSearchParams({
        input: query,
        language: "fr",
        components: "country:ma",
        location: `${OUJDA_CENTER.latitude},${OUJDA_CENTER.longitude}`,
        radius: String(MAX_RADIUS_KM * 1000),
        key: GOOGLE_PLACES_KEY,
      });
      const res = await fetch(`https://maps.googleapis.com/maps/api/place/autocomplete/json?${params}`);
      if (res.ok) {
        const data = await res.json();
        const preds: any[] = data.predictions ?? [];
        const detailed = await Promise.all(preds.slice(0, 6).map(async (p) => {
          const dRes = await fetch(`https://maps.googleapis.com/maps/api/place/details/json?place_id=${p.place_id}&fields=geometry,formatted_address&language=fr&key=${GOOGLE_PLACES_KEY}`);
          if (!dRes.ok) return null;
          const d = await dRes.json();
          const loc = d.result?.geometry?.location;
          if (!loc) return null;
          return {
            placeId: p.place_id,
            displayName: d.result?.formatted_address ?? p.description,
            shortName: p.structured_formatting?.main_text ?? p.description,
            secondaryText: p.structured_formatting?.secondary_text ?? "",
            latitude: loc.lat,
            longitude: loc.lng,
          } as PlaceSuggestion;
        }));
        const out = detailed.filter(Boolean) as PlaceSuggestion[];
        if (out.length > 0) return out;
      }
    } catch { /* fall through to Nominatim */ }
  }

  const params = new URLSearchParams({
    format: "json",
    q: `${query}, Oujda`,
    countrycodes: "ma",
    limit: "6",
    addressdetails: "1",
    "accept-language": "fr",
    viewbox: "-2.15,34.55,-1.65,34.85",
    bounded: "0",
  });

  const url = `https://nominatim.openstreetmap.org/search?${params}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "JatekMobileApp/1.0" },
  });
  if (!res.ok) return [];

  const results: any[] = await res.json();

  return results.map((r) => {
    const a = r.address ?? {};
    const road = a.road ?? a.pedestrian ?? a.footway ?? "";
    const suburb = a.neighbourhood ?? a.suburb ?? "";
    const city = a.city ?? a.town ?? a.village ?? "Oujda";

    const mainParts = [road, a.house_number].filter(Boolean);
    const shortName =
      mainParts.length > 0 ? mainParts.join(" ") : r.display_name.split(",")[0];

    const secParts = [suburb, city].filter(Boolean);
    const secondaryText = secParts.join(", ") || r.display_name;

    return {
      placeId: r.place_id,
      displayName: r.display_name,
      shortName,
      secondaryText,
      latitude: parseFloat(r.lat),
      longitude: parseFloat(r.lon),
    };
  });
}
