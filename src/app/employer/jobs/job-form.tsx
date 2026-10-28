"use client";

import { useActionState, useState } from "react";
import { saveJob } from "@/app/actions/employer";
import { ActionForm, FormError, SubmitButton } from "@/components/form-bits";
import { CITIES, EMPLOYMENT_LABELS, QUALIFICATIONS, WORKPLACE_LABELS } from "@/lib/constants";
import { CRITERIA, DEFAULT_WEIGHTS, type Weights } from "@/lib/matching";
import type { Job } from "@/db/schema";

const WEIGHT_HELP: Record<keyof Weights, string> = {
  qualification: "Level of study and whether the field matches",
  experience: "Years of relevant work against your minimum",
  skills: "How many of your listed skills they have",
  location: "Same city, commutable, or willing to relocate",
  availability: "Whether they can start by your start date",
};

export function JobForm({ job, defaultCity }: { job?: Job; defaultCity: string }) {
  const [state, action] = useActionState(saveJob, undefined);
  const [weights, setWeights] = useState<Weights>(job?.weights ?? DEFAULT_WEIGHTS);
  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0) || 1;

  return (
    <ActionForm action={action} className="mt-8 space-y-8">
      {job && <input type="hidden" name="jobId" value={job.id} />}

      <Section title="The role">
        <Field label="Job title" id="title">
          <input className="input" id="title" name="title" defaultValue={job?.title} placeholder="e.g. Office Administrator" required />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="City" id="city">
            <select className="input" id="city" name="city" defaultValue={job?.city ?? defaultCity}>
              {CITIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Workplace" id="workplace">
            <select className="input" id="workplace" name="workplace" defaultValue={job?.workplace ?? "on_site"}>
              {Object.entries(WORKPLACE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </Field>
          <Field label="Type" id="employmentType">
            <select className="input" id="employmentType" name="employmentType" defaultValue={job?.employmentType ?? "full_time"}>
              {Object.entries(EMPLOYMENT_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Monthly salary from (R)" id="salaryMin" hint="Listing pay gets more and better-matched applicants.">
            <input className="input num" id="salaryMin" name="salaryMin" type="number" min={0} step={500} defaultValue={job?.salaryMin ?? ""} />
          </Field>
          <Field label="Monthly salary to (R)" id="salaryMax" hint="Leave empty for a fixed amount.">
            <input className="input num" id="salaryMax" name="salaryMax" type="number" min={0} step={500} defaultValue={job?.salaryMax ?? ""} />
          </Field>
          <Field label="Start date" id="startDate">
            <input className="input" id="startDate" name="startDate" type="date" defaultValue={job?.startDate ?? ""} />
          </Field>
          <Field label="Applications close" id="closesOn" hint="Optional.">
            <input className="input" id="closesOn" name="closesOn" type="date" defaultValue={job?.closesOn ?? ""} />
          </Field>
        </div>
        <Field label="About the role" id="description">
          <textarea className="input min-h-36" id="description" name="description" defaultValue={job?.description} required />
        </Field>
        <Field label="Responsibilities" id="responsibilities" hint="One per line.">
          <textarea className="input min-h-32" id="responsibilities" name="responsibilities" defaultValue={job?.responsibilities.join("\n")} />
        </Field>
      </Section>

      <Section title="Who you're looking for" intro="Candidates are scored against these. Be specific: vague requirements make every score look the same.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Minimum qualification" id="minQualification">
            <select className="input" id="minQualification" name="minQualification" defaultValue={job?.minQualification ?? "none"}>
              {QUALIFICATIONS.map((q) => (
                <option key={q.value} value={q.value}>{q.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Field of study" id="fieldKeywords" hint="Comma-separated keywords, e.g. marketing, communication">
            <input className="input" id="fieldKeywords" name="fieldKeywords" defaultValue={job?.fieldKeywords.join(", ")} />
          </Field>
          <Field label="Minimum years of experience" id="minYearsExperience">
            <input className="input num" id="minYearsExperience" name="minYearsExperience" type="number" min={0} max={30} defaultValue={job?.minYearsExperience ?? 0} />
          </Field>
        </div>
        <Field label="Skills" id="skills" hint="Comma-separated. Name software specifically: Excel, Outlook, Canva.">
          <textarea className="input min-h-20" id="skills" name="skills" defaultValue={job?.skills.join(", ")} />
        </Field>
        <Field
          label="Must-haves"
          id="mustHaves"
          hint="One per line, written so a candidate can answer yes or no. Candidates who answer no are flagged, not hidden."
        >
          <textarea className="input min-h-28" id="mustHaves" name="mustHaves" defaultValue={job?.mustHaves.join("\n")} />
        </Field>
      </Section>

      <Section title="How to rank applicants" intro="Decide what matters most for this role. The bar shows how the 100 points are split.">
        <div className="flex h-4 w-full gap-[3px]" aria-hidden>
          {CRITERIA.filter((c) => weights[c.key] > 0).map((c) => (
            <div
              key={c.key}
              className="rounded-[2px] transition-[flex-basis] duration-200"
              style={{ flexBasis: `${(weights[c.key] / totalWeight) * 100}%`, background: `var(--fit-${c.key})` }}
            />
          ))}
        </div>
        <ul className="space-y-4">
          {CRITERIA.map(({ key, label }) => (
            <li key={key} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 sm:grid-cols-[12rem_1fr_3.5rem]">
              <label htmlFor={`w_${key}`} className="flex items-center gap-2 font-semibold">
                <span className="size-2.5 rounded-[2px]" style={{ background: `var(--fit-${key})` }} />
                {label}
              </label>
              <span className="num text-right text-ink-2 sm:order-last">{Math.round((weights[key] / totalWeight) * 100)}%</span>
              <div className="col-span-2 sm:col-span-1">
                <input
                  id={`w_${key}`}
                  name={`w_${key}`}
                  type="range"
                  min={0}
                  max={50}
                  step={5}
                  value={weights[key]}
                  onChange={(e) => setWeights((w) => ({ ...w, [key]: Number(e.target.value) }))}
                  className="w-full"
                  style={{ accentColor: `var(--fit-${key})` }}
                  aria-describedby={`w_${key}_help`}
                />
                <p id={`w_${key}_help`} className="text-xs text-muted">{WEIGHT_HELP[key]}</p>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <div className="space-y-3">
        <FormError error={state?.error} />
        <SubmitButton pending={job ? "Saving…" : "Posting…"}>{job ? "Save changes" : "Post job"}</SubmitButton>
      </div>
    </ActionForm>
  );
}

function Section({ title, intro, children }: { title: string; intro?: string; children: React.ReactNode }) {
  return (
    <fieldset className="section space-y-4">
      <legend className="sr-only">{title}</legend>
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {intro && <p className="mt-0.5 max-w-prose text-sm text-ink-2">{intro}</p>}
      </div>
      {children}
    </fieldset>
  );
}

function Field({ label, id, hint, children }: { label: string; id: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label" htmlFor={id}>{label}</label>
      {children}
      {hint && <p className="hint">{hint}</p>}
    </div>
  );
}
