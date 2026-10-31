"use client";

import { useState } from "react";

function ShareIcon() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 10V2.5M5 5.5l3-3 3 3M3.5 8.5v4.25c0 .41.34.75.75.75h7.5c.41 0 .75-.34.75-.75V8.5" />
    </svg>
  );
}

/**
 * Share a job with friends. Phones open their own share menu (WhatsApp, Instagram, Messages...);
 * elsewhere a small menu offers copy link, WhatsApp, LinkedIn and email.
 */
export function ShareButton({ url, title, company }: { url: string; title: string; company: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const text = `${title} at ${company}, on Shortlist`;
  const message = `Thought you might like this job: ${text}. ${url}`;

  async function share() {
    if (typeof navigator.share === "function" && window.matchMedia("(pointer: coarse)").matches) {
      try {
        await navigator.share({ title: text, text: `Thought you might like this job: ${text}`, url });
        return;
      } catch (err) {
        // Closing the share sheet isn't an error; anything else falls back to the menu.
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    }
    setOpen((o) => !o);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link:", url);
    }
  }

  const item = "block w-full px-3 py-2 text-left text-sm text-ink hover:bg-sunken";
  return (
    <div
      className="relative inline-block"
      // Clicking or tabbing anywhere outside the menu closes it.
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <button type="button" className="btn py-1.5" aria-expanded={open} aria-haspopup="menu" onClick={share}>
        <ShareIcon />
        Share
      </button>
      {open && (
        <div
          role="menu"
          className="absolute left-0 z-20 mt-1 w-52 overflow-hidden rounded-md border border-line bg-surface py-1 shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        >
          <button type="button" role="menuitem" className={item} onClick={copy}>
            {copied ? "Link copied" : "Copy link"}
          </button>
          <a role="menuitem" className={item} target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(message)}`}>
            WhatsApp
          </a>
          <a
            role="menuitem"
            className={item}
            target="_blank"
            rel="noreferrer"
            href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`}
          >
            LinkedIn
          </a>
          <a role="menuitem" className={item} href={`mailto:?subject=${encodeURIComponent(`Job: ${title}`)}&body=${encodeURIComponent(message)}`}>
            Email
          </a>
        </div>
      )}
    </div>
  );
}
