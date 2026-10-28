import { and, eq, isNull, ne, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { getSession } from "@/lib/auth";
import { isUuid } from "@/lib/queries";

/**
 * Counts a view of a job listing. Sent once per browser tab by the job page, so refreshes,
 * the employer's own visits and search-engine crawlers aren't counted.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return new Response(null, { status: 404 });
  if (/bot|crawl|spider|slurp|preview|headless/i.test(request.headers.get("user-agent") ?? "")) {
    return new Response(null, { status: 204 });
  }
  const session = await getSession();
  await db
    .update(schema.jobs)
    .set({ views: sql`${schema.jobs.views} + 1` })
    .where(
      and(
        eq(schema.jobs.id, id),
        isNull(schema.jobs.hiddenAt),
        ...(session ? [ne(schema.jobs.employerId, session.userId)] : []),
      ),
    );
  return new Response(null, { status: 204 });
}
