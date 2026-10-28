/**
 * Locations: a label people type or pick ("Claremont, Cape Town") plus, when we
 * know them, coordinates for working out distances. No network calls here.
 */
import { z } from "zod";

export interface Place {
  label: string;
  lat: number | null;
  lng: number | null;
}

/** Centre points of the main cities, used for demo data and when a typed name matches one. */
export const CITY_COORDS: Record<string, [number, number]> = {
  "Cape Town": [-33.9249, 18.4241],
  Stellenbosch: [-33.9321, 18.8602],
  Paarl: [-33.7342, 18.9621],
  "Somerset West": [-34.0757, 18.8433],
  George: [-33.963, 22.4617],
  Johannesburg: [-26.2041, 28.0473],
  Pretoria: [-25.7479, 28.2293],
  Durban: [-29.8587, 31.0218],
  Gqeberha: [-33.9608, 25.6022],
  Bloemfontein: [-29.0852, 26.1596],
  "East London": [-33.0153, 27.9116],
};

/** Places closer than this count as local (full marks); closer than COMMUTE_KM as commutable. */
export const LOCAL_KM = 25;
export const COMMUTE_KM = 60;

// A generous box around South Africa, to reject coordinates that can't be right.
const inSouthAfrica = (lat: number, lng: number) => lat >= -35.5 && lat <= -21.5 && lng >= 16 && lng <= 33.5;

/** Coordinates for a place: its own if known, otherwise those of a main city it names. */
export function coordsFor(place: { city: string; lat?: number | null; lng?: number | null }): [number, number] | null {
  if (place.lat != null && place.lng != null) return [place.lat, place.lng];
  const label = place.city.trim().toLowerCase();
  if (!label) return null;
  const exact = Object.entries(CITY_COORDS).find(([name]) => name.toLowerCase() === label);
  if (exact) return exact[1];
  // "Claremont, Cape Town": use the last part if it's a main city.
  const last = label.split(",").pop()!.trim();
  const fromLast = Object.entries(CITY_COORDS).find(([name]) => name.toLowerCase() === last);
  return fromLast ? fromLast[1] : null;
}

/** Straight-line distance between two points, in kilometres. */
export function distanceKm([lat1, lng1]: [number, number], [lat2, lng2]: [number, number]): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const a =
    Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

const coord = z.preprocess((v) => (v === "" || v == null ? null : v), z.coerce.number().nullable());

/**
 * Reads a location from a form: the text field `name`, plus hidden `${name}Lat` and
 * `${name}Lng` filled in when a suggestion was picked.
 */
export function parsePlace(form: FormData, name: string, message: string): { place: Place } | { error: string } {
  const label = String(form.get(name) ?? "").replace(/\s+/g, " ").trim();
  if (label.length < 2) return { error: message };
  if (label.length > 120) return { error: "Keep the location under 120 characters" };
  const lat = coord.safeParse(form.get(`${name}Lat`));
  const lng = coord.safeParse(form.get(`${name}Lng`));
  let point: [number, number] | null =
    lat.success && lng.success && lat.data != null && lng.data != null && inSouthAfrica(lat.data, lng.data)
      ? [lat.data, lng.data]
      : null;
  // Typed without picking a suggestion: still works if it names a main city.
  point ??= coordsFor({ city: label });
  return { place: { label, lat: point?.[0] ?? null, lng: point?.[1] ?? null } };
}
