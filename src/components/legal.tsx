import Link from "next/link";
import { contactEmail } from "@/lib/site";

export const LEGAL_UPDATED = "31 October 2026";

/** Shared layout for the privacy policy and terms: readable width, numbered sections. */
export function LegalPage({ title, intro, children }: { title: string; intro: React.ReactNode; children: React.ReactNode }) {
  return (
    <article className="legal mx-auto max-w-prose">
      <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
      <p className="mt-1 text-sm text-muted">Last updated {LEGAL_UPDATED}</p>
      <div className="mt-6 text-ink-2">{intro}</div>
      {children}
      <p className="mt-10 border-t border-line pt-4 text-sm text-muted">
        See also the <Link href="/privacy" className="link">privacy policy</Link> and the{" "}
        <Link href="/terms" className="link">terms of use</Link>.
      </p>
    </article>
  );
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-xl font-semibold text-ink">{title}</h2>
      <div className="mt-2 space-y-3 text-ink-2">{children}</div>
    </section>
  );
}

export function List({ children }: { children: React.ReactNode }) {
  return <ul className="list-disc space-y-1.5 pl-5 marker:text-muted">{children}</ul>;
}

/** The contact email as a link, or a fallback sentence if none is set. */
export function Contact() {
  const email = contactEmail();
  return email ? (
    <a href={`mailto:${email}`} className="link">
      {email}
    </a>
  ) : (
    <span>the email address our emails come from</span>
  );
}
