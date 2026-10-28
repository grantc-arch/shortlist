import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { turnOffEmails } from "@/lib/preferences";
import { EMAIL_KIND_LABELS, verifyUnsubscribe } from "@/lib/unsubscribe";

export const metadata: Metadata = { title: "Unsubscribe", robots: { index: false } };

type Params = { u?: string; k?: string; t?: string; done?: string };

async function confirm(form: FormData) {
  "use server";
  const params = { u: String(form.get("u") ?? ""), k: String(form.get("k") ?? ""), t: String(form.get("t") ?? "") };
  const link = verifyUnsubscribe(params);
  if (!link) redirect("/unsubscribe");
  await turnOffEmails(link.userId, link.kind);
  redirect(`/unsubscribe?${new URLSearchParams({ ...params, done: "1" })}`);
}

export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const link = verifyUnsubscribe(params);

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-3xl font-bold">Unsubscribe</h1>
      {!link ? (
        <p className="mt-3 text-ink-2">
          This link isn't valid. It may have been cut short by your email app. You can change every email setting from{" "}
          <Link href="/settings" className="link">your settings</Link> once you've logged in.
        </p>
      ) : params.done ? (
        <>
          <p role="status" className="mt-4 rounded-md border border-good/30 bg-good/10 px-4 py-3 text-good">
            Done. You won't get {EMAIL_KIND_LABELS[link.kind].split(" (")[0]} any more.
          </p>
          <p className="mt-4 text-ink-2">
            Changed your mind? Turn them back on in <Link href="/settings" className="link">your settings</Link>.
          </p>
        </>
      ) : (
        // A button rather than unsubscribing on page load, because some email apps open links to scan them.
        <form action={confirm} className="mt-4">
          <p className="text-ink-2">Stop {EMAIL_KIND_LABELS[link.kind]}?</p>
          <input type="hidden" name="u" value={params.u} />
          <input type="hidden" name="k" value={params.k} />
          <input type="hidden" name="t" value={params.t} />
          <button className="btn btn-primary mt-4">Unsubscribe</button>
        </form>
      )}
    </div>
  );
}
