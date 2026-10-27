"use client";

import { createContext, useContext, useTransition } from "react";

const PendingContext = createContext(false);

/**
 * A form that submits to a server action without React resetting the fields
 * afterwards, so people don't lose what they typed when validation fails.
 */
export function ActionForm({
  action,
  className,
  children,
}: {
  action: (data: FormData) => void;
  className?: string;
  children: React.ReactNode;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <form
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}
    >
      <PendingContext value={pending}>{children}</PendingContext>
    </form>
  );
}

export function SubmitButton({
  children,
  pending,
  className = "btn btn-primary",
}: {
  children: React.ReactNode;
  pending?: string;
  className?: string;
}) {
  const isPending = useContext(PendingContext);
  return (
    <button type="submit" className={className} disabled={isPending}>
      {isPending ? (pending ?? "Saving…") : children}
    </button>
  );
}

export function FormError({ error }: { error?: string }) {
  if (!error) return null;
  return (
    <p role="alert" className="rounded-md border border-bad/40 bg-bad/10 px-3 py-2 text-sm text-bad">
      {error}
    </p>
  );
}
