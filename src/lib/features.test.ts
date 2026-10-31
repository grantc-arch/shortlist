import { describe, expect, it } from "vitest";
import { similarJobs, similarity, titleWords, type SimilarityJob } from "./similar";
import { csvCell, slug, toCsv } from "./csv";
import { unsubscribeQuery, verifyUnsubscribe } from "./unsubscribe";
import { applicantDigestEmail, applicationReceivedEmail, invitationEmail, jobAlertEmail, statusUpdateEmail, ALERT_EMAIL_MAX_JOBS } from "./emails";
import { isUndeliverable } from "./email-address";

const base: SimilarityJob = {
  id: "admin",
  title: "Office Administrator",
  skills: ["Microsoft Excel", "Outlook", "Diary management", "Canva"],
  fieldKeywords: ["marketing"],
  city: "Cape Town",
  lat: -33.92,
  lng: 18.42,
  workplace: "on_site",
};

describe("similar jobs", () => {
  it("ignores seniority words in titles", () => {
    expect(titleWords("Senior Marketing & Admin Lead")).toEqual(["marketing", "admin"]);
  });

  it("scores shared skills, title words and field", () => {
    const pa: SimilarityJob = { ...base, id: "pa", title: "Admin Assistant", skills: ["Excel", "Diary management"], fieldKeywords: [] };
    const chef: SimilarityJob = { ...base, id: "chef", title: "Sous Chef", skills: ["Knife skills"], fieldKeywords: ["culinary"] };
    expect(similarity(base, pa)).toBeGreaterThan(0.5);
    expect(similarity(base, chef)).toBe(0);
  });

  it("doesn't count being nearby on its own", () => {
    const other: SimilarityJob = { ...base, id: "x", title: "Welder", skills: ["Welding"], fieldKeywords: [] };
    expect(similarity(base, other)).toBe(0);
  });

  it("returns the closest few, never the job itself", () => {
    const jobs = [
      { job: base },
      { job: { ...base, id: "a", title: "Administrator", skills: ["Excel"] } },
      { job: { ...base, id: "b", title: "Receptionist", skills: ["Outlook", "Excel", "Diary management"] } },
      { job: { ...base, id: "c", title: "Plumber", skills: ["Pipes"], fieldKeywords: [] } },
    ];
    const ids = similarJobs(base, jobs).map((j) => j.job.id);
    expect(ids).not.toContain("admin");
    expect(ids).not.toContain("c");
    expect(ids).toHaveLength(2);
  });
});

describe("CSV export", () => {
  it("quotes commas, quotes and line breaks", () => {
    expect(csvCell('Said "hi", then left\nearly')).toBe('"Said ""hi"", then left\nearly"');
    expect(csvCell("plain")).toBe("plain");
    expect(csvCell(null)).toBe("");
    expect(csvCell(true)).toBe("Yes");
    expect(csvCell(86)).toBe("86");
  });

  it("stops applicant text running as a spreadsheet formula", () => {
    expect(csvCell("=HYPERLINK(\"http://evil\")")).toBe("\"'=HYPERLINK(\"\"http://evil\"\")\"");
    expect(csvCell("+27 82 555 0101")).toBe("'+27 82 555 0101");
    expect(csvCell("@sum")).toBe("'@sum");
    expect(csvCell(-5)).toBe("-5");
  });

  it("starts with a byte-order mark for Excel and ends rows with CRLF", () => {
    expect(toCsv([["a", "b"], [1, 2]])).toBe("﻿a,b\r\n1,2\r\n");
  });

  it("makes safe file names", () => {
    expect(slug("Office Administrator (Cape Town)")).toBe("office-administrator-cape-town");
    expect(slug("!!!")).toBe("job");
  });
});

describe("unsubscribe links", () => {
  const secret = "test-secret";
  it("accepts its own signature", () => {
    const q = Object.fromEntries(new URLSearchParams(unsubscribeQuery("user-1", "alerts", secret)));
    expect(verifyUnsubscribe(q, secret)).toEqual({ userId: "user-1", kind: "alerts" });
  });

  it("rejects a link changed to another account or email kind", () => {
    const q = Object.fromEntries(new URLSearchParams(unsubscribeQuery("user-1", "alerts", secret)));
    expect(verifyUnsubscribe({ ...q, u: "user-2" }, secret)).toBeNull();
    expect(verifyUnsubscribe({ ...q, k: "updates" }, secret)).toBeNull();
    expect(verifyUnsubscribe({ ...q, k: "everything" }, secret)).toBeNull();
    expect(verifyUnsubscribe({ ...q, t: "x" }, secret)).toBeNull();
    expect(verifyUnsubscribe(q, "another-secret")).toBeNull();
  });
});

describe("emails", () => {
  const footer = { settings: "https://s/settings", unsubscribe: "https://s/unsubscribe?x", reason: "Because." };

  it("words each status change for the candidate", () => {
    const one = statusUpdateEmail({
      firstName: "Thandi",
      dashboardUrl: "https://s/candidate",
      footer,
      updates: [{ jobTitle: "Administrator", company: "Lion's Head", status: "interview", url: "https://s/jobs/1" }],
    });
    expect(one.subject).toBe("Good news about your application for Administrator");
    expect(one.text).toContain("Lion's Head would like to interview you for Administrator");
    expect(one.html).toContain("Lion's Head would like to interview you");
    const declined = statusUpdateEmail({
      firstName: "Thandi",
      dashboardUrl: "x",
      footer,
      updates: [{ jobTitle: "Administrator", company: "A", status: "declined", url: "x" }],
    });
    expect(declined.subject).toBe("Your application for Administrator");
    const two = statusUpdateEmail({
      firstName: "T",
      dashboardUrl: "x",
      footer,
      updates: [
        { jobTitle: "A", company: "B", status: "shortlisted", url: "x" },
        { jobTitle: "C", company: "D", status: "hired", url: "x" },
      ],
    });
    expect(two.subject).toBe("2 updates on your applications");
  });

  it("escapes employer-written text in HTML", () => {
    const mail = invitationEmail({
      firstName: "Lerato",
      company: "<b>Evil</b> Co",
      jobTitle: "Intern",
      message: '<script>alert("x")</script>',
      score: 81,
      jobUrl: "https://s/jobs/1",
      footer,
    });
    expect(mail.html).not.toContain("<script>");
    expect(mail.html).toContain("&lt;b&gt;Evil&lt;/b&gt; Co");
    expect(mail.text).toContain("You score 81% for it");
    expect(mail.html).toContain("https://s/unsubscribe?x");
  });

  it("confirms an application and says what happens next", () => {
    const mail = applicationReceivedEmail({
      firstName: "Pat",
      jobTitle: "Office Assistant",
      company: "Test Hiring Co",
      jobUrl: "https://s/jobs/1",
      dashboardUrl: "https://s/candidate",
      footer,
    });
    expect(mail.subject).toBe("Application sent: Office Assistant at Test Hiring Co");
    expect(mail.text).toContain("What happens next");
    expect(mail.text).toContain("https://s/candidate");
    expect(mail.html).toContain("https://s/unsubscribe?x");
  });

  it("summarises new applicants per job", () => {
    const mail = applicantDigestEmail({
      company: "Lion's Head",
      dashboardUrl: "x",
      footer,
      jobs: [
        { jobTitle: "Administrator", count: 3, bestScore: 86, url: "x" },
        { jobTitle: "Intern", count: 1, bestScore: 70, url: "y" },
      ],
    });
    expect(mail.subject).toBe("4 new applicants on Shortlist");
    expect(mail.text).toContain("Administrator: 3 new applicants, best match 86%");
    expect(mail.text).toContain("Intern: 1 new applicant, best match 70%");
  });

  it("caps the jobs listed in an alert", () => {
    const jobs = Array.from({ length: 14 }, (_, i) => ({ title: `Job ${i}`, company: "C", place: "Cape Town", salary: null, score: 90 - i, url: `u${i}` }));
    const mail = jobAlertEmail({ firstName: "L", jobs, frequency: "weekly", minScore: 60, allJobsUrl: "all", footer });
    expect(mail.subject).toBe("14 new jobs matching your profile");
    expect(mail.text).toContain(`And ${14 - ALERT_EMAIL_MAX_JOBS} more`);
    expect(mail.text).not.toContain("Job 12");
    expect(mail.text).toContain("this week");
  });
});

describe("demo addresses", () => {
  it("skips the reserved example domains only", () => {
    expect(isUndeliverable("employer@example.com")).toBe(true);
    expect(isUndeliverable("people@jozi.example.com")).toBe(true);
    expect(isUndeliverable("someone@example.org")).toBe(true);
    expect(isUndeliverable("grant@gmail.com")).toBe(false);
    expect(isUndeliverable("me@notexample.com")).toBe(false);
  });
});
