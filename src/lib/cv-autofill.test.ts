import { describe, expect, it } from "vitest";
import { matchQualification, normaliseExtraction, type CvExtraction } from "./cv-extraction";
import { mergeSuggestions, type ProfileDraft } from "./autofill-merge";

const raw: CvExtraction = {
  fullName: "  Thandi   Nkosi ",
  phone: "082 555 0101",
  city: "cape town",
  qualificationLevel: "degree",
  fieldOfStudy: "Marketing Management",
  yearsExperience: 2.7,
  skills: ["Excel", "Outlook", "excel", "Diary management, minute taking", "  "],
  summary: "Marketing graduate with two years in agency admin.",
  hasOwnTransport: true,
};

const empty: ProfileDraft = {
  fullName: "",
  phone: "",
  city: "",
  cityLat: null,
  cityLng: null,
  availableFrom: "",
  willingToRelocate: false,
  hasOwnTransport: false,
  qualificationLevel: "none",
  fieldOfStudy: "",
  yearsExperience: 0,
  skills: "",
  summary: "",
};

describe("normaliseExtraction", () => {
  it("cleans up the model's answer", () => {
    const s = normaliseExtraction(raw);
    expect(s.fullName).toBe("Thandi Nkosi");
    expect(s.city).toBe("Cape Town");
    expect(s.qualificationLevel).toBe("degree");
    expect(s.yearsExperience).toBe(2);
    expect(s.hasOwnTransport).toBe(true);
  });

  it("uses standard skill names, splits listed skills and drops duplicates", () => {
    expect(normaliseExtraction(raw).skills).toEqual(["Microsoft Excel", "Outlook", "Diary management", "Minute taking"]);
  });

  it("drops values that don't fit the profile", () => {
    const s = normaliseExtraction({
      ...raw,
      phone: "call me",
      city: "Claremont",
      qualificationLevel: "unknown",
      yearsExperience: -3,
      hasOwnTransport: null,
      fullName: null,
    });
    expect(s.phone).toBeUndefined();
    expect(s.city).toBeUndefined();
    expect(s.qualificationLevel).toBeUndefined();
    expect(s.yearsExperience).toBeUndefined();
    expect(s.hasOwnTransport).toBeUndefined();
    expect(s.fullName).toBeUndefined();
  });

  it("caps very long values", () => {
    const s = normaliseExtraction({ ...raw, yearsExperience: 90, skills: Array.from({ length: 40 }, (_, i) => `Skill ${i}`) });
    expect(s.yearsExperience).toBe(50);
    expect(s.skills).toHaveLength(30);
  });
});

describe("matchQualification", () => {
  it.each([
    ["Bachelor's degree", "degree"],
    ["BCom Honours", "honours"],
    ["Master's degree", "masters"],
    ["PhD", "masters"],
    ["National Diploma", "diploma"],
    ["Higher Certificate", "certificate"],
    ["National Senior Certificate", "matric"],
    ["Matric", "matric"],
    ["none", "none"],
  ])("%s → %s", (text, expected) => {
    expect(matchQualification(text)).toBe(expected);
  });
});

describe("mergeSuggestions", () => {
  const suggestions = normaliseExtraction(raw);

  it("fills every empty field", () => {
    const { draft, filled } = mergeSuggestions(empty, suggestions);
    expect(draft.fullName).toBe("Thandi Nkosi");
    expect(draft.city).toBe("Cape Town");
    expect(draft.qualificationLevel).toBe("degree");
    expect(draft.yearsExperience).toBe(2);
    expect(draft.hasOwnTransport).toBe(true);
    expect(draft.skills).toBe("Microsoft Excel, Outlook, Diary management, Minute taking");
    expect(filled).toEqual(
      expect.arrayContaining(["fullName", "phone", "city", "fieldOfStudy", "summary", "qualificationLevel", "yearsExperience", "hasOwnTransport", "skills"]),
    );
  });

  it("never overwrites what the candidate already entered", () => {
    const typed: ProfileDraft = {
      ...empty,
      fullName: "Thandi N.",
      city: "Stellenbosch",
      qualificationLevel: "honours",
      yearsExperience: 1,
      skills: "Microsoft Excel, Canva",
      summary: "My own words.",
    };
    const { draft, filled } = mergeSuggestions(typed, suggestions);
    expect(draft.fullName).toBe("Thandi N.");
    expect(draft.city).toBe("Stellenbosch");
    expect(draft.qualificationLevel).toBe("honours");
    expect(draft.yearsExperience).toBe(1);
    expect(draft.summary).toBe("My own words.");
    // "Excel" already matches "Microsoft Excel", so only the new skills are added.
    expect(draft.skills).toBe("Microsoft Excel, Canva, Outlook, Diary management, Minute taking");
    expect(filled).not.toContain("fullName");
    expect(filled).not.toContain("city");
  });

  it("doesn't untick transport on the CV's say-so", () => {
    const { draft } = mergeSuggestions({ ...empty, hasOwnTransport: true }, { ...suggestions, hasOwnTransport: false });
    expect(draft.hasOwnTransport).toBe(true);
  });
});
