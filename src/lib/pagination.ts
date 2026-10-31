/** Page sizes people can pick on the job board. */
export const PER_PAGE_OPTIONS = [16, 32, 64] as const;
export const DEFAULT_PER_PAGE = 16;

export function parsePerPage(value: string | undefined): number {
  const n = Number(value);
  return (PER_PAGE_OPTIONS as readonly number[]).includes(n) ? n : DEFAULT_PER_PAGE;
}

/** Which slice of `total` items to show. Out-of-range pages snap to the first or last page. */
export function paginate(total: number, page: unknown, perPage: number) {
  const pages = Math.max(1, Math.ceil(total / perPage));
  const requested = Math.floor(Number(page));
  const current = Number.isFinite(requested) ? Math.min(Math.max(requested, 1), pages) : 1;
  const start = (current - 1) * perPage;
  return { page: current, pages, start, end: Math.min(start + perPage, total) };
}

/**
 * Page numbers to show as links: always the first and last, and the pages either side of
 * the current one, with "gap" where pages are skipped (1 … 4 5 6 … 20).
 */
export function pageNumbers(current: number, pages: number): (number | "gap")[] {
  const keep = new Set([1, pages, current - 1, current, current + 1].filter((n) => n >= 1 && n <= pages));
  // Show a single hidden page instead of a gap: 1 2 3 rather than 1 … 3.
  if (keep.has(3)) keep.add(2);
  if (keep.has(pages - 2)) keep.add(pages - 1);
  const sorted = [...keep].sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) out.push("gap");
    out.push(n);
  });
  return out;
}
