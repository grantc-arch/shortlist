"use client";

import Link from "next/link";
import { useRef, useState, useSyncExternalStore } from "react";
import { MessageForm } from "@/components/message-form";

const noSubscribe = () => () => {};

function ShareIcon() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 10V2.5M5 5.5l3-3 3 3M3.5 8.5v4.25c0 .41.34.75.75.75h7.5c.41 0 .75-.34.75-.75V8.5" />
    </svg>
  );
}

/**
 * Share a job, in a pop-up window that always fits the screen: first as a message to someone on
 * Shortlist (by username), then the usual ways (email, copy link, WhatsApp...). Where the device
 * has its own share menu, "More options" opens it.
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
  const dialog = useRef<HTMLDialogElement>(null);
  const [copied, setCopied] = useState(false);
  const text = `${title} at ${company}, on Shortlist`;
  const intro = `Thought you might like this job: ${text}`;
  const message = `${intro}. ${url}`;
  const u = encodeURIComponent(url);
  // Only known in the browser, so the server renders without "More options" and the browser adds it.
  const canSystemShare = useSyncExternalStore(
    noSubscribe,
    () => typeof navigator.share === "function",
    () => false,
  );

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
  const option = "flex items-center justify-center rounded-md border border-line px-3 py-2 text-sm font-semibold text-ink hover:border-ink-2";

  return (
    <>
      <button type="button" className="btn w-full" onClick={() => dialog.current?.showModal()}>
        <ShareIcon />
        Share this job
      </button>
      <dialog
        ref={dialog}
        aria-labelledby={`share-${jobId}`}
        className="m-auto max-h-[90dvh] w-[min(28rem,calc(100vw-2rem))] overflow-y-auto rounded-lg border border-line bg-surface p-0 text-ink shadow-[0_12px_40px_rgba(0,0,0,0.18)] backdrop:bg-black/40"
        // A click on the dark backdrop (outside the box) closes it.
        onClick={(e) => {
          if (e.target === e.currentTarget) e.currentTarget.close();
        }}
      >
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
          <h2 id={`share-${jobId}`} className="min-w-0 truncate font-semibold">
            Share {title}
          </h2>
          <button
            type="button"
            aria-label="Close"
            className="rounded px-2 py-0.5 text-xl leading-none text-muted hover:bg-sunken hover:text-ink"
            onClick={() => dialog.current?.close()}
          >
            ×
          </button>
        </div>

        <section className="px-5 py-4">
          <h3 className="mb-2 text-sm font-semibold">Send in a message</h3>
          {signedIn ? (
            <MessageForm jobId={jobId} recent={recent} placeholder="Add a message (optional)" compact showConversationLink />
          ) : (
            <p className="text-sm text-ink-2">
              <Link href={`/login?next=/jobs/${jobId}`} className="link font-semibold">
                Log in
              </Link>{" "}
              to send this job to someone on Shortlist.
            </p>
          )}
        </section>

        <section className="border-t border-line px-5 py-4">
          <h3 className="mb-2 text-sm font-semibold">Or share it another way</h3>
          <div className="grid grid-cols-2 gap-2">
            <a className={option} href={`mailto:?subject=${encodeURIComponent(`Job: ${title}`)}&body=${encodeURIComponent(message)}`}>
              Email
            </a>
            <button type="button" className={option} onClick={copy}>
              {copied ? "Link copied" : "Copy link"}
            </button>
            {links.map(([label, href]) => (
              <a key={label} className={option} href={href} target="_blank" rel="noreferrer">
                {label}
              </a>
            ))}
          </div>
          {canSystemShare && (
            <button
              type="button"
              className="mt-2 w-full rounded-md px-3 py-2 text-sm text-ink-2 hover:bg-sunken"
              onClick={() => navigator.share({ title: text, text: intro, url }).catch(() => {})}
            >
              More options…
            </button>
          )}
        </section>
      </dialog>
    </>
  );
}
