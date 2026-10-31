"use client";

import Link from "next/link";
import { useActionState, useId } from "react";
import { sendMessage } from "@/app/actions/messages";
import { ActionForm, SubmitButton } from "@/components/form-bits";

/**
 * Write a message. With `to` it replies in a conversation; without, it asks who to send to
 * (suggesting recent contacts). With `jobId` the job is sent along as a card.
 */
export function MessageForm({
  to,
  jobId,
  recent = [],
  placeholder = "Write a message",
  compact = false,
  showConversationLink = false,
}: {
  to?: string;
  jobId?: string;
  recent?: string[];
  placeholder?: string;
  compact?: boolean;
  showConversationLink?: boolean;
}) {
  const [state, action] = useActionState(sendMessage, undefined);
  const id = useId();
  return (
    // A new key after each send clears the fields.
    <ActionForm key={state?.sentAt ?? "new"} action={action} className="space-y-2">
      {jobId && <input type="hidden" name="jobId" value={jobId} />}
      {to ? (
        <input type="hidden" name="to" value={to} />
      ) : (
        <>
          <label htmlFor={`${id}-to`} className={compact ? "sr-only" : "label"}>
            To
          </label>
          <div className="flex items-center rounded-md border border-line bg-surface focus-within:border-ink-2">
            <span className="pl-3 text-muted" aria-hidden>
              @
            </span>
            <input
              id={`${id}-to`}
              name="to"
              required
              list={recent.length ? `${id}-recent` : undefined}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="username"
              className="w-full bg-transparent py-1.5 pr-3 pl-1 text-sm outline-none"
            />
          </div>
          {recent.length > 0 && (
            <datalist id={`${id}-recent`}>
              {recent.map((r) => (
                <option key={r} value={r} />
              ))}
            </datalist>
          )}
        </>
      )}
      <label htmlFor={`${id}-body`} className="sr-only">
        Message
      </label>
      <textarea
        id={`${id}-body`}
        name="body"
        required={!jobId}
        maxLength={2000}
        placeholder={placeholder}
        className={`input text-sm ${compact ? "min-h-14 py-1.5" : "min-h-20"}`}
        onKeyDown={(e) => {
          // Ctrl/Cmd + Enter sends.
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) e.currentTarget.form?.requestSubmit();
        }}
      />
      {state?.error && (
        <p role="alert" className="text-sm text-bad">
          {state.error}
        </p>
      )}
      {state?.sentTo && !to && (
        <p role="status" className="text-sm text-good">
          Sent to @{state.sentTo}.{" "}
          {showConversationLink && (
            <Link href={`/messages/${state.sentTo}`} className="link">
              Open the conversation
            </Link>
          )}
        </p>
      )}
      <SubmitButton className={`btn btn-primary ${compact ? "w-full py-1.5 text-sm" : ""}`} pending="Sending…">
        Send
      </SubmitButton>
    </ActionForm>
  );
}
