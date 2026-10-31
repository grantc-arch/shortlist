"use client";

import { useActionState, useRef, useState } from "react";
import { saveJob } from "@/app/actions/employer";
import { ActionForm, FormError, SubmitButton } from "@/components/form-bits";
import { BENEFITS, EMPLOYMENT_LABELS, QUALIFICATIONS, WORKPLACE_LABELS } from "@/lib/constants";
import { PlaceField } from "@/components/place-input";
import { SkillField } from "@/components/skill-picker";
import type { Place } from "@/lib/places";
import { CRITERIA, DEFAULT_WEIGHTS, toPercentages, weightsProblem, weightsTotal, type CriterionKey, type Weights } from "@/lib/matching";
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
  // The total turns into an error once they try to save with it off 100, rather than while they're still adjusting.
  const [triedSaving, setTriedSaving] = useState(false);
  const total = weightsTotal(weights);
  const problem = weightsProblem(weights);
  const rankingRef = useRef<HTMLDivElement>(null);
  const setWeight = (key: CriterionKey, value: number) =>
    setWeights((w) => ({ ...w, [key]: Math.min(100, Math.max(0, Math.round(value) || 0)) }));

  return (
    <ActionForm
      action={action}
      className="mt-8 space-y-8"
      check={() => {
        setTriedSaving(true);
        if (!problem) return true;
        rankingRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        return false;
      }}
    >
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
        intro="Decide what matters most for this role. Give each criterion a share, so they add up to 100%."
      >
        {/* Scaled to the total when it's over 100, so the bar never overflows; a gap shows what's left to share. */}
        <div className="flex h-4 w-full gap-[3px] rounded-[3px] bg-sunken" aria-hidden>
          {CRITERIA.filter((c) => weights[c.key] > 0).map((c) => (
            <div
              key={c.key}
              className="rounded-[2px] transition-[flex-basis] duration-200"
              style={{ flexBasis: `${(weights[c.key] / Math.max(total, 100)) * 100}%`, background: `var(--fit-${c.key})` }}
            />
          ))}
        </div>
        <ul className="space-y-4">
          {CRITERIA.map(({ key, label }) => (
            <WeightRow key={key} criterion={key} label={label} value={weights[key]} onChange={(v) => setWeight(key, v)} />
          ))}
        </ul>
        <div
          ref={rankingRef}
          className={`flex flex-wrap items-center justify-between gap-2 rounded-md border px-4 py-2.5 text-sm ${
            !problem
              ? "border-line bg-sunken text-ink-2"
              : triedSaving
                ? "border-bad/40 bg-bad/10 text-ink"
                : "border-line bg-sunken text-ink-2"
          }`}
          role="status"
          aria-live="polite"
        >
          <span>
            <strong className={`num ${problem && triedSaving ? "text-bad" : "text-ink"}`}>Total {total}%</strong>
            {problem ? (total < 100 ? ` · ${100 - total}% left to share` : ` · ${total - 100}% over`) : " · ready to save"}
          </span>
          <button type="button" className="link text-sm" onClick={() => setWeights({ ...DEFAULT_WEIGHTS })}>
            Use the suggested split
          </button>
          {problem && triedSaving && <p className="w-full font-semibold text-bad">{problem}</p>}
        </div>
      </Section>

      <div className="space-y-3">
        <FormError error={state?.error} />
        <SubmitButton pending={job ? "Saving…" : "Posting…"}>{job ? "Save changes" : "Post job"}</SubmitButton>
      </div>
    </ActionForm>
  );
}

/** One criterion: a 1%-step slider and a number box showing the same value. Neither moves the others. */
function WeightRow({
  criterion,
  label,
  value,
  onChange,
}: {
  criterion: CriterionKey;
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  // What's in the box while typing, so it can be briefly empty.
  const [typing, setTyping] = useState<string | null>(null);
  const id = `w_${criterion}`;
  return (
    <li className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 sm:grid-cols-[12rem_1fr_auto]">
      <label htmlFor={id} className="flex items-center gap-2 font-semibold">
        <span className="size-2.5 rounded-[2px]" style={{ background: `var(--fit-${criterion})` }} />
        {label}
      </label>
      {/* Our own − and + buttons: exactly 1% per click. The browser's arrows kept counting after a click. */}
      <span className="flex items-center justify-end gap-1 sm:order-last">
        <StepButton label={`Lower ${label} by 1%`} disabled={value <= 0} onClick={() => onChange(value - 1)}>
          −
        </StepButton>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={100}
          step={1}
          aria-label={`${label} weight, percent`}
          className="input num no-spin w-14 px-2 py-1 text-center"
          value={typing ?? value}
          onFocus={(e) => e.currentTarget.select()}
          onMouseUp={(e) => e.preventDefault()}
          onChange={(e) => {
            setTyping(e.target.value);
            if (e.target.value !== "") onChange(Number(e.target.value));
          }}
          onBlur={() => {
            if (typing === "") onChange(0);
            setTyping(null);
          }}
          onKeyDown={(e) => {
            // Enter saves the number rather than submitting the whole job.
            if (e.key === "Enter") {
              e.preventDefault();
              e.currentTarget.blur();
            }
          }}
        />
        <StepButton label={`Raise ${label} by 1%`} disabled={value >= 100} onClick={() => onChange(value + 1)}>
          +
        </StepButton>
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
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full"
          style={{ accentColor: `var(--fit-${criterion})` }}
          aria-describedby={`${id}_help`}
          aria-valuetext={`${value}%`}
        />
        <p id={`${id}_help`} className="text-xs text-muted">{WEIGHT_HELP[criterion]}</p>
      </div>
    </li>
  );
}

function StepButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-8 place-items-center rounded-md border border-line text-lg leading-none text-ink-2 hover:border-ink hover:text-ink disabled:opacity-40 disabled:hover:border-line"
    >
      {children}
    </button>
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
