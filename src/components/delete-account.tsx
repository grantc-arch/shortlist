import { deleteAccount } from "@/app/actions/auth";

export function DeleteAccount({ what }: { what: string }) {
  return (
    <form action={deleteAccount} className="mt-12 border-t border-line pt-6">
      <h2 className="text-lg font-semibold">Delete your account</h2>
      <p className="mt-1 max-w-prose text-sm text-ink-2">This permanently removes {what}. It can't be undone.</p>
      <label className="mt-3 flex items-start gap-2.5 text-sm text-ink-2">
        <input type="checkbox" name="confirm" required className="mt-1 size-4 accent-[var(--bad)]" />
        <span>I understand my account and data will be deleted</span>
      </label>
      <button className="btn mt-3 border-bad/50 text-bad hover:border-bad">Delete my account</button>
    </form>
  );
}
