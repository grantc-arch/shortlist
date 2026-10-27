import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { getEmployer } from "@/lib/queries";
import { JobForm } from "../job-form";

export const metadata: Metadata = { title: "Post a job" };

export default async function NewJobPage() {
  const session = await requireRole("employer", "/employer/jobs/new");
  const employer = await getEmployer(session.userId);
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-bold sm:text-4xl">Post a job</h1>
      <p className="mt-2 max-w-prose text-ink-2">
        Your listing goes live on the job board straight away. Applicants are ranked using the requirements and weights
        you set below, and you can change them later.
      </p>
      <JobForm defaultCity={employer?.city ?? "Cape Town"} />
    </div>
  );
}
