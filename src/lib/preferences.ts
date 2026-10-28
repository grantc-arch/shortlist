import "server-only";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import type { EmailKind } from "./unsubscribe";

/** Turns off one kind of email for an account (from an unsubscribe link). */
export async function turnOffEmails(userId: string, kind: EmailKind): Promise<void> {
  if (kind === "updates") {
    await db.update(schema.users).set({ emailUpdates: false }).where(eq(schema.users.id, userId));
  } else if (kind === "alerts") {
    await db.update(schema.candidates).set({ alertFrequency: "off" }).where(eq(schema.candidates.userId, userId));
  } else {
    await db.update(schema.candidates).set({ openToOffers: false }).where(eq(schema.candidates.userId, userId));
  }
}
