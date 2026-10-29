import { describe, expect, it } from "vitest";
import {
  DEFAULT_WEIGHTS,
  normaliseWeights,
  rebalance,
  parseList,
  scoreMatch,
  skillsMatch,
  type CandidateForMatching,
  type JobForMatching,
} from "./matching";

const job: JobForMatching = {
  city: "Cape Town",
  workplace: "on_site",
  startDate: "2026-11-01",
  minQualification: "degree",
  fieldKeywords: ["marketing"],
  minYearsExperience: 1,
  skills: ["Microsoft Excel", "Outlook", "Canva", "Diary management"],
  mustHaves: ["Reliable transport", "Proficient in Microsoft Office"],
  weights: DEFAULT_WEIGHTS,
};

const ideal: CandidateForMatching = {
  city: "Cape Town",
  willingToRelocate: false,
  qualificationLevel: "degree",
  fieldOfStudy: "Marketing Management",
  yearsExperience: 2,
  skills: ["Excel", "Outlook", "Canva", "Diary management", "Photography"],
  availableFrom: "2026-10-30",
};

describe("scoreMatch", () => {
  it("gives a perfect candidate 100", () => {
    const r = scoreMatch(job, ideal);
    expect(r.total).toBe(100);
    expect(r.criteria.every((c) => c.fraction === 1)).toBe(true);
  });

  it("criterion points add up to the total", () => {
    const r = scoreMatch(job, { ...ideal, yearsExperience: 0, skills: ["Canva"], city: "Durban" });
    const sum = r.criteria.reduce((s, c) => s + c.points, 0);
    expect(Math.round(sum)).toBe(r.total);
  });

  it("penalises a degree in the wrong field but credits the level", () => {
    const r = scoreMatch(job, { ...ideal, fieldOfStudy: "Accounting" });
    const q = r.criteria.find((c) => c.key === "qualification")!;
    expect(q.fraction).toBeCloseTo(0.6);
    expect(q.detail).toContain("doesn't match");
  });

  it("gives partial credit for a lower qualification", () => {
    const r = scoreMatch(job, { ...ideal, qualificationLevel: "diploma" });
    const q = r.criteria.find((c) => c.key === "qualification")!;
    // diploma is level 3 of the required 4 → 0.75 of the level part (0.6) + field part (0.4)
    expect(q.fraction).toBeCloseTo(0.75 * 0.6 + 0.4);
  });

  it("scores skills by overlap and names what's missing", () => {
    const r = scoreMatch(job, { ...ideal, skills: ["excel", "canva"] });
    const s = r.criteria.find((c) => c.key === "skills")!;
    expect(s.fraction).toBe(0.5);
    expect(s.detail).toContain("Outlook");
    expect(s.detail).toContain("Diary management");
  });

  it("treats nearby towns as commutable", () => {
    const r = scoreMatch(job, { ...ideal, city: "Stellenbosch" });
    expect(r.criteria.find((c) => c.key === "location")!.fraction).toBe(0.75);
  });

  it("scores far-away candidates by willingness to relocate", () => {
    const stay = scoreMatch(job, { ...ideal, city: "Durban", willingToRelocate: false });
    const move = scoreMatch(job, { ...ideal, city: "Durban", willingToRelocate: true });
    expect(stay.criteria.find((c) => c.key === "location")!.fraction).toBe(0);
    expect(move.criteria.find((c) => c.key === "location")!.fraction).toBe(0.5);
  });

  it("ignores location for remote roles", () => {
    const r = scoreMatch({ ...job, workplace: "remote" }, { ...ideal, city: "Durban" });
    expect(r.criteria.find((c) => c.key === "location")!.fraction).toBe(1);
  });

  it("reduces availability the later a candidate can start", () => {
    const at = (d: string) =>
      scoreMatch(job, { ...ideal, availableFrom: d }).criteria.find((c) => c.key === "availability")!.fraction;
    expect(at("2026-11-01")).toBe(1);
    expect(at("2026-11-10")).toBe(0.7);
    expect(at("2026-11-25")).toBe(0.4);
    expect(at("2027-02-01")).toBe(0.1);
  });

  it("respects employer weights", () => {
    const skillsOnly = { ...job, weights: { qualification: 0, experience: 0, skills: 100, location: 0, availability: 0 } };
    const r = scoreMatch(skillsOnly, { ...ideal, skills: ["Canva"], qualificationLevel: "none", city: "Durban" });
    expect(r.total).toBe(25);
  });

  it("flags but doesn't zero out unmet must-haves", () => {
    const r = scoreMatch(job, ideal, [true, false]);
    expect(r.mustHavesMet).toBe(false);
    expect(r.total).toBe(100);
    expect(r.mustHaves[1]).toEqual({ question: "Proficient in Microsoft Office", answer: false });
  });

  it("leaves must-haves unknown before the candidate applies", () => {
    expect(scoreMatch(job, ideal).mustHavesMet).toBeNull();
  });
});

describe("helpers", () => {
  it("matches skills loosely", () => {
    expect(skillsMatch("Microsoft Excel", "excel")).toBe(true);
    expect(skillsMatch("Canva", "Photoshop")).toBe(false);
    expect(skillsMatch("", "Excel")).toBe(false);
  });

  it("parses comma and newline lists without duplicates", () => {
    expect(parseList("Excel, Outlook\ncanva,, excel ")).toEqual(["Excel", "Outlook", "canva"]);
  });

  it("falls back to default weights when all are zero", () => {
    expect(normaliseWeights({ skills: 0 })).toEqual(DEFAULT_WEIGHTS);
  });

  it("turns weights into whole percentages adding up to 100", () => {
    expect(normaliseWeights({ skills: 50.4, location: -3 })).toEqual({ qualification: 0, experience: 0, skills: 100, location: 0, availability: 0 });
    // Old jobs saved from the 0-50 sliders keep their proportions.
    const w = normaliseWeights({ qualification: 10, experience: 10, skills: 10, location: 0, availability: 0 });
    expect(Object.values(w).reduce((a, b) => a + b, 0)).toBe(100);
    expect(w).toEqual({ qualification: 34, experience: 33, skills: 33, location: 0, availability: 0 });
  });
});

describe("rebalance", () => {
  const sum = (w: Record<string, number>) => Object.values(w).reduce((a, b) => a + b, 0);

  it("moves one criterion by 1% and keeps the total at 100", () => {
    const w = rebalance(DEFAULT_WEIGHTS, "skills", 31);
    expect(w.skills).toBe(31);
    expect(sum(w)).toBe(100);
  });

  it("shares the change between the others in proportion", () => {
    // Others were 25/20/15/10; taking skills from 30 to 50 leaves 50 for them.
    expect(rebalance(DEFAULT_WEIGHTS, "skills", 50)).toEqual({ qualification: 18, experience: 14, skills: 50, location: 11, availability: 7 });
  });

  it("handles 0 and 100", () => {
    expect(rebalance(DEFAULT_WEIGHTS, "skills", 100)).toEqual({ qualification: 0, experience: 0, skills: 100, location: 0, availability: 0 });
    const back = rebalance({ qualification: 0, experience: 0, skills: 100, location: 0, availability: 0 }, "skills", 60);
    expect(back).toEqual({ qualification: 10, experience: 10, skills: 60, location: 10, availability: 10 });
  });

  it("clamps typed values", () => {
    expect(rebalance(DEFAULT_WEIGHTS, "location", 140).location).toBe(100);
    expect(rebalance(DEFAULT_WEIGHTS, "location", -5).location).toBe(0);
  });

  it("always adds up to 100, whatever the starting point", () => {
    for (let v = 0; v <= 100; v += 7) expect(sum(rebalance({ qualification: 3, experience: 0, skills: 1, location: 1, availability: 0 }, "experience", v))).toBe(100);
  });
});
