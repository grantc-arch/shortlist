import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getCandidate, getUser } from "@/lib/queries";
import { emailConfigured } from "@/lib/email";
import { profileGaps } from "@/lib/format";
import { ALERT_SCORES } from "@/lib/constants";
import { saveSettings } from "@/app/actions/settings";
import { UsernameForm } from "./username-form";

export const metadata: Metadata = { title: "Settings", robots: { index: false } };

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const session = await requireUser("/settings");
  const { saved } = await searchParams;
  const user = (await getUser(session.userId))!;
  const candidate = session.role === "candidate" ? await getCandidate(session.userId) : null;
  const gaps = candidate ? profileGaps(candidate) : [];

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold sm:text-4xl">Settings</h1>
      <p className="mt-1 text-ink-2">Emails go to {session.email}.</p>
      {saved && (
        <p role="status" className="mt-4 rounded-md border border-good/30 bg-good/10 px-4 py-3 text-good">
          Settings saved.
        </p>
      )}
      {!emailConfigured() && process.env.NODE_ENV === "production" && (
        <p className="mt-4 rounded-md border border-warn/30 bg-warn/10 px-4 py-3 text-sm text-ink">
          Email isn't set up on this site yet, so these emails won't be sent until it is.
        </p>
      )}

      <section className="section mt-8">
        <h2 className="text-lg font-semibold">Messages</h2>
        <p className="mt-0.5 text-sm text-ink-2">Other people on Shortlist can message you using your username.</p>
        <UsernameForm current={user.username ?? ""} />
      </section>

      <form action={saveSettings} className="mt-8 space-y-8">
        {candidate ? (
          <>
            <fieldset id="alerts" className="section scroll-mt-6">
              <legend className="sr-only">Job alerts</legend>
              <h2 className="text-lg font-semibold">Job alerts</h2>
              <p className="mt-0.5 text-sm text-ink-2">
                New jobs that score well against your profile, by email. Nothing is sent when there's nothing new.
              </p>
              <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
                {(
                  [
                    ["off", "Off"],
                    ["daily", "Daily"],
                    ["weekly", "Weekly"],
                  ] as const
                ).map(([value, label]) => (
                  <label key={value} className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="alertFrequency"
                      value={value}
                      defaultChecked={candidate.alertFrequency === value}
                      className="size-4 accent-[var(--accent)]"
                    />
                    {label}
                  </label>
                ))}
              </div>
              <div className="mt-4">
                <label className="label" htmlFor="alertMinScore">
                  Only jobs where I score at least
                </label>
                <select id="alertMinScore" name="alertMinScore" defaultValue={candidate.alertMinScore} className="input w-auto">
                  {ALERT_SCORES.map((s) => (
                    <option key={s} value={s}>
                      {s}%
                    </option>
                  ))}
                </select>
              </div>
            </fieldset>

            <fieldset className="section">
              <legend className="sr-only">Application updates</legend>
              <h2 className="text-lg font-semibold">Application updates</h2>
              <Check name="emailUpdates" defaultChecked={user.emailUpdates}>
                Email me a receipt when I apply, and when an employer shortlists me, invites me to an interview or
                makes a decision. Status updates are gathered into one email a day.
              </Check>
            </fieldset>

            <fieldset id="talent-pool" className="section scroll-mt-6">
              <legend className="sr-only">Talent pool</legend>
              <h2 className="text-lg font-semibold">Talent pool</h2>
              <Check name="openToOffers" defaultChecked={candidate.openToOffers}>
                I'm open to opportunities. Let employers on Shortlist find my profile and invite me to apply.
              </Check>
              <div className="mt-3 ml-6.5 text-sm text-ink-2">
                <p>
                  Employers see your qualification, field of study, years of experience, skills, the city you're in,
                  when you can start and whether you have transport. They never see your name, contact details,
                  summary or CV unless you apply. Untick this at any time to leave the pool.
                </p>
                {gaps.length > 0 && (
                  <p className="mt-2 text-warn">
                    You'll only appear once your profile is complete: add your {gaps.join(", ")}.{" "}
                    <Link href="/candidate/profile" className="link">
                      Complete my profile
                    </Link>
                  </p>
                )}
              </div>
            </fieldset>
          </>
        ) : (
          <fieldset className="section">
            <legend className="sr-only">New applicants</legend>
            <h2 className="text-lg font-semibold">New applicants</h2>
            <Check name="emailUpdates" defaultChecked={user.emailUpdates}>
              Send me one email a day listing new applicants for my jobs.
            </Check>
          </fieldset>
        )}

        <button className="btn btn-primary">Save settings</button>
      </form>
    </div>
  );
}

function Check({ name, defaultChecked, children }: { name: string; defaultChecked: boolean; children: React.ReactNode }) {
  return (
    <label className="mt-3 flex items-start gap-2.5 text-sm text-ink-2">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-1 size-4 shrink-0 accent-[var(--accent)]" />
      <span>{children}</span>
    </label>
  );
}
