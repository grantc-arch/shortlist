import { NextResponse, type NextRequest } from "next/server";

/**
 * Place suggestions for the location fields, from Photon (komoot's free geocoder for
 * OpenStreetMap data). Requests go through this route rather than straight from the
 * browser, so visitors' addresses aren't sent to a third party and results can be cached.
 */
const PHOTON = process.env.PLACES_API_URL || "https://photon.komoot.io";
// Roughly South Africa (west, south, east, north); results are also filtered by country code.
const SA_BBOX = "16.3,-35.0,33.0,-22.1";
const KINDS = new Set(["city", "town", "village", "suburb", "quarter", "neighbourhood", "hamlet", "locality", "borough"]);

interface PhotonFeature {
  geometry: { coordinates: [number, number] };
  properties: {
    name?: string;
    city?: string;
    county?: string;
    state?: string;
    countrycode?: string;
    osm_key?: string;
    osm_value?: string;
  };
}

export interface PlaceSuggestion {
  label: string;
  detail: string;
  lat: number;
  lng: number;
}

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 80);
  if (q.length < 2) return NextResponse.json({ places: [] });

  const url = `${PHOTON}/api/?q=${encodeURIComponent(q)}&limit=10&lang=en&bbox=${SA_BBOX}&osm_tag=place`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Shortlist job board (github.com/grantc-arch/shortlist)" },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) throw new Error(`Photon returned ${res.status}`);
    const data = (await res.json()) as { features?: PhotonFeature[] };

    const seen = new Set<string>();
    const places: PlaceSuggestion[] = [];
    for (const f of data.features ?? []) {
      const p = f.properties;
      if (p.countrycode !== "ZA" || !p.name || p.osm_key !== "place" || !KINDS.has(p.osm_value ?? "")) continue;
      const parent = p.city && p.city !== p.name ? p.city : null;
      const label = parent ? `${p.name}, ${parent}` : p.name;
      const key = label.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const [lng, lat] = f.geometry.coordinates;
      places.push({ label, detail: p.state ?? "", lat, lng });
      if (places.length === 6) break;
    }
    return NextResponse.json(
      { places },
      // Place names don't change; let the CDN reuse answers for a day.
      { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } },
    );
  } catch (err) {
    console.error("Place search failed:", err);
    // The form still works without suggestions: people can type their place.
    return NextResponse.json({ places: [], unavailable: true });
  }
}
