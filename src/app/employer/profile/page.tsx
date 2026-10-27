import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { getEmployer } from "@/lib/queries";
import { CompanyForm } from "./company-form";
import { DeleteAccount } from "@/components/delete-account";

export const metadata: Metadata = { title: "Company details" };

export default async function EmployerProfilePage() {
  const session = await requireRole("employer", "/employer/profile");
  const employer = (await getEmployer(session.userId))!;
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-3xl font-bold sm:text-4xl">Company details</h1>
      <p className="mt-2 text-ink-2">Shown on every job you post.</p>
      <CompanyForm employer={employer} />
      <DeleteAccount what="your company, every job you've posted and all applications to them" />
    </div>
  );
}
