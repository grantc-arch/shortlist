import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { isUuid } from "@/lib/queries";
import { initialsSvg } from "@/lib/logos";

/**
 * A company's logo, or a tile with its initials if it hasn't uploaded one. Public, like
 * company pages. Links from the company's own pages add ?v= so a new logo shows at once;
 * everywhere else it can be up to a few minutes old.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return new Response("Not found", { status: 404 });
  const versioned = new URL(req.url).searchParams.has("v");
  const cache = versioned
    ? "public, max-age=31536000, immutable"
    : "public, max-age=300, s-maxage=300, stale-while-revalidate=86400";

  // Before the logos table exists (migration not run yet), every company gets its initials.
  const [logo] = await db
    .select({ data: schema.companyLogos.data, type: schema.companyLogos.contentType })
    .from(schema.companyLogos)
    .where(eq(schema.companyLogos.employerId, id))
    .catch(() => []);
  if (logo) {
    return new Response(new Uint8Array(logo.data), {
      headers: { "Content-Type": logo.type, "Cache-Control": cache, "X-Content-Type-Options": "nosniff" },
    });
  }

  const employer = await db.query.employers.findFirst({
    where: eq(schema.employers.userId, id),
    columns: { companyName: true },
  });
  if (!employer) return new Response("Not found", { status: 404 });
  return new Response(initialsSvg(employer.companyName, id), {
    headers: {
      "Content-Type": "image/svg+xml",
      // The tile is ours, but lock it down anyway: no scripts, nothing loaded.
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'",
      "Cache-Control": versioned ? cache : "public, max-age=300, s-maxage=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
