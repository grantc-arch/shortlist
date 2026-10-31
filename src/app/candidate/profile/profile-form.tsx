"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { autofillFromCv, saveProfile } from "@/app/actions/candidate";
import { ActionForm, FormError, SubmitButton } from "@/components/form-bits";
import { QUALIFICATIONS } from "@/lib/constants";
import { PlaceInput } from "@/components/place-input";
import { SkillPicker } from "@/components/skill-picker";
import { parseList } from "@/lib/matching";
import { mergeSuggestions, type DraftField, type ProfileDraft } from "@/lib/autofill-merge";
import type { CandidateRow } from "@/lib/queries";

export function ProfileForm({
  candidate: c,
  next,
  autofill,
}: {
  candidate: CandidateRow;
  next?: string;
  autofill: boolean;
}) {
  const [state, action] = useActionState(saveProfile, undefined);
  const [draft, setDraft] = useState<ProfileDraft>({
    fullName: c.fullName,
    phone: c.phone,
    city: c.city,
    cityLat: c.lat,
    cityLng: c.lng,
    availableFrom: c.availableFrom ?? "",
    willingToRelocate: c.willingToRelocate,
    hasOwnTransport: c.hasOwnTransport,
    qualificationLevel: c.qualificationLevel,
    fieldOfStudy: c.fieldOfStudy,
    yearsExperience: c.yearsExperience,
    skills: c.skills.join(", "),
    summary: c.summary,
  });
  const [fromCv, setFromCv] = useState<Set<DraftField>>(new Set());
  const [cvName, setCvName] = useState<string | null>(null);
  const cvInput = useRef<HTMLInputElement>(null);
  // The CV is read in the background, so merge into whatever the form holds when the answer arrives.
  const latest = useRef(draft);
  useEffect(() => {
    latest.current = draft;
  }, [draft]);

  // Editing a field yourself removes its "from your CV" tag.
  const set = <K extends DraftField>(key: K, value: ProfileDraft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setFromCv((f) => {
      if (!f.has(key)) return f;
      const copy = new Set(f);
      copy.delete(key);
      return copy;
    });
  };
  const tag = (key: DraftField) => fromCv.has(key);

  return (
    <div className="mt-8 space-y-8">
      {autofill && (
        <CvAutofill
          onFilled={(file, suggestions) => {
            const { draft: merged, filled } = mergeSuggestions(latest.current, suggestions);
            setDraft(merged);
            setFromCv(new Set(filled));
            // Use the same file as their CV, so they don't have to choose it twice.
            if (cvInput.current) {
              const transfer = new DataTransfer();
              transfer.items.add(file);
              cvInput.current.files = transfer.files;
              setCvName(file.name);
            }
            return filled.length;
          }}
        />
      )}

      <ActionForm action={action} className="space-y-8">
        <input type="hidden" name="next" value={next ?? ""} />

        <Section title="Contact">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" id="fullName" fromCv={tag("fullName")}>
              <input className="input" id="fullName" name="fullName" value={draft.fullName} onChange={(e) => set("fullName", e.target.value)} autoComplete="name" required />
            </Field>
            <Field label="Phone" id="phone" fromCv={tag("phone")}>
              <input className="input" id="phone" name="phone" type="tel" value={draft.phone} onChange={(e) => set("phone", e.target.value)} autoComplete="tel" placeholder="082 123 4567" required />
            </Field>
          </div>
        </Section>

        <Section title="Location and availability">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Where you're based" id="city" fromCv={tag("city")} hint="Your suburb or town. Pick it from the list so we can work out distances to jobs.">
              <PlaceInput
                id="city"
                name="city"
                required
                value={{ label: draft.city, lat: draft.cityLat, lng: draft.cityLng }}
                onChange={(p) => {
                  set("city", p.label);
                  setDraft((d) => ({ ...d, cityLat: p.lat, cityLng: p.lng }));
                }}
              />
            </Field>
            <Field label="Available to start from" id="availableFrom">
              <input className="input" id="availableFrom" name="availableFrom" type="date" value={draft.availableFrom} onChange={(e) => set("availableFrom", e.target.value)} required />
            </Field>
          </div>
          <div className="mt-4 space-y-2.5">
            <Check name="willingToRelocate" checked={draft.willingToRelocate} onChange={(v) => set("willingToRelocate", v)}>
              I'm willing to relocate for the right job
            </Check>
            <Check name="hasOwnTransport" checked={draft.hasOwnTransport} onChange={(v) => set("hasOwnTransport", v)} fromCv={tag("hasOwnTransport")}>
              I have my own reliable transport
            </Check>
          </div>
        </Section>

        <Section title="Qualifications and experience">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Highest qualification" id="qualificationLevel" fromCv={tag("qualificationLevel")} hint="Completed qualifications only.">
              <select
                className="input"
                id="qualificationLevel"
                name="qualificationLevel"
                value={draft.qualificationLevel}
                onChange={(e) => set("qualificationLevel", e.target.value as ProfileDraft["qualificationLevel"])}
              >
                {QUALIFICATIONS.map((q) => (
                  <option key={q.value} value={q.value}>
                    {q.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Field of study" id="fieldOfStudy" hint="For example: Marketing Management" fromCv={tag("fieldOfStudy")}>
              <input className="input" id="fieldOfStudy" name="fieldOfStudy" value={draft.fieldOfStudy} onChange={(e) => set("fieldOfStudy", e.target.value)} />
            </Field>
            <Field label="Years of relevant work experience" id="yearsExperience" hint="Include part-time and contract work." fromCv={tag("yearsExperience")}>
              <input
                className="input"
                id="yearsExperience"
                name="yearsExperience"
                type="number"
                min={0}
                max={50}
                value={draft.yearsExperience}
                onChange={(e) => set("yearsExperience", Number(e.target.value))}
                required
              />
            </Field>
          </div>
          <div className="mt-4">
            <Field
              label="Skills"
              id="skills"
              hint="Pick from the suggestions where you can, so employers' wording still matches yours. Press Enter to add your own."
              fromCv={tag("skills")}
            >
              <SkillPicker
                id="skills"
                name="skills"
                value={parseList(draft.skills)}
                onChange={(list) => set("skills", list.join(", "))}
                describedBy="skills-hint"
              />
            </Field>
          </div>
          <div className="mt-4">
            <Field
              label="Short summary"
              id="summary"
              hint={tag("summary") ? "Drafted from your CV. Rewrite it in your own words before you save." : "Optional. Two or three sentences employers see at the top of your application."}
              fromCv={tag("summary")}
            >
              <textarea className="input" id="summary" name="summary" value={draft.summary} onChange={(e) => set("summary", e.target.value)} maxLength={1200} />
            </Field>
          </div>
        </Section>

        <Section title="CV">
          <Field
            label={c.cvFileName ? "Replace your CV" : "Upload your CV"}
            id="cv"
            hint={
              cvName
                ? `Using ${cvName}, the file you auto-filled from.`
                : c.cvFileName
                  ? `Current file: ${c.cvFileName}. Leave empty to keep it.`
                  : "PDF, up to 2 MB."
            }
          >
            <input
              ref={cvInput}
              className="input file:mr-3 file:rounded file:border-0 file:bg-sunken file:px-3 file:py-1 file:font-semibold file:text-ink"
              id="cv"
              name="cv"
              type="file"
              accept="application/pdf,.pdf"
              required={!c.cvFileName}
              onChange={() => setCvName(null)}
            />
          </Field>
        </Section>

        <Section title="Consent">
          <label className="flex items-start gap-2.5 text-sm text-ink-2">
            <input type="checkbox" name="consent" defaultChecked={!!c.popiaConsentAt} required className="mt-1 size-4 accent-[var(--accent)]" />
            <span>
              I agree that Shortlist may store my details and share my profile and CV with the employers I apply to, for
              the purpose of those applications only. I can update my profile or delete my account at any time. See the{" "}
              <Link href="/privacy" className="link" target="_blank">privacy policy</Link>.
            </span>
          </label>
        </Section>

        <div className="space-y-3">
          <FormError error={state?.error} />
          <SubmitButton pending="Saving profile…">Save profile</SubmitButton>
        </div>
      </ActionForm>
    </div>
  );
}

/** Upload a CV, have it read, and hand the suggestions back to the form. */
function CvAutofill({
  onFilled,
}: {
  onFilled: (file: File, suggestions: Parameters<typeof mergeSuggestions>[1]) => number;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  function read() {
    if (!file) return;
    const data = new FormData();
    data.set("cv", file);
    setResult(null);
    startTransition(async () => {
      const res = await autofillFromCv(data);
      if (!res.ok) {
        setResult({ kind: "error", text: res.error });
        return;
      }
      const count = onFilled(file, res.suggestions);
      setResult(
        count > 0
          ? {
              kind: "ok",
              text: `Filled in ${count} ${count === 1 ? "field" : "fields"} from ${file.name}. They're marked “From your CV” below. Check each one before you save, especially years of experience.`,
            }
          : { kind: "ok", text: "Your CV didn't add anything new. Everything it covers is already filled in." },
      );
    });
  }

  return (
    <section className="box p-5" aria-labelledby="autofill-heading">
      <h2 id="autofill-heading" className="text-lg font-semibold">
        Start from your CV
      </h2>
      <p className="mt-1 max-w-prose text-sm text-ink-2">
        Upload your CV and we'll fill in the empty fields below. Nothing you've already typed is changed, and nothing is
        saved until you press Save profile. Your CV is read by Claude, Anthropic's AI.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label htmlFor="autofill-cv" className="sr-only">
          CV to read
        </label>
        <input
          id="autofill-cv"
          type="file"
          accept="application/pdf,.pdf"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setResult(null);
          }}
          className="input w-auto max-w-full flex-1 file:mr-3 file:rounded file:border-0 file:bg-sunken file:px-3 file:py-1 file:font-semibold file:text-ink"
        />
        <button type="button" className="btn btn-primary" disabled={!file || pending} onClick={read}>
          {pending ? "Reading your CV…" : "Fill in from my CV"}
        </button>
      </div>
      {result && (
        <p
          role={result.kind === "error" ? "alert" : "status"}
          className={`mt-3 text-sm ${result.kind === "error" ? "text-bad" : "text-good"}`}
        >
          {result.text}
        </p>
      )}
    </section>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="section">
      <legend className="sr-only">{title}</legend>
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      {children}
    </fieldset>
  );
}

function FromCvTag() {
  return (
    <span className="ml-2 inline-block whitespace-nowrap rounded bg-[color-mix(in_srgb,var(--fit-qualification)_14%,transparent)] px-1.5 py-0.5 text-xs font-semibold text-[var(--fit-qualification)]">
      From your CV
    </span>
  );
}

function Field({
  label,
  id,
  hint,
  fromCv,
  children,
}: {
  label: string;
  id: string;
  hint?: string;
  fromCv?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="label" htmlFor={id}>
        {label}
        {fromCv && <FromCvTag />}
      </label>
      {children}
      {hint && <p id={`${id}-hint`} className="hint">{hint}</p>}
    </div>
  );
}

function Check({
  name,
  checked,
  onChange,
  fromCv,
  children,
}: {
  name: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  fromCv?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="flex items-start gap-2.5 text-sm text-ink-2">
      <input type="checkbox" name={name} checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-1 size-4 accent-[var(--accent)]" />
      <span>
        {children}
        {fromCv && <FromCvTag />}
      </span>
    </label>
  );
}
