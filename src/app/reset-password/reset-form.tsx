"use client";

import Link from "next/link";
import { useActionState } from "react";
import { completeReset } from "../actions/password";
import { ActionForm, FormError, SubmitButton } from "@/components/form-bits";

export function ResetForm({ token }: { token: string }) {
  const [state, action] = useActionState(completeReset, undefined);
  return (
    <ActionForm action={action} className="mt-8 space-y-4">
      <input type="hidden" name="token" value={token} />
      <div>
        <label className="label" htmlFor="password">New password</label>
        <input className="input" id="password" name="password" type="password" minLength={8} autoComplete="new-password" required />
        <p className="hint">At least 8 characters.</p>
      </div>
      <div>
        <label className="label" htmlFor="confirm">Type it again</label>
        <input className="input" id="confirm" name="confirm" type="password" minLength={8} autoComplete="new-password" required />
      </div>
      <FormError error={state?.error} />
      {state?.error?.includes("expired") && (
        <Link href="/forgot-password" className="link text-sm">
          Send a new link
        </Link>
      )}
      <SubmitButton pending="Saving…" className="btn btn-primary w-full">Save new password</SubmitButton>
    </ActionForm>
  );
}
