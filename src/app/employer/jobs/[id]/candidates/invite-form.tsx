"use client";

import { useActionState, useState } from "react";
import { inviteCandidate } from "@/app/actions/employer";
import { ActionForm, FormError, SubmitButton } from "@/components/form-bits";

export function InviteForm({ jobId, candidateId }: { jobId: string; candidateId: string }) {
  const [state, action] = useActionState(inviteCandidate, undefined);
  const [withMessage, setWithMessage] = useState(false);
  if (state?.invited) return <p className="text-sm font-semibold text-good">Invitation sent</p>;
  return (
    <ActionForm action={action} className="space-y-2">
      <input type="hidden" name="jobId" value={jobId} />
      <input type="hidden" name="candidateId" value={candidateId} />
      {withMessage ? (
        <>
          <label className="sr-only" htmlFor={`message-${candidateId}`}>
            Message
          </label>
          <textarea
            id={`message-${candidateId}`}
            name="message"
            maxLength={500}
            className="input min-h-20 text-sm"
            placeholder="Why you think they'd be a good fit (optional)"
          />
        </>
      ) : (
        <button type="button" className="text-sm text-ink-2 underline underline-offset-2 hover:text-ink" onClick={() => setWithMessage(true)}>
          Add a message
        </button>
      )}
      <FormError error={state?.error} />
      <SubmitButton className="btn btn-primary w-full" pending="Sending…">
        Invite to apply
      </SubmitButton>
    </ActionForm>
  );
}
