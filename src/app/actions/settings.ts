"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { getCandidate } from "@/lib/queries";
import { ALERT_SCORES } from "@/lib/constants";

export async function saveSettings(form: FormData) {
  const session = await requireUser("/settings");
  await db
    .update(schema.users)
    .set({ emailUpdates: form.get("emailUpdates") === "on" })
    .where(eq(schema.users.id, session.userId));

  if (session.role === "candidate") {
    const before = await getCandidate(session.userId);
    const frequency = form.get("alertFrequency");
    const alertFrequency = frequency === "daily" || frequency === "weekly" ? frequency : "off";
    const score = Number(form.get("alertMinScore"));
    await db
      .update(schema.candidates)
      .set({
        alertFrequency,
        alertMinScore: (ALERT_SCORES as readonly number[]).includes(score) ? score : 60,
        // Switching alerts on starts from the last day or week of jobs, rather than from whenever they were last off.
        ...(before?.alertFrequency === "off" && alertFrequency !== "off" ? { alertsCheckedAt: null } : {}),
        openToOffers: form.get("openToOffers") === "on",
      })
      .where(eq(schema.candidates.userId, session.userId));
  }
  revalidatePath("/", "layout");
  redirect("/settings?saved=1");
}
