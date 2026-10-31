"use client";

import { useActionState } from "react";
import { changeUsername } from "@/app/actions/messages";
import { ActionForm, SubmitButton } from "@/components/form-bits";

export function UsernameForm({ current }: { current: string }) {
  const [state, action] = useActionState(changeUsername, undefined);
  return (
    <ActionForm action={action} className="mt-3 space-y-2">
      <label htmlFor="username" className="label">
        Username
      </label>
      <div className="flex flex-wrap gap-2">
        <div className="flex min-w-0 flex-1 items-center rounded-md border border-line bg-surface focus-within:border-ink-2">
          <span className="pl-3 text-muted" aria-hidden>
            @
          </span>
          <input
            id="username"
            name="username"
            defaultValue={current}
            required
            minLength={3}
            maxLength={20}
            autoCapitalize="none"
            spellCheck={false}
            className="w-full scroll-mt-24 bg-transparent py-2 pr-3 pl-1 outline-none"
            aria-describedby="username-hint"
          />
        </div>
        <SubmitButton className="btn" pending="Saving…">
          Save username
        </SubmitButton>
      </div>
      <p id="username-hint" className="hint">
        3 to 20 lower-case letters, numbers or underscores. People use it to send you messages.
      </p>
      {state?.error && (
        <p role="alert" className="text-sm text-bad">
          {state.error}
        </p>
      )}
      {state?.saved && (
        <p role="status" className="text-sm text-good">
          Username saved.
        </p>
      )}
    </ActionForm>
  );
}
