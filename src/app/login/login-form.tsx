"use client";

import { useActionState } from "react";
import { login } from "../actions/auth";
import { ActionForm, FormError, SubmitButton } from "@/components/form-bits";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(login, undefined);
  return (
    <ActionForm action={action} className="panel mt-6 space-y-4 p-5">
      <input type="hidden" name="next" value={next ?? ""} />
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input className="input" id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div>
        <label className="label" htmlFor="password">Password</label>
        <input className="input" id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      <FormError error={state?.error} />
      <SubmitButton pending="Logging in…" className="btn btn-primary w-full">Log in</SubmitButton>
    </ActionForm>
  );
}
