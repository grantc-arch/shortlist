import { describe, expect, it } from "vitest";
import { coordsFor, distanceKm, parsePlace } from "./places";
import { DEFAULT_WEIGHTS, scoreMatch, type CandidateForMatching, type JobForMatching } from "./matching";

const CBD: [number, number] = [-33.9249, 18.4241];
const CLAREMONT: [number, number] = [-33.9806, 18.4653];
const BELLVILLE: [number, number] = [-33.9022, 18.6292];

const job: JobForMatching = {
  city: "Cape Town",
  lat: CBD[0],
  lng: CBD[1],
  workplace: "on_site",
  startDate: null,
  minQualification: "none",
  fieldKeywords: [],
  minYearsExperience: 0,
  skills: [],
  mustHaves: [],
  weights: DEFAULT_WEIGHTS,
};
const candidate = (city: string, at: [number, number] | null, willingToRelocate = false): CandidateForMatching => ({
  city,
  lat: at?.[0] ?? null,
  lng: at?.[1] ?? null,
  willingToRelocate,
  qualificationLevel: "none",
  fieldOfStudy: "",
  yearsExperience: 0,
  skills: [],
  availableFrom: null,
});
const location = (c: CandidateForMatching, j = job) => scoreMatch(j, c).criteria.find((x) => x.key === "location")!;

describe("distance", () => {
  it("measures straight-line distance", () => {
    expect(Math.round(distanceKm(CBD, CLAREMONT))).toBe(7);
    // Cape Town to Johannesburg is about 1 260 km as the crow flies.
    expect(Math.round(distanceKm(CBD, coordsFor({ city: "Johannesburg" })!) / 10) * 10).toBe(1260);
  });

  it("finds main cities by name, including at the end of a label", () => {
    expect(coordsFor({ city: "Durban" })).toEqual([-29.8587, 31.0218]);
    expect(coordsFor({ city: "Sea Point, Cape Town" })).toEqual(CBD);
    expect(coordsFor({ city: "Somewhere Else" })).toBeNull();
    expect(coordsFor({ city: "Durban", lat: 1, lng: 2 })).toEqual([1, 2]);
  });
});

describe("location score by distance", () => {
  it("gives full marks within 25 km and says how far", () => {
    const l = location(candidate("Claremont, Cape Town", CLAREMONT));
    expect(l.fraction).toBe(1);
    expect(l.detail).toContain("7 km away");
    expect(location(candidate("Bellville, Cape Town", BELLVILLE)).fraction).toBe(1);
  });

  it("counts 25 to 60 km as commutable", () => {
    const l = location(candidate("Stellenbosch", null));
    expect(l.fraction).toBe(0.75);
    expect(l.detail).toContain("within commuting distance");
  });

  it("falls back to relocation beyond 60 km", () => {
    expect(location(candidate("Durban", null, true)).fraction).toBe(0.5);
    expect(location(candidate("Durban", null, false)).fraction).toBe(0);
  });

  it("falls back to names when a place has no coordinates", () => {
    const unknownJob = { ...job, city: "Riebeek-Kasteel", lat: null, lng: null };
    expect(location(candidate("Riebeek-Kasteel", null), unknownJob).fraction).toBe(1);
    expect(location(candidate("Somewhere Else", null), unknownJob).fraction).toBe(0);
  });

  it("ignores distance for remote jobs", () => {
    expect(location(candidate("Durban", null), { ...job, workplace: "remote" }).fraction).toBe(1);
  });
});

describe("parsePlace", () => {
  const form = (entries: Record<string, string>) => {
    const f = new FormData();
    for (const [k, v] of Object.entries(entries)) f.set(k, v);
    return f;
  };

  it("keeps the coordinates of a picked suggestion", () => {
    const r = parsePlace(form({ city: "Claremont, Cape Town", cityLat: "-33.98", cityLng: "18.46" }), "city", "x");
    expect(r).toEqual({ place: { label: "Claremont, Cape Town", lat: -33.98, lng: 18.46 } });
  });

  it("accepts a typed place, using a main city's coordinates when it names one", () => {
    expect(parsePlace(form({ city: "  Durban " }), "city", "x")).toEqual({ place: { label: "Durban", lat: -29.8587, lng: 31.0218 } });
    expect(parsePlace(form({ city: "Riebeek-Kasteel" }), "city", "x")).toEqual({ place: { label: "Riebeek-Kasteel", lat: null, lng: null } });
  });

  it("rejects coordinates outside South Africa and empty input", () => {
    const r = parsePlace(form({ city: "Somewhere", cityLat: "51.5", cityLng: "-0.12" }), "city", "x");
    expect(r).toEqual({ place: { label: "Somewhere", lat: null, lng: null } });
    expect(parsePlace(form({ city: " " }), "city", "Enter a place")).toEqual({ error: "Enter a place" });
  });
});
