/**
 * The emails Shortlist sends, as plain text and simple HTML. Pure functions, so they can be tested.
 */
import type { ApplicationStatus } from "@/db/schema";
import { escapeHtml as esc } from "./job-posting";

export interface RenderedEmail {
  subject: string;
  text: string;
  html: string;
}

/** Links every automated email ends with. */
export interface FooterLinks {
  settings: string;
  unsubscribe: string;
  /** Why they're getting it, e.g. "You get these because you turned on job alerts." */
  reason: string;
}

const SAFETY = "Shortlist never charges to apply for a job, and real employers won't ask you to pay for one.";

function button(href: string, label: string) {
  return `<p style="margin:20px 0"><a href="${esc(href)}" style="display:inline-block;background:#171717;color:#ffffff;padding:10px 16px;border-radius:6px;text-decoration:none;font-weight:bold">${esc(label)}</a></p>`;
}

function layout(bodyHtml: string, footer?: FooterLinks, safety = false) {
  const foot = footer
    ? `<hr style="border:none;border-top:1px solid #e5e5e5;margin:28px 0 12px">
<p style="color:#6b6b6b;font-size:12px;margin:0">${esc(footer.reason)} <a href="${esc(footer.settings)}" style="color:#6b6b6b">Email settings</a> · <a href="${esc(footer.unsubscribe)}" style="color:#6b6b6b">Unsubscribe</a></p>`
    : "";
  const warn = safety ? `<p style="color:#6b6b6b;font-size:13px">${esc(SAFETY)}</p>` : "";
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#171717;max-width:560px">
<p style="font-weight:bold;font-size:17px;margin:0 0 18px">Shortlist</p>
${bodyHtml}${warn}${foot}
</div>`;
}

function textFooter(footer: FooterLinks) {
  return ["", "--", footer.reason, `Email settings: ${footer.settings}`, `Unsubscribe: ${footer.unsubscribe}`];
}

// ── Application status changes (to candidates) ─────────────────────────────

export interface StatusUpdate {
  jobTitle: string;
  company: string;
  status: Exclude<ApplicationStatus, "new">;
  url: string;
}

export function statusSentence({ jobTitle, company, status }: StatusUpdate): string {
  switch (status) {
    case "shortlisted":
      return `${company} has shortlisted you for ${jobTitle}.`;
    case "interview":
      return `${company} would like to interview you for ${jobTitle}. They'll contact you directly to arrange it.`;
    case "hired":
      return `Congratulations! ${company} has picked you for ${jobTitle}. They'll be in touch about next steps.`;
    case "declined":
      return `${company} has decided not to take your application for ${jobTitle} further. Thank you for applying.`;
  }
}

export function statusUpdateEmail(input: {
  firstName: string;
  updates: StatusUpdate[];
  dashboardUrl: string;
  footer: FooterLinks;
}): RenderedEmail {
  const { firstName, updates, dashboardUrl, footer } = input;
  const subject =
    updates.length === 1
      ? updates[0].status === "declined"
        ? `Your application for ${updates[0].jobTitle}`
        : `Good news about your application for ${updates[0].jobTitle}`
      : `${updates.length} updates on your applications`;
  const sentences = updates.map(statusSentence);
  const html = layout(
    `<p>Hi ${esc(firstName)},</p>
<ul style="padding-left:20px">${updates.map((u, i) => `<li style="margin-bottom:8px"><a href="${esc(u.url)}" style="color:#171717">${esc(sentences[i])}</a></li>`).join("")}</ul>
${button(dashboardUrl, "See my applications")}`,
    footer,
    true,
  );
  const text = [
    `Hi ${firstName},`,
    "",
    ...updates.map((u, i) => `- ${sentences[i]}\n  ${u.url}`),
    "",
    `See your applications: ${dashboardUrl}`,
    "",
    SAFETY,
    ...textFooter(footer),
  ].join("\n");
  return { subject, text, html };
}

// ── New applicants (to employers, once a day) ──────────────────────────────

export interface ApplicantSummary {
  jobTitle: string;
  count: number;
  bestScore: number | null;
  url: string;
}

export function applicantDigestEmail(input: {
  company: string;
  jobs: ApplicantSummary[];
  dashboardUrl: string;
  footer: FooterLinks;
}): RenderedEmail {
  const { company, jobs, dashboardUrl, footer } = input;
  const total = jobs.reduce((s, j) => s + j.count, 0);
  const plural = (n: number) => `${n} new applicant${n === 1 ? "" : "s"}`;
  const subject = jobs.length === 1 ? `${plural(total)} for ${jobs[0].jobTitle}` : `${plural(total)} on Shortlist`;
  const line = (j: ApplicantSummary) =>
    `${j.jobTitle}: ${plural(j.count)}${j.bestScore !== null ? `, best match ${j.bestScore}%` : ""}`;
  const html = layout(
    `<p>Since yesterday's email, ${esc(company)} has ${esc(plural(total))}.</p>
<ul style="padding-left:20px">${jobs.map((j) => `<li style="margin-bottom:6px"><a href="${esc(j.url)}" style="color:#171717">${esc(line(j))}</a></li>`).join("")}</ul>
${button(dashboardUrl, "Review applicants")}`,
    footer,
  );
  const text = [
    `Since yesterday's email, ${company} has ${plural(total)}.`,
    "",
    ...jobs.map((j) => `- ${line(j)}\n  ${j.url}`),
    "",
    `Review applicants: ${dashboardUrl}`,
    ...textFooter(footer),
  ].join("\n");
  return { subject, text, html };
}

// ── Job alerts (to candidates, daily or weekly) ────────────────────────────

export interface AlertJob {
  title: string;
  company: string;
  place: string;
  salary: string | null;
  score: number;
  url: string;
}

export const ALERT_EMAIL_MAX_JOBS = 10;

export function jobAlertEmail(input: {
  firstName: string;
  jobs: AlertJob[];
  frequency: "daily" | "weekly";
  minScore: number;
  allJobsUrl: string;
  footer: FooterLinks;
}): RenderedEmail {
  const { firstName, jobs, frequency, minScore, allJobsUrl, footer } = input;
  const shown = jobs.slice(0, ALERT_EMAIL_MAX_JOBS);
  const more = jobs.length - shown.length;
  const subject =
    jobs.length === 1
      ? `New job: ${jobs[0].title} at ${jobs[0].company} (${jobs[0].score}% match)`
      : `${jobs.length} new jobs matching your profile`;
  const intro = `${jobs.length === 1 ? "A new job" : `${jobs.length} new jobs`} posted ${frequency === "daily" ? "since yesterday" : "this week"} ${jobs.length === 1 ? "scores" : "score"} at least ${minScore}% against your profile.`;
  const detail = (j: AlertJob) => [j.company, j.place, j.salary].filter(Boolean).join(" · ");
  const html = layout(
    `<p>Hi ${esc(firstName)},</p>
<p>${esc(intro)}</p>
<table role="presentation" style="border-collapse:collapse;width:100%">${shown
      .map(
        (j) => `<tr><td style="padding:10px 0;border-top:1px solid #e5e5e5"><a href="${esc(j.url)}" style="color:#171717;font-weight:bold">${esc(j.title)}</a><br><span style="color:#6b6b6b;font-size:13px">${esc(detail(j))}</span></td><td style="padding:10px 0 10px 12px;border-top:1px solid #e5e5e5;text-align:right;font-weight:bold;white-space:nowrap">${j.score}%</td></tr>`,
      )
      .join("")}</table>
${more > 0 ? `<p><a href="${esc(allJobsUrl)}" style="color:#171717">And ${more} more</a></p>` : ""}
${button(allJobsUrl, "See all jobs")}`,
    footer,
    true,
  );
  const text = [
    `Hi ${firstName},`,
    "",
    intro,
    "",
    ...shown.map((j) => `- ${j.title} (${j.score}% match)\n  ${detail(j)}\n  ${j.url}`),
    ...(more > 0 ? ["", `And ${more} more: ${allJobsUrl}`] : []),
    "",
    SAFETY,
    ...textFooter(footer),
  ].join("\n");
  return { subject, text, html };
}

// ── Invitations to apply (to talent-pool candidates) ───────────────────────

export function invitationEmail(input: {
  firstName: string;
  company: string;
  jobTitle: string;
  message: string;
  score: number;
  jobUrl: string;
  footer: FooterLinks;
}): RenderedEmail {
  const { firstName, company, jobTitle, message, score, jobUrl, footer } = input;
  const subject = `${company} invited you to apply for ${jobTitle}`;
  const intro = `${company} saw your anonymous profile in Shortlist's talent pool and would like you to apply for ${jobTitle}. You score ${score}% for it.`;
  const privacy = "They can't see your name, contact details or CV unless you apply.";
  const html = layout(
    `<p>Hi ${esc(firstName)},</p>
<p>${esc(intro)}</p>
${message ? `<blockquote style="margin:16px 0;padding:10px 14px;background:#f5f5f4;border-radius:6px;white-space:pre-line">${esc(message)}</blockquote>` : ""}
<p>${esc(privacy)}</p>
${button(jobUrl, "View the job")}`,
    footer,
    true,
  );
  const text = [
    `Hi ${firstName},`,
    "",
    intro,
    ...(message ? ["", `Their message: "${message}"`] : []),
    "",
    privacy,
    "",
    `View the job: ${jobUrl}`,
    "",
    SAFETY,
    ...textFooter(footer),
  ].join("\n");
  return { subject, text, html };
}

// ── Reports (to site admins) ───────────────────────────────────────────────

export function reportEmail(input: {
  jobTitle: string;
  company: string;
  reason: string;
  details: string;
  openReports: number;
  hidden: boolean;
  reviewUrl: string;
  jobUrl: string;
}): RenderedEmail {
  const { jobTitle, company, reason, details, openReports, hidden, reviewUrl, jobUrl } = input;
  const subject = `${hidden ? "Hidden" : "Reported"}: ${jobTitle} at ${company}`;
  const status = hidden
    ? `It now has ${openReports} open reports, so it's been hidden until you review it.`
    : `It has ${openReports} open report${openReports === 1 ? "" : "s"}. It's still live.`;
  const html = layout(
    `<p>Someone reported <a href="${esc(jobUrl)}" style="color:#171717">${esc(jobTitle)}</a> at ${esc(company)}.</p>
<p><strong>Reason:</strong> ${esc(reason)}</p>
${details ? `<p style="white-space:pre-line"><strong>Details:</strong> ${esc(details)}</p>` : ""}
<p>${esc(status)}</p>
${button(reviewUrl, "Review reports")}`,
  );
  const text = [
    `Someone reported ${jobTitle} at ${company}.`,
    `Reason: ${reason}`,
    ...(details ? [`Details: ${details}`] : []),
    "",
    status,
    `Review reports: ${reviewUrl}`,
    `Job: ${jobUrl}`,
  ].join("\n");
  return { subject, text, html };
}
