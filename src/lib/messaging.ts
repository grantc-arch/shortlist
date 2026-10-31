import "server-only";
import { aliasedTable, and, asc, count, desc, eq, gt, inArray, isNull, ne, or, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { usernameFromName } from "./usernames";

const { users, candidates, employers, conversations, messages, blocks, jobs } = schema;

/** Conversations store the pair in a fixed order, so each pair has exactly one. */
const pair = (a: string, b: string): [string, string] => (a < b ? [a, b] : [b, a]);

/** A free username based on `base`: base, base_2 ... base_9, then base with four random digits. */
export async function uniqueUsername(base: string): Promise<string> {
  const stem = base.slice(0, 15);
  const tries = [stem, ...Array.from({ length: 8 }, (_, i) => `${stem}_${i + 2}`)];
  for (const name of tries) {
    if (!(await db.query.users.findFirst({ where: eq(users.username, name) }))) return name;
  }
  return `${stem}_${Math.floor(1000 + Math.random() * 9000)}`;
}

export const usernameForName = (name: string) => uniqueUsername(usernameFromName(name));

/** What other people see of an account in messages: never the email address. */
export interface Person {
  id: string;
  username: string;
  name: string;
}

const personColumns = {
  id: users.id,
  username: sql<string>`coalesce(${users.username}, '')`,
  name: sql<string>`coalesce(${candidates.fullName}, ${employers.companyName}, ${users.username}, 'Someone')`,
};

export async function findPersonByUsername(username: string): Promise<Person | null> {
  const [row] = await db
    .select(personColumns)
    .from(users)
    .leftJoin(candidates, eq(candidates.userId, users.id))
    .leftJoin(employers, eq(employers.userId, users.id))
    .where(eq(users.username, username));
  return row ?? null;
}

export async function personById(id: string): Promise<Person | null> {
  const [row] = await db
    .select(personColumns)
    .from(users)
    .leftJoin(candidates, eq(candidates.userId, users.id))
    .leftJoin(employers, eq(employers.userId, users.id))
    .where(eq(users.id, id));
  return row ?? null;
}

/** Whether either person has blocked the other. */
export async function blockedBetween(a: string, b: string): Promise<{ byMe: boolean; byThem: boolean }> {
  const rows = await db
    .select({ blockerId: blocks.blockerId })
    .from(blocks)
    .where(
      or(and(eq(blocks.blockerId, a), eq(blocks.blockedId, b)), and(eq(blocks.blockerId, b), eq(blocks.blockedId, a))),
    );
  return { byMe: rows.some((r) => r.blockerId === a), byThem: rows.some((r) => r.blockerId === b) };
}

export async function conversationBetween(a: string, b: string) {
  const [x, y] = pair(a, b);
  return (await db.query.conversations.findFirst({ where: and(eq(conversations.userA, x), eq(conversations.userB, y)) })) ?? null;
}

/** Adds a message, starting the conversation if this is the first one. */
export async function addMessage(from: string, to: string, body: string, jobId: string | null) {
  const [x, y] = pair(from, to);
  const now = new Date();
  const [conversation] = await db
    .insert(conversations)
    .values({ userA: x, userB: y, lastMessageAt: now })
    .onConflictDoUpdate({ target: [conversations.userA, conversations.userB], set: { lastMessageAt: now } })
    .returning();
  await db.insert(messages).values({ conversationId: conversation.id, senderId: from, body, jobId, createdAt: now });
  return conversation;
}

/** Messages sent in the last hour, and new conversations written in today, for rate limits. */
export async function recentSending(userId: string) {
  const since = (ms: number) => new Date(Date.now() - ms);
  const [{ lastHour }] = await db
    .select({ lastHour: count() })
    .from(messages)
    .where(and(eq(messages.senderId, userId), gt(messages.createdAt, since(3_600_000))));
  const [{ newToday }] = await db
    .select({ newToday: sql<number>`count(distinct ${conversations.id})::int` })
    .from(conversations)
    .innerJoin(messages, eq(messages.conversationId, conversations.id))
    .where(and(eq(messages.senderId, userId), gt(conversations.createdAt, since(86_400_000))));
  return { lastHour, newToday };
}

/** Unread messages across all conversations, for the badge in the menu. */
export async function unreadCount(userId: string): Promise<number> {
  const [{ n }] = await db
    .select({ n: count() })
    .from(messages)
    .innerJoin(conversations, eq(conversations.id, messages.conversationId))
    .where(
      and(
        or(eq(conversations.userA, userId), eq(conversations.userB, userId)),
        ne(messages.senderId, userId),
        isNull(messages.readAt),
      ),
    );
  return n;
}

/** Everyone this user has a conversation with, most recent first, with the last message and unread count. */
export async function inbox(userId: string) {
  const other = aliasedTable(users, "other");
  const otherCandidate = aliasedTable(candidates, "other_candidate");
  const otherEmployer = aliasedTable(employers, "other_employer");
  const rows = await db
    .select({
      conversationId: conversations.id,
      lastMessageAt: conversations.lastMessageAt,
      person: {
        id: other.id,
        username: sql<string>`coalesce(${other.username}, '')`,
        name: sql<string>`coalesce(${otherCandidate.fullName}, ${otherEmployer.companyName}, ${other.username}, 'Someone')`,
      },
    })
    .from(conversations)
    .innerJoin(
      other,
      sql`${other.id} = case when ${conversations.userA} = ${userId} then ${conversations.userB} else ${conversations.userA} end`,
    )
    .leftJoin(otherCandidate, eq(otherCandidate.userId, other.id))
    .leftJoin(otherEmployer, eq(otherEmployer.userId, other.id))
    .where(or(eq(conversations.userA, userId), eq(conversations.userB, userId)))
    .orderBy(desc(conversations.lastMessageAt));
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.conversationId);
  const latest = await db
    .selectDistinctOn([messages.conversationId], {
      conversationId: messages.conversationId,
      body: messages.body,
      senderId: messages.senderId,
      jobTitle: jobs.title,
    })
    .from(messages)
    .leftJoin(jobs, eq(jobs.id, messages.jobId))
    .where(inArray(messages.conversationId, ids))
    .orderBy(messages.conversationId, desc(messages.createdAt));
  const unread = await db
    .select({ conversationId: messages.conversationId, n: count() })
    .from(messages)
    .where(and(inArray(messages.conversationId, ids), ne(messages.senderId, userId), isNull(messages.readAt)))
    .groupBy(messages.conversationId);
  return rows.map((r) => ({
    ...r,
    last: latest.find((l) => l.conversationId === r.conversationId) ?? null,
    unread: unread.find((u) => u.conversationId === r.conversationId)?.n ?? 0,
  }));
}

/** The messages in one conversation, oldest first, with any job sent in them. */
export async function threadMessages(conversationId: string) {
  return db
    .select({
      message: messages,
      job: { id: jobs.id, title: jobs.title, city: jobs.city, status: jobs.status, closesOn: jobs.closesOn, hiddenAt: jobs.hiddenAt },
      companyName: employers.companyName,
    })
    .from(messages)
    .leftJoin(jobs, eq(jobs.id, messages.jobId))
    .leftJoin(employers, eq(employers.userId, jobs.employerId))
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.createdAt))
    .limit(500);
}

/** Marks the other person's messages in a conversation as read. */
export async function markRead(conversationId: string, userId: string) {
  await db
    .update(messages)
    .set({ readAt: new Date() })
    .where(and(eq(messages.conversationId, conversationId), ne(messages.senderId, userId), isNull(messages.readAt)));
}

/** Usernames of the people this user talks to most recently, for quick picking. */
export async function recentContacts(userId: string, limit = 8): Promise<string[]> {
  return (await inbox(userId)).slice(0, limit).map((r) => r.person.username).filter(Boolean);
}
