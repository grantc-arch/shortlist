import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getJob } from "@/lib/queries";
import { JobForm } from "../../job-form";

export const metadata: Metadata = { title: "Edit job" };

export default async function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireRole("employer", `/employer/jobs/${id}/edit`);
  const row = await getJob(id);
  if (!row || row.job.employerId !== session.userId) notFound();
  return (
    <div className="mx-auto max-w-3xl">
      <Link href={`/employer/jobs/${id}`} className="text-sm text-muted hover:text-ink">
        Back to applicants
      </Link>
      <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Edit {row.job.title}</h1>
      <p className="mt-2 max-w-prose text-ink-2">Changing requirements or weights re-ranks everyone who has already applied.</p>
      <JobForm job={row.job} defaultPlace={{ label: row.employer.city, lat: row.employer.lat, lng: row.employer.lng }} />
    </div>
  );
}
