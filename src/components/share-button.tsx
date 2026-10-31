"use client";

import Link from "next/link";
import { useActionState, useEffect, useId, useRef, useState } from "react";
import { shareJobWithUser } from "@/app/actions/share";
import { ActionForm, SubmitButton } from "@/components/form-bits";

function ShareIcon() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 10V2.5M5 5.5l3-3 3 3M3.5 8.5v4.25c0 .41.34.75.75.75h7.5c.41 0 .75-.34.75-.75V8.5" />
    </svg>
  );
}

/** Send the job to someone by email address; it also lands on their dashboard if they have an account. */
function SendToSomeone({ jobId, recent }: { jobId: string; recent: string[] }) {
  const [state, action] = useActionState(shareJobWithUser, undefined);
  const listId = useId();
  return (
    // A new key after each successful send clears the fields for the next person.
    <ActionForm key={state?.sentAt ?? "form"} action={action} className="space-y-2 px-3 py-3">
      <input type="hidden" name="jobId" value={jobId} />
      <label htmlFor={`${listId}-email`} className="block text-sm font-semibold text-ink">
        Send to someone on Shortlist
      </label>
      <input
        id={`${listId}-email`}
        name="email"
        type="email"
        required
        list={recent.length ? listId : undefined}
        autoComplete="email"
        placeholder="Their email address"
        className="input py-1.5 text-sm"
      />
      {recent.length > 0 && (
        <datalist id={listId}>
          {recent.map((r) => (
            <option key={r} value={r} />
          ))}
        </datalist>
      )}
      <textarea name="note" maxLength={300} placeholder="Add a note (optional)" className="input min-h-14 py-1.5 text-sm" />
      {state?.error && (
        <p role="alert" className="text-sm text-bad">
          {state.error}
        </p>
      )}
      {state?.sentTo && (
        <p role="status" className="text-sm text-good">
          Sent to {state.sentTo}.
        </p>
      )}
      <SubmitButton className="btn btn-primary w-full py-1.5 text-sm" pending="Sending…">
        Send
      </SubmitButton>
      <p className="text-xs text-muted">If they're on Shortlist it shows on their dashboard, and they get an email either way.</p>
    </ActionForm>
  );
}

/**
 * Share a job: send it to someone on Shortlist, email it, copy the link, or post it elsewhere.
 * Where the device has its own share menu (phones), "More options" opens it too.
 */
export function ShareButton({
  url,
  jobId,
  title,
  company,
  signedIn,
  recent = [],
}: {
  url: string;
  jobId: string;
  title: string;
  company: string;
  signedIn: boolean;
  recent?: string[];
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  // Clicking anywhere outside the panel closes it.
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);
  const text = `${title} at ${company}, on Shortlist`;
  const intro = `Thought you might like this job: ${text}`;
  const message = `${intro}. ${url}`;
  const u = encodeURIComponent(url);
  const canSystemShare = () => typeof navigator !== "undefined" && typeof navigator.share === "function";

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link:", url);
    }
  }

  const links: [string, string][] = [
    ["WhatsApp", `https://wa.me/?text=${encodeURIComponent(message)}`],
    ["Facebook", `https://www.facebook.com/sharer/sharer.php?u=${u}`],
    ["LinkedIn", `https://www.linkedin.com/sharing/share-offsite/?url=${u}`],
    ["X (Twitter)", `https://x.com/intent/post?text=${encodeURIComponent(intro)}&url=${u}`],
    ["Telegram", `https://t.me/share/url?url=${u}&text=${encodeURIComponent(intro)}`],
  ];
  const item = "flex w-full items-center px-3 py-2 text-left text-sm text-ink hover:bg-sunken";

  return (
    <div
      ref={box}
      className="relative"
      // Tabbing out closes it. (Focus can also vanish while Send is busy; that mustn't close it.)
      onBlur={(e) => {
        if (e.relatedTarget && !e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <button type="button" className="btn w-full" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <ShareIcon />
        Share this job
      </button>
      {open && (
        <div
          role="group"
          aria-label="Share this job"
          className="absolute inset-x-0 z-20 mt-1 overflow-hidden rounded-md border border-line bg-surface shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        >
          {signedIn ? (
            <SendToSomeone jobId={jobId} recent={recent} />
          ) : (
            <p className="px-3 py-3 text-sm text-ink-2">
              <Link href={`/login?next=/jobs/${jobId}`} className="link font-semibold">
                Log in
              </Link>{" "}
              to send this job to someone on Shortlist.
            </p>
          )}
          <div className="border-t border-line py-1">
            <a className={item} href={`mailto:?subject=${encodeURIComponent(`Job: ${title}`)}&body=${encodeURIComponent(message)}`}>
              Email
            </a>
            <button type="button" className={item} onClick={copy}>
              {copied ? "Link copied" : "Copy link"}
            </button>
            {links.map(([label, href]) => (
              <a key={label} className={item} href={href} target="_blank" rel="noreferrer">
                {label}
              </a>
            ))}
            {canSystemShare() && (
              <button
                type="button"
                className={`${item} text-ink-2`}
                onClick={() => navigator.share({ title: text, text: intro, url }).catch(() => {})}
              >
                More options…
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
