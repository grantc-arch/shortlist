"use client";

import { useActionState } from "react";
import { reportJob } from "@/app/actions/reports";
import { ActionForm, FormError, SubmitButton } from "@/components/form-bits";
import { REPORT_REASONS } from "@/lib/constants";

export function ReportForm({ jobId }: { jobId: string }) {
  const [state, action] = useActionState(reportJob, undefined);
  return (
    <ActionForm action={action} className="mt-6 space-y-5">
      <input type="hidden" name="jobId" value={jobId} />
      <fieldset>
        <legend className="label">What's wrong with it?</legend>
        <div className="mt-2 space-y-2">
          {REPORT_REASONS.map((r) => (
            <label key={r.value} className="flex items-start gap-2.5 text-sm text-ink-2">
              <input type="radio" name="reason" value={r.value} required className="mt-1 size-4 accent-[var(--accent)]" />
              {r.label}
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <label className="label" htmlFor="details">
          Details
        </label>
        <textarea id="details" name="details" className="input" maxLength={1000} placeholder="Optional. What did they ask for, and how?" />
      </div>
      <FormError error={state?.error} />
      <SubmitButton pending="Sending…">Send report</SubmitButton>
    </ActionForm>
  );
}
