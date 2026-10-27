"use client";

import { useActionState } from "react";
import { applyForJob } from "@/app/actions/candidate";
import { ActionForm, FormError, SubmitButton } from "@/components/form-bits";

export function ApplyForm({
  jobId,
  mustHaves,
  defaults,
}: {
  jobId: string;
  mustHaves: string[];
  defaults: ("yes" | "no" | null)[];
}) {
  const [state, action] = useActionState(applyForJob, undefined);
  return (
    <ActionForm action={action} className="mt-6 space-y-6">
      <input type="hidden" name="jobId" value={jobId} />

      {mustHaves.length > 0 && (
        <fieldset className="panel p-5">
          <legend className="sr-only">Must-haves</legend>
          <h2 className="text-lg font-semibold">Must-haves</h2>
          <p className="mt-1 text-sm text-ink-2">
            Answer honestly. A “no” doesn't remove you from consideration, but the employer will see it.
          </p>
          <ul className="mt-4 divide-y divide-line">
            {mustHaves.map((m, i) => (
              <li key={m} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <span className="font-medium" id={`mh-${i}`}>
                  {m}
                </span>
                <span role="radiogroup" aria-labelledby={`mh-${i}`} className="flex gap-1.5">
                  {(["yes", "no"] as const).map((v) => (
                    <label key={v} className="cursor-pointer">
                      <input
                        type="radio"
                        name={`mustHave${i}`}
                        value={v}
                        defaultChecked={defaults[i] === v}
                        required
                        className="peer sr-only"
                      />
                      <span className="inline-block rounded-md border border-line px-3.5 py-1.5 text-sm font-semibold text-ink-2 peer-checked:border-ink peer-checked:bg-ink peer-checked:text-bg peer-focus-visible:outline-2 peer-focus-visible:outline-accent">
                        {v === "yes" ? "Yes" : "No"}
                      </span>
                    </label>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </fieldset>
      )}

      <div className="panel p-5">
        <label className="label text-lg" htmlFor="coverNote">
          Note to the employer
        </label>
        <p className="hint mb-2 mt-0">Optional. Why this role, and anything your CV doesn't say.</p>
        <textarea id="coverNote" name="coverNote" className="input min-h-36" maxLength={2000} />
      </div>

      <FormError error={state?.error} />
      <SubmitButton pending="Sending application…">Send application</SubmitButton>
    </ActionForm>
  );
}
