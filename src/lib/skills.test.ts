import { describe, expect, it } from "vitest";
import { canonicalSkill, hasSkill, normaliseSkills, sameSkill, searchSkills, skillKey, SKILL_CATALOGUE, SKILL_NAMES } from "./skills";
import { DEFAULT_WEIGHTS, scoreMatch } from "./matching";

describe("standard skill names", () => {
  it.each([
    ["excel", "Microsoft Excel"],
    ["MS Excel", "Microsoft Excel"],
    ["Spreadsheets", "Microsoft Excel"],
    ["Proficient in Excel", "Microsoft Excel"],
    ["Excel skills", "Microsoft Excel"],
    ["calendar management", "Diary management"],
    ["Office 365", "Microsoft Office"],
    ["ChatGPT", "AI tools"],
    ["Claude", "AI tools"],
    ["code 8", "Driver's licence"],
    ["drivers licence", "Driver's licence"],
    ["G Suite", "Google Workspace"],
  ])("%s → %s", (typed, name) => {
    expect(canonicalSkill(typed)).toBe(name);
  });

  it("keeps skills it doesn't know, tidied", () => {
    expect(canonicalSkill("  forklift   operation ")).toBe("Forklift operation");
  });

  it("de-duplicates different wordings of one skill", () => {
    expect(normaliseSkills(["Excel", "MS Excel", "spreadsheets", "Outlook", "", "outlook"])).toEqual(["Microsoft Excel", "Outlook"]);
  });

  it("never uses one wording for two different skills", () => {
    const owner = new Map<string, string>();
    const clashes: string[] = [];
    for (const def of SKILL_CATALOGUE) {
      for (const k of [def.name, ...(def.aliases ?? [])].map(skillKey)) {
        if (owner.has(k) && owner.get(k) !== def.name) clashes.push(`${k}: ${owner.get(k)} / ${def.name}`);
        owner.set(k, def.name);
      }
    }
    expect(clashes).toEqual([]);
  });

  it("only points tools and suites at skills that exist", () => {
    const names = new Set(SKILL_NAMES);
    const missing = SKILL_CATALOGUE.flatMap((d) => [...(d.covers ?? []), ...(d.counts ?? [])]).filter((n) => !names.has(n));
    expect(missing).toEqual([]);
  });

  it("has no commas in any standard name, since skills are stored comma-separated", () => {
    expect(SKILL_NAMES.filter((n) => n.includes(","))).toEqual([]);
  });
});

describe("matching skills", () => {
  it("matches different wordings", () => {
    expect(sameSkill("Diary management", "calendar management")).toBe(true);
    expect(sameSkill("Microsoft Excel", "spreadsheets")).toBe(true);
  });

  it("doesn't confuse different standard skills that share a word", () => {
    expect(sameSkill("Microsoft Word", "WordPress")).toBe(false);
    expect(sameSkill("Social media scheduling", "Social media management")).toBe(false);
  });

  it("still matches unlisted skills loosely", () => {
    expect(sameSkill("Forklift", "Forklift operation")).toBe(true);
    expect(sameSkill("Microsoft Excel", "Advanced Microsoft Excel modelling")).toBe(true);
  });

  it("counts a suite for each program in it", () => {
    expect(hasSkill(["MS Office"], "Excel")).toBe(true);
    expect(hasSkill(["Microsoft 365"], "Microsoft Teams")).toBe(true);
    expect(hasSkill(["MS Office"], "Canva")).toBe(false);
  });

  it("counts a specific CRM as CRM experience, but not the other way round", () => {
    expect(hasSkill(["HubSpot"], "CRM")).toBe(true);
    expect(hasSkill(["CRM systems"], "HubSpot")).toBe(false);
    expect(canonicalSkill("prospecting")).toBe("Lead generation");
  });

  it("counts specific tools towards the general skill", () => {
    expect(hasSkill(["n8n"], "Workflow automation")).toBe(true);
    expect(hasSkill(["Klaviyo"], "Email marketing")).toBe(true);
    expect(hasSkill(["Shopify Plus"], "Shopify")).toBe(true);
    expect(hasSkill(["Claude Code"], "AI coding tools")).toBe(true);
    expect(hasSkill(["Google Ads"], "Paid media")).toBe(true);
    expect(canonicalSkill("color grading")).toBe("Colour grading");
  });

  it("meets a request for a suite with two of its programs", () => {
    expect(hasSkill(["Excel", "Outlook"], "Microsoft Office")).toBe(true);
    expect(hasSkill(["Excel"], "Microsoft Office")).toBe(false);
  });

  it("scores the Old School EA ad's skills against differently worded profiles", () => {
    const job = {
      city: "Cape Town",
      workplace: "hybrid" as const,
      startDate: null,
      minQualification: "matric" as const,
      fieldKeywords: [],
      minYearsExperience: 2,
      skills: ["Diary management", "Inbox management", "Microsoft Excel", "Outlook", "Microsoft Teams"],
      mustHaves: [],
      weights: DEFAULT_WEIGHTS,
    };
    const candidate = {
      city: "Cape Town",
      willingToRelocate: false,
      qualificationLevel: "matric" as const,
      fieldOfStudy: "",
      yearsExperience: 3,
      skills: ["MS Office", "calendar management", "email management"],
      availableFrom: null,
    };
    const skills = scoreMatch(job, candidate).criteria.find((c) => c.key === "skills")!;
    expect(skills.detail).toBe("Has all 5 listed skills");
  });
});

describe("skill suggestions", () => {
  it("suggests names as you type, best first", () => {
    expect(searchSkills("exc")[0]).toBe("Microsoft Excel");
    expect(searchSkills("diar")).toContain("Diary management");
  });

  it("finds a skill by another wording", () => {
    expect(searchSkills("calendar")).toContain("Diary management");
    expect(searchSkills("chatg")).toEqual(["AI tools"]);
  });

  it("leaves out skills already picked", () => {
    expect(searchSkills("exc", ["excel"])).not.toContain("Microsoft Excel");
  });
});
