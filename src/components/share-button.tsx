"use client";

import { useState } from "react";

function ShareIcon() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 10V2.5M5 5.5l3-3 3 3M3.5 8.5v4.25c0 .41.34.75.75.75h7.5c.41 0 .75-.34.75-.75V8.5" />
    </svg>
  );
}

/** Phones and tablets (touch, no mouse hover): touch-screen laptops still get the full menu. */
const isHandheld = () => window.matchMedia("(hover: none) and (pointer: coarse)").matches;

/**
 * Share a job. Phones and tablets open their own share sheet (WhatsApp, Instagram, Messages...);
 * computers get a menu of places to share it, plus the system share window where there is one.
 */
export function ShareButton({ url, title, company }: { url: string; title: string; company: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const text = `${title} at ${company}, on Shortlist`;
  const intro = `Thought you might like this job: ${text}`;
  const message = `${intro}. ${url}`;
  const u = encodeURIComponent(url);
  const canSystemShare = () => typeof navigator !== "undefined" && typeof navigator.share === "function";

  async function systemShare() {
    try {
      await navigator.share({ title: text, text: intro, url });
      return true;
    } catch (err) {
      // Closing the share sheet isn't a failure.
      return err instanceof DOMException && err.name === "AbortError";
    }
  }

  async function onShare() {
    if (canSystemShare() && isHandheld() && (await systemShare())) return;
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

  const links: [string, string][] = [
    ["WhatsApp", `https://wa.me/?text=${encodeURIComponent(message)}`],
    ["Facebook", `https://www.facebook.com/sharer/sharer.php?u=${u}`],
    ["LinkedIn", `https://www.linkedin.com/sharing/share-offsite/?url=${u}`],
    ["X (Twitter)", `https://x.com/intent/post?text=${encodeURIComponent(intro)}&url=${u}`],
    ["Telegram", `https://t.me/share/url?url=${u}&text=${encodeURIComponent(intro)}`],
    ["Email", `mailto:?subject=${encodeURIComponent(`Job: ${title}`)}&body=${encodeURIComponent(message)}`],
  ];
  const item = "flex w-full items-center px-3 py-2 text-left text-sm text-ink hover:bg-sunken";

  return (
    <div
      className="relative"
      // Clicking or tabbing anywhere outside the menu closes it.
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <button type="button" className="btn w-full" aria-expanded={open} aria-haspopup="menu" onClick={onShare}>
        <ShareIcon />
        Share this job
      </button>
      {open && (
        <div
          role="menu"
          aria-label="Share this job"
          className="absolute inset-x-0 z-20 mt-1 overflow-hidden rounded-md border border-line bg-surface py-1 shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        >
          <button type="button" role="menuitem" className={`${item} font-semibold`} onClick={copy}>
            {copied ? "Link copied" : "Copy link"}
          </button>
          {links.map(([label, href]) => (
            <a
              key={label}
              role="menuitem"
              className={item}
              href={href}
              {...(href.startsWith("mailto:") ? {} : { target: "_blank", rel: "noreferrer" })}
            >
              {label}
            </a>
          ))}
          {canSystemShare() && (
            <button
              type="button"
              role="menuitem"
              className={`${item} border-t border-line text-ink-2`}
              onClick={async () => {
                if (await systemShare()) setOpen(false);
              }}
            >
              More options…
            </button>
          )}
        </div>
      )}
    </div>
  );
}
