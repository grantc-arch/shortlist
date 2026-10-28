import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { getCandidate } from "@/lib/queries";
import { ProfileForm } from "./profile-form";
import { DeleteAccount } from "@/components/delete-account";
import { autofillEnabled } from "@/lib/cv-autofill";

export const metadata: Metadata = { title: "Your profile" };

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ next?: string; welcome?: string }> }) {
  const session = await requireRole("candidate", "/candidate/profile");
  const { next, welcome } = await searchParams;
  const candidate = await getCandidate(session.userId);
  if (!candidate) throw new Error("Candidate profile missing");

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-3xl font-bold sm:text-4xl">{welcome ? "Set up your profile" : "Your profile"}</h1>
      <p className="mt-2 max-w-prose text-ink-2">
        Every job scores itself against this profile, so keep it accurate. Employers only see it when you apply to one of
        their jobs.
      </p>
      <ProfileForm candidate={candidate} next={next} autofill={autofillEnabled()} />
      <DeleteAccount what="your profile, CV and all your applications" />
    </div>
  );
}
