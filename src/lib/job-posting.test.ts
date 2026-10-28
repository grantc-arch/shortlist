import { describe, expect, it } from "vitest";
import type { Job } from "@/db/schema";
import { DEFAULT_WEIGHTS } from "./matching";
import { buildJobPosting, descriptionHtml, isListableOnGoogle, jsonLdScript } from "./job-posting";
import { closedReason, isAcceptingApplications, todayInSA } from "./jobs";

const job: Job = {
  id: "11111111-1111-4111-8111-111111111111",
  employerId: "22222222-2222-4222-8222-222222222222",
  title: "Administrator",
  city: "Cape Town",
  lat: null,
  lng: null,
  workplace: "on_site",
  employmentType: "full_time",
  salaryMin: 20000,
  salaryMax: null,
  startDate: "2026-11-01",
  closesOn: "2026-11-15",
  description: "First paragraph.\n\nSecond <b>paragraph</b> & more.",
  responsibilities: ["Run diaries"],
  minQualification: "degree",
  fieldKeywords: ["marketing"],
  minYearsExperience: 1,
  skills: ["Excel", "Outlook"],
  mustHaves: ["Reliable transport"],
  weights: DEFAULT_WEIGHTS,
  status: "open",
  createdAt: new Date("2026-10-20T08:00:00Z"),
  updatedAt: new Date("2026-10-20T08:00:00Z"),
};
const employer = { companyName: "Acme Admin", website: "https://acme.example", isDemo: false };

describe("closing dates", () => {
  it("uses South African time for today", () => {
    // 23:30 UTC on 31 Oct is already 1 Nov in Johannesburg.
    expect(todayInSA(new Date("2026-10-31T23:30:00Z"))).toBe("2026-11-01");
  });

  it("keeps a job open through its closing date", () => {
    expect(isAcceptingApplications(job, "2026-11-15")).toBe(true);
    expect(isAcceptingApplications(job, "2026-11-16")).toBe(false);
    expect(closedReason(job, "2026-11-16")).toBe("deadline");
  });

  it("treats a manually closed job as closed", () => {
    expect(isAcceptingApplications({ ...job, status: "closed" }, "2026-11-01")).toBe(false);
    expect(closedReason({ ...job, status: "closed" }, "2026-11-01")).toBe("closed");
  });

  it("never closes a job without a closing date", () => {
    expect(isAcceptingApplications({ ...job, closesOn: null }, "2030-01-01")).toBe(true);
  });
});

describe("Google listing", () => {
  it("only lists real, open jobs when switched on", () => {
    expect(isListableOnGoogle(job, employer, true, "2026-11-01")).toBe(true);
    expect(isListableOnGoogle(job, employer, false, "2026-11-01")).toBe(false);
    expect(isListableOnGoogle(job, { ...employer, isDemo: true }, true, "2026-11-01")).toBe(false);
    expect(isListableOnGoogle(job, employer, true, "2026-12-01")).toBe(false);
  });

  it("includes every field Google requires", () => {
    const p = buildJobPosting(job, employer, "https://shortlist.example");
    expect(p["@type"]).toBe("JobPosting");
    expect(p.title).toBe("Administrator");
    expect(p.description).toContain("<p>First paragraph.</p>");
    expect(p.datePosted).toBe("2026-10-20T08:00:00.000Z");
    expect(p.hiringOrganization).toEqual({ "@type": "Organization", name: "Acme Admin", sameAs: "https://acme.example" });
    expect(p.jobLocation?.address).toEqual({
      "@type": "PostalAddress",
      addressLocality: "Cape Town",
      addressRegion: "Western Cape",
      addressCountry: "ZA",
    });
    expect(p.validThrough).toBe("2026-11-15T23:59:59+02:00");
    expect(p.employmentType).toBe("FULL_TIME");
    expect(p.url).toBe(`https://shortlist.example/jobs/${job.id}`);
  });

  it("describes a fixed monthly salary in rand", () => {
    const p = buildJobPosting(job, employer, "https://x");
    expect(p.baseSalary).toEqual({
      "@type": "MonetaryAmount",
      currency: "ZAR",
      value: { "@type": "QuantitativeValue", value: 20000, unitText: "MONTH" },
    });
    const range = buildJobPosting({ ...job, salaryMin: 14000, salaryMax: 16000 }, employer, "https://x");
    expect(range.baseSalary?.value).toMatchObject({ minValue: 14000, maxValue: 16000 });
    expect(buildJobPosting({ ...job, salaryMin: null }, employer, "https://x").baseSalary).toBeUndefined();
  });

  it("marks fully remote jobs as remote within South Africa, and says so in the description", () => {
    const p = buildJobPosting({ ...job, workplace: "remote" }, employer, "https://x");
    expect(p.jobLocationType).toBe("TELECOMMUTE");
    expect(p.applicantLocationRequirements).toEqual({ "@type": "Country", name: "South Africa" });
    expect(p.jobLocation).toBeUndefined();
    expect(p.description).toContain("100% remote");
  });

  it("doesn't mark hybrid jobs as remote", () => {
    const p = buildJobPosting({ ...job, workplace: "hybrid" }, employer, "https://x");
    expect(p.jobLocationType).toBeUndefined();
    expect(p.jobLocation).toBeDefined();
  });

  it("escapes HTML in employer text", () => {
    expect(descriptionHtml(job)).toContain("Second &lt;b&gt;paragraph&lt;/b&gt; &amp; more.");
  });

  it("can't be broken out of the script tag", () => {
    const evil = { ...job, title: "</script><script>alert(1)</script>" };
    const out = jsonLdScript(buildJobPosting(evil, employer, "https://x"));
    expect(out).not.toContain("</script>");
    expect(JSON.parse(out).title).toBe(evil.title);
  });
});
