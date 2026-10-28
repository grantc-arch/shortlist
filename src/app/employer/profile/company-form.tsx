"use client";

import { useActionState } from "react";
import { saveEmployerProfile } from "@/app/actions/employer";
import { ActionForm, FormError, SubmitButton } from "@/components/form-bits";
import { PlaceField } from "@/components/place-input";
import type { Employer } from "@/db/schema";

export function CompanyForm({ employer }: { employer: Employer }) {
  const [state, action] = useActionState(saveEmployerProfile, undefined);
  return (
    <ActionForm action={action} className="mt-8 space-y-4">
      <div>
        <label className="label" htmlFor="companyName">Company or organisation</label>
        <input className="input" id="companyName" name="companyName" defaultValue={employer.companyName} required />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="city">Based in</label>
          <PlaceField
            id="city"
            name="city"
            required
            defaultValue={{ label: employer.city, lat: employer.lat, lng: employer.lng }}
          />
        </div>
        <div>
          <label className="label" htmlFor="website">Website</label>
          <input className="input" id="website" name="website" type="url" placeholder="https://" defaultValue={employer.website ?? ""} />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="about">About the company</label>
        <textarea className="input min-h-32" id="about" name="about" defaultValue={employer.about} maxLength={1500} />
        <p className="hint">What you do and what it's like to work there, in a few sentences.</p>
      </div>
      <FormError error={state?.error} />
      <SubmitButton>Save company details</SubmitButton>
    </ActionForm>
  );
}
