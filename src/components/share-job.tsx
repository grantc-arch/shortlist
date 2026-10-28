"use client";

import { useState } from "react";

/** The job's public link, with one-click copy and share shortcuts for the places employers post jobs. */
export function ShareJob({ url, title, company }: { url: string; title: string; company: string }) {
  const [copied, setCopied] = useState(false);
  const text = `We're hiring: ${title} at ${company}. See how well you match and apply here: ${url}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked (e.g. plain http); select the text so it can be copied by hand.
      const input = document.getElementById("job-link") as HTMLInputElement | null;
      input?.select();
    }
  }

  return (
    <div>
      <label htmlFor="job-link" className="label">
        Link to this job
      </label>
      <div className="flex gap-2">
        <input id="job-link" readOnly value={url} className="input min-w-0 flex-1 text-sm" onFocus={(e) => e.target.select()} />
        <button type="button" className="btn" onClick={copy}>
          {copied ? "Copied" : "Copy link"}
        </button>
      </div>
      <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <a
          className="link"
          target="_blank"
          rel="noreferrer"
          href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`}
        >
          Share on LinkedIn
        </a>
        <a className="link" target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(text)}`}>
          Share on WhatsApp
        </a>
        <a
          className="link"
          href={`mailto:?subject=${encodeURIComponent(`Job opening: ${title}`)}&body=${encodeURIComponent(text)}`}
        >
          Email it
        </a>
      </p>
    </div>
  );
}
