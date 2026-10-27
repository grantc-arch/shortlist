import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getSession } from "@/lib/auth";
import { isUuid } from "@/lib/queries";

/**
 * Serves a candidate's CV. Only the candidate themself, or an employer they
 * have applied to, can download it.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ candidateId: string }> }) {
  const { candidateId } = await params;
  const session = await getSession();
  if (!session) return new Response("Log in to view this CV.", { status: 401 });
  if (!isUuid(candidateId)) return new Response("Not found", { status: 404 });

  let allowed = session.userId === candidateId;
  if (!allowed && session.role === "employer") {
    const [link] = await db
      .select({ id: schema.applications.id })
      .from(schema.applications)
      .innerJoin(schema.jobs, eq(schema.jobs.id, schema.applications.jobId))
      .where(and(eq(schema.applications.candidateId, candidateId), eq(schema.jobs.employerId, session.userId)))
      .limit(1);
    allowed = !!link;
  }
  if (!allowed) return new Response("You don't have access to this CV.", { status: 403 });

  const [cv] = await db
    .select({ name: schema.candidates.cvFileName, data: schema.candidates.cvData })
    .from(schema.candidates)
    .where(eq(schema.candidates.userId, candidateId));
  if (!cv?.data) return new Response("No CV uploaded.", { status: 404 });

  const filename = (cv.name ?? "cv.pdf").replace(/[^\w.\- ]/g, "_");
  return new Response(new Uint8Array(cv.data), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
