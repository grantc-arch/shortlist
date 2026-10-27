"use client";

import { useTransition } from "react";
import { updateApplication } from "@/app/actions/employer";
import { STATUS_LABELS, STATUS_ORDER } from "@/lib/constants";
import type { ApplicationStatus } from "@/db/schema";

/** Changes an application's status as soon as a new option is picked. */
export function StatusSelect({ applicationId, status, label }: { applicationId: string; status: ApplicationStatus; label: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <select
      aria-label={label}
      defaultValue={status}
      disabled={pending}
      className="input relative z-10 w-auto py-1.5 text-sm font-semibold"
      onChange={(e) => {
        const data = new FormData();
        data.set("applicationId", applicationId);
        data.set("status", e.target.value);
        startTransition(() => updateApplication(data));
      }}
    >
      {STATUS_ORDER.map((s) => (
        <option key={s} value={s}>
          {STATUS_LABELS[s]}
        </option>
      ))}
    </select>
  );
}
