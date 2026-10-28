"use client";

import { useActionState } from "react";
import { forgotPassword } from "../actions/password";
import { ActionForm, FormError, SubmitButton } from "@/components/form-bits";

export function ForgotForm() {
  const [state, action] = useActionState(forgotPassword, undefined);
  if (state?.sent) {
    return (
      <div role="status" className="box mt-8 p-5">
        <p className="font-semibold">Check your email</p>
        <p className="mt-1 text-sm text-ink-2">
          If there's an account for that address, we've sent a link to reset your password. It works for 60 minutes.
          Check your spam folder if it doesn't arrive in a few minutes.
        </p>
      </div>
    );
  }
  return (
    <ActionForm action={action} className="mt-8 space-y-4">
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input className="input" id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <FormError error={state?.error} />
      <SubmitButton pending="Sending…" className="btn btn-primary w-full">Send reset link</SubmitButton>
    </ActionForm>
  );
}
