"use client";

import { useActionState } from "react";
import { saveProfile } from "@/app/actions/candidate";
import { ActionForm, FormError, SubmitButton } from "@/components/form-bits";
import { CITIES, QUALIFICATIONS } from "@/lib/constants";
import type { CandidateRow } from "@/lib/queries";

export function ProfileForm({ candidate: c, next }: { candidate: CandidateRow; next?: string }) {
  const [state, action] = useActionState(saveProfile, undefined);

  return (
    <ActionForm action={action} className="mt-8 space-y-8">
      <input type="hidden" name="next" value={next ?? ""} />

      <Section title="Contact">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" id="fullName">
            <input className="input" id="fullName" name="fullName" defaultValue={c.fullName} autoComplete="name" required />
          </Field>
          <Field label="Phone" id="phone">
            <input className="input" id="phone" name="phone" type="tel" defaultValue={c.phone} autoComplete="tel" placeholder="082 123 4567" required />
          </Field>
        </div>
      </Section>

      <Section title="Location and availability">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="City you're based in" id="city">
            <select className="input" id="city" name="city" defaultValue={c.city || ""} required>
              <option value="" disabled>Choose a city</option>
              {CITIES.map((city) => (
                <option key={city}>{city}</option>
              ))}
            </select>
          </Field>
          <Field label="Available to start from" id="availableFrom">
            <input className="input" id="availableFrom" name="availableFrom" type="date" defaultValue={c.availableFrom ?? ""} required />
          </Field>
        </div>
        <div className="mt-4 space-y-2.5">
          <Check name="willingToRelocate" defaultChecked={c.willingToRelocate}>
            I'm willing to relocate for the right job
          </Check>
          <Check name="hasOwnTransport" defaultChecked={c.hasOwnTransport}>
            I have my own reliable transport
          </Check>
        </div>
      </Section>

      <Section title="Qualifications and experience">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Highest qualification" id="qualificationLevel">
            <select className="input" id="qualificationLevel" name="qualificationLevel" defaultValue={c.qualificationLevel}>
              {QUALIFICATIONS.map((q) => (
                <option key={q.value} value={q.value}>
                  {q.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Field of study" id="fieldOfStudy" hint="For example: Marketing Management">
            <input className="input" id="fieldOfStudy" name="fieldOfStudy" defaultValue={c.fieldOfStudy} />
          </Field>
          <Field label="Years of relevant work experience" id="yearsExperience" hint="Include part-time and contract work.">
            <input className="input" id="yearsExperience" name="yearsExperience" type="number" min={0} max={50} defaultValue={c.yearsExperience} required />
          </Field>
        </div>
        <div className="mt-4">
          <Field
            label="Skills"
            id="skills"
            hint="Separate with commas. Name software specifically, e.g. Excel, Outlook, Canva, Google Workspace."
          >
            <textarea className="input min-h-20" id="skills" name="skills" defaultValue={c.skills.join(", ")} required />
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Short summary" id="summary" hint="Optional. Two or three sentences employers see at the top of your application.">
            <textarea className="input" id="summary" name="summary" defaultValue={c.summary} maxLength={1200} />
          </Field>
        </div>
      </Section>

      <Section title="CV">
        <Field
          label={c.cvFileName ? "Replace your CV" : "Upload your CV"}
          id="cv"
          hint={c.cvFileName ? `Current file: ${c.cvFileName}. Leave empty to keep it.` : "PDF, up to 2 MB."}
        >
          <input className="input file:mr-3 file:rounded file:border-0 file:bg-sunken file:px-3 file:py-1 file:font-semibold file:text-ink" id="cv" name="cv" type="file" accept="application/pdf,.pdf" required={!c.cvFileName} />
        </Field>
      </Section>

      <Section title="Consent">
        <Check name="consent" defaultChecked={!!c.popiaConsentAt} required>
          I agree that Shortlist may store my details and share my profile and CV with the employers I apply to, for the
          purpose of those applications only. I can update my profile or delete my account at any time. (POPIA)
        </Check>
      </Section>

      <div className="space-y-3">
        <FormError error={state?.error} />
        <SubmitButton pending="Saving profile…">Save profile</SubmitButton>
      </div>
    </ActionForm>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="panel p-5">
      <legend className="sr-only">{title}</legend>
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      {children}
    </fieldset>
  );
}

function Field({ label, id, hint, children }: { label: string; id: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label" htmlFor={id}>
        {label}
      </label>
      {children}
      {hint && <p className="hint">{hint}</p>}
    </div>
  );
}

function Check({ name, defaultChecked, required, children }: { name: string; defaultChecked?: boolean; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="flex items-start gap-2.5 text-sm text-ink-2">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} required={required} className="mt-1 size-4 accent-[var(--accent)]" />
      <span>{children}</span>
    </label>
  );
}
