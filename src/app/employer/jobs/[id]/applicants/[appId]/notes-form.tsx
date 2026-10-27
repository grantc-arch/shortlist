"use client";

import { useState, useTransition } from "react";
import { updateApplication } from "@/app/actions/employer";

export function NotesForm({ applicationId, notes }: { applicationId: string; notes: string }) {
  const [value, setValue] = useState(notes);
  const [saved, setSaved] = useState(notes);
  const [pending, startTransition] = useTransition();
  const dirty = value !== saved;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData();
        data.set("applicationId", applicationId);
        data.set("employerNotes", value);
        startTransition(async () => {
          await updateApplication(data);
          setSaved(value);
        });
      }}
    >
      <label htmlFor="employerNotes" className="label text-base">
        Private notes
      </label>
      <p className="hint mb-2 mt-0">Only you can see these.</p>
      <textarea
        id="employerNotes"
        className="input min-h-32"
        value={value}
        maxLength={4000}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Interview impressions, references, follow-ups"
      />
      <div className="mt-2 flex items-center gap-3">
        <button className="btn" disabled={pending || !dirty}>
          {pending ? "Saving…" : "Save notes"}
        </button>
        <span className="text-sm text-muted" aria-live="polite">
          {!dirty && !pending && saved ? "Saved" : ""}
        </span>
      </div>
    </form>
  );
}
