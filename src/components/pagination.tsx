import Link from "next/link";
import { pageNumbers } from "@/lib/pagination";

/** Previous / numbered pages / Next. `hrefFor` builds the link for a page, keeping the other filters. */
export function Pagination({ page, pages, hrefFor }: { page: number; pages: number; hrefFor: (page: number) => string }) {
  if (pages <= 1) return null;
  const edge = "rounded-md border border-line px-3 py-1.5 text-sm font-semibold";
  return (
    <nav aria-label="Pages" className="mt-6 flex flex-wrap items-center justify-center gap-1.5">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className={`${edge} hover:border-ink-2`} rel="prev">
          Previous
        </Link>
      ) : (
        <span className={`${edge} text-muted opacity-60`} aria-hidden>
          Previous
        </span>
      )}
      {pageNumbers(page, pages).map((n, i) =>
        n === "gap" ? (
          <span key={`gap-${i}`} className="px-1 text-muted" aria-hidden>
            …
          </span>
        ) : (
          <Link
            key={n}
            href={hrefFor(n)}
            aria-label={`Page ${n}`}
            aria-current={n === page ? "page" : undefined}
            className={`num min-w-9 rounded-md px-2.5 py-1.5 text-center text-sm font-semibold ${
              n === page ? "bg-ink text-bg" : "text-ink-2 hover:bg-sunken hover:text-ink"
            }`}
          >
            {n}
          </Link>
        ),
      )}
      {page < pages ? (
        <Link href={hrefFor(page + 1)} className={`${edge} hover:border-ink-2`} rel="next">
          Next
        </Link>
      ) : (
        <span className={`${edge} text-muted opacity-60`} aria-hidden>
          Next
        </span>
      )}
    </nav>
  );
}
