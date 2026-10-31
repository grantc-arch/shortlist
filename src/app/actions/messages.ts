"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getSession, requireUser } from "@/lib/auth";
import { isAcceptingApplications } from "@/lib/jobs";
import { getJob } from "@/lib/queries";
import { addMessage, blockedBetween, conversationBetween, findPersonByUsername, recentSending } from "@/lib/messaging";
import { normaliseUsername, usernameProblem } from "@/lib/usernames";

export type MessageState = { error?: string; sentTo?: string; sentAt?: number } | undefined;

const MAX_LENGTH = 2000;
const PER_HOUR = 60;
const NEW_PER_DAY = 30;

/** Sends a message to a username, optionally with a job attached. */
export async function sendMessage(_: MessageState, form: FormData): Promise<MessageState> {
  const session = await getSession();
  if (!session) return { error: "Log in to send messages." };
  const username = normaliseUsername(String(form.get("to") ?? ""));
  if (!username) return { error: "Enter the username of the person to message." };
  const body = String(form.get("body") ?? "").trim();
  const jobId = String(form.get("jobId") ?? "") || null;
  if (body.length > MAX_LENGTH) return { error: `Keep messages under ${MAX_LENGTH.toLocaleString("en-ZA")} characters.` };
  if (!body && !jobId) return { error: "Write a message first." };

  const to = await findPersonByUsername(username);
  if (!to) return { error: `There's no one called @${username} on Shortlist. Check the spelling.` };
  if (to.id === session.userId) return { error: "That's your own username." };
  const block = await blockedBetween(session.userId, to.id);
  if (block.byMe) return { error: `You've blocked @${username}. Unblock them in your conversation to send messages.` };
  if (block.byThem) return { error: `You can't message @${username}.` };

  if (jobId) {
    const row = await getJob(jobId);
    if (!row || !isAcceptingApplications(row.job)) return { error: "That job isn't taking applications any more." };
  }

  const sending = await recentSending(session.userId);
  if (sending.lastHour >= PER_HOUR) return { error: "You've sent a lot of messages in the last hour. Try again a little later." };
  if (!(await conversationBetween(session.userId, to.id)) && sending.newToday >= NEW_PER_DAY) {
    return { error: `You can start ${NEW_PER_DAY} new conversations a day. Try again tomorrow.` };
  }

  await addMessage(session.userId, to.id, body, jobId);
  revalidatePath("/messages", "layout");
  return { sentTo: username, sentAt: Date.now() };
}

export async function blockUser(form: FormData) {
  const session = await requireUser();
  const person = await findPersonByUsername(normaliseUsername(String(form.get("username") ?? "")));
  if (!person || person.id === session.userId) return;
  await db.insert(schema.blocks).values({ blockerId: session.userId, blockedId: person.id }).onConflictDoNothing();
  revalidatePath("/messages", "layout");
}

export async function unblockUser(form: FormData) {
  const session = await requireUser();
  const person = await findPersonByUsername(normaliseUsername(String(form.get("username") ?? "")));
  if (!person) return;
  await db.delete(schema.blocks).where(and(eq(schema.blocks.blockerId, session.userId), eq(schema.blocks.blockedId, person.id)));
  revalidatePath("/messages", "layout");
}

export type UsernameState = { error?: string; saved?: boolean } | undefined;

/** Changes the signed-in account's username. */
export async function changeUsername(_: UsernameState, form: FormData): Promise<UsernameState> {
  const session = await requireUser("/settings");
  const username = normaliseUsername(String(form.get("username") ?? ""));
  const problem = usernameProblem(username);
  if (problem) return { error: problem };
  const taken = await db.query.users.findFirst({ where: eq(schema.users.username, username) });
  if (taken && taken.id !== session.userId) return { error: `@${username} is taken. Try another.` };
  await db.update(schema.users).set({ username }).where(eq(schema.users.id, session.userId));
  revalidatePath("/", "layout");
  return { saved: true };
}
