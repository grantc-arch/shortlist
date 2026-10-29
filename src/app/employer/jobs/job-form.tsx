"use client";

import { useActionState, useRef, useState } from "react";
import { saveJob } from "@/app/actions/employer";
import { ActionForm, FormError, SubmitButton } from "@/components/form-bits";
import { BENEFITS, EMPLOYMENT_LABELS, QUALIFICATIONS, WORKPLACE_LABELS } from "@/lib/constants";
import { PlaceField } from "@/components/place-input";
import { SkillField } from "@/components/skill-picker";
import type { Place } from "@/lib/places";
import { CRITERIA, DEFAULT_WEIGHTS, rebalance, toPercentages, type CriterionKey, type Weights } from "@/lib/matching";
import type { Job } from "@/db/schema";

const WEIGHT_HELP: Record<keyof Weights, string> = {
  qualification: "Level of study and whether the field matches",
  experience: "Years of relevant work against your minimum",
  skills: "How many of your listed skills they have",
  location: "Distance from the job (within 25 km is full marks), or willing to relocate",
  availability: "Whether they can start by your start date",
};

export function JobForm({ job, defaultPlace }: { job?: Job; defaultPlace: Place }) {
  const [state, action] = useActionState(saveJob, undefined);
  // Shown as whole percentages; jobs saved with the old 0-50 sliders are converted.
  const [weights, setWeights] = useState<Weights>(() => toPercentages(job?.weights ?? DEFAULT_WEIGHTS));

  return (
    <ActionForm action={action} className="mt-8 space-y-8">
      {job && <input type="hidden" name="jobId" value={job.id} />}

      <Section title="The role">
        <Field label="Job title" id="title">
          <input className="input" id="title" name="title" defaultValue={job?.title} placeholder="e.g. Office Administrator" required />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Location" id="city">
            <PlaceField
              id="city"
              name="city"
              required
              defaultValue={job ? { label: job.city, lat: job.lat, lng: job.lng } : defaultPlace}
            />
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
        <fieldset>
          <legend className="label">Benefits</legend>
          <p className="hint mt-0 mb-2">Tick what the job offers. Benefits are shown on the listing and help it stand out.</p>
          <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
            {BENEFITS.map((b) => (
              <label key={b.value} className="flex items-center gap-2 text-sm text-ink-2">
                <input
                  type="checkbox"
                  name="benefits"
                  value={b.value}
                  defaultChecked={job?.benefits.includes(b.value)}
                  className="size-4 accent-[var(--accent)]"
                />
                {b.label}
              </label>
            ))}
          </div>
        </fieldset>
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
        <Field
          label="Skills"
          id="skills"
          hint="Pick from the suggestions where you can, so different wordings still match (a candidate's “MS Office” counts for Excel). Press Enter to add your own."
        >
          <SkillField id="skills" name="skills" defaultValue={job?.skills} max={25} describedBy="skills-hint" />
        </Field>
        <Field
          label="Must-haves"
          id="mustHaves"
          hint="One per line, written so a candidate can answer yes or no. Candidates who answer no are flagged, not hidden."
        >
          <textarea className="input min-h-28" id="mustHaves" name="mustHaves" defaultValue={job?.mustHaves.join("\n")} />
        </Field>
      </Section>

      <Section
        title="How to rank applicants"
        intro="Decide what matters most for this role, out of 100%. Changing one criterion shares the difference between the others, so the total always stays at 100%."
      >
        <div className="flex h-4 w-full gap-[3px]" aria-hidden>
          {CRITERIA.filter((c) => weights[c.key] > 0).map((c) => (
            <div
              key={c.key}
              className="rounded-[2px] transition-[flex-basis] duration-200"
              style={{ flexBasis: `${weights[c.key]}%`, background: `var(--fit-${c.key})` }}
            />
          ))}
        </div>
        <ul className="space-y-4">
          {CRITERIA.map(({ key, label }) => (
            <WeightRow key={key} criterion={key} label={label} weights={weights} onChange={setWeights} />
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

/**
 * One criterion: a 1%-step slider and a number box. Both rebalance from the weights as they
 * were when the control was picked up, so typing "2" then "25" doesn't shift the others twice.
 */
function WeightRow({
  criterion,
  label,
  weights,
  onChange,
}: {
  criterion: CriterionKey;
  label: string;
  weights: Weights;
  onChange: (w: Weights) => void;
}) {
  const base = useRef<Weights | null>(null);
  const [typing, setTyping] = useState<string | null>(null);
  const start = () => {
    base.current = weights;
  };
  const set = (value: number) => onChange(rebalance(base.current ?? weights, criterion, value));
  const id = `w_${criterion}`;
  return (
    <li className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 sm:grid-cols-[12rem_1fr_5.5rem]">
      <label htmlFor={id} className="flex items-center gap-2 font-semibold">
        <span className="size-2.5 rounded-[2px]" style={{ background: `var(--fit-${criterion})` }} />
        {label}
      </label>
      <span className="flex items-center justify-end gap-1 sm:order-last">
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={100}
          step={1}
          aria-label={`${label} weight, percent`}
          className="input num w-16 px-2 py-1 text-right"
          value={typing ?? weights[criterion]}
          onFocus={(e) => {
            start();
            // Select the number so typing replaces it rather than adding digits to it.
            e.currentTarget.select();
          }}
          onMouseUp={(e) => e.preventDefault()}
          onChange={(e) => {
            setTyping(e.target.value);
            if (e.target.value !== "") set(Number(e.target.value));
          }}
          onBlur={() => {
            setTyping(null);
            base.current = null;
          }}
          onKeyDown={(e) => {
            // Enter saves the number rather than submitting the whole job.
            if (e.key === "Enter") {
              e.preventDefault();
              e.currentTarget.blur();
            }
          }}
        />
        <span className="text-ink-2">%</span>
      </span>
      <div className="col-span-2 sm:col-span-1">
        <input
          id={id}
          name={id}
          type="range"
          min={0}
          max={100}
          step={1}
          value={weights[criterion]}
          onPointerDown={start}
          onFocus={start}
          onBlur={() => (base.current = null)}
          onChange={(e) => set(Number(e.target.value))}
          className="w-full"
          style={{ accentColor: `var(--fit-${criterion})` }}
          aria-describedby={`${id}_help`}
          aria-valuetext={`${weights[criterion]}%`}
        />
        <p id={`${id}_help`} className="text-xs text-muted">{WEIGHT_HELP[criterion]}</p>
      </div>
    </li>
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
      {hint && <p id={`${id}-hint`} className="hint">{hint}</p>}
    </div>
  );
}
