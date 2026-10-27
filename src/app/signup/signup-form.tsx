"use client";

import { useActionState, useState } from "react";
import { signup } from "../actions/auth";
import { ActionForm, FormError, SubmitButton } from "@/components/form-bits";
import { CITIES } from "@/lib/constants";

export function SignupForm({ next, initialRole }: { next?: string; initialRole: "candidate" | "employer" }) {
  const [state, action] = useActionState(signup, undefined);
  const [role, setRole] = useState(initialRole);

  return (
    <ActionForm action={action} className="panel mt-6 space-y-4 p-5">
      <input type="hidden" name="next" value={next ?? ""} />
      <fieldset>
        <legend className="label">I want to</legend>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["candidate", "Find a job"],
              ["employer", "Hire someone"],
            ] as const
          ).map(([value, label]) => (
            <label
              key={value}
              className={`cursor-pointer rounded-md border px-3 py-2.5 text-center text-sm font-semibold ${
                role === value ? "border-ink bg-ink text-bg" : "border-line bg-surface text-ink-2 hover:border-ink-2"
              }`}
            >
              <input
                type="radio"
                name="role"
                value={value}
                checked={role === value}
                onChange={() => setRole(value)}
                className="sr-only"
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      {role === "candidate" ? (
        <div>
          <label className="label" htmlFor="fullName">Full name</label>
          <input className="input" id="fullName" name="fullName" autoComplete="name" required />
        </div>
      ) : (
        <>
          <div>
            <label className="label" htmlFor="companyName">Company or organisation</label>
            <input className="input" id="companyName" name="companyName" autoComplete="organization" required />
          </div>
          <div>
            <label className="label" htmlFor="city">Where you're based</label>
            <select className="input" id="city" name="city" defaultValue="Cape Town">
              {CITIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
        </>
      )}

      <div>
        <label className="label" htmlFor="email">Email</label>
        <input className="input" id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div>
        <label className="label" htmlFor="password">Password</label>
        <input className="input" id="password" name="password" type="password" minLength={8} autoComplete="new-password" required />
        <p className="hint">At least 8 characters.</p>
      </div>
      <FormError error={state?.error} />
      <SubmitButton pending="Creating account…" className="btn btn-primary w-full">
        Create account
      </SubmitButton>
    </ActionForm>
  );
}
