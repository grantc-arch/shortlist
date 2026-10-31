import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { blockedBetween, conversationBetween, findPersonByUsername, markRead, threadMessages } from "@/lib/messaging";
import { normaliseUsername } from "@/lib/usernames";
import { isAcceptingApplications } from "@/lib/jobs";
import { MessageForm } from "@/components/message-form";
import { AutoRefresh } from "@/components/auto-refresh";
import { blockUser, unblockUser } from "@/app/actions/messages";

export const metadata: Metadata = { title: "Conversation", robots: { index: false } };

const when = (d: Date) =>
  d.toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export default async function ConversationPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const session = await requireUser(`/messages/${username}`);
  const person = await findPersonByUsername(normaliseUsername(decodeURIComponent(username)));
  if (!person || person.id === session.userId) notFound();

  const conversation = await conversationBetween(session.userId, person.id);
  if (conversation) await markRead(conversation.id, session.userId);
  const thread = conversation ? await threadMessages(conversation.id) : [];
  const block = await blockedBetween(session.userId, person.id);

  return (
    <div className="mx-auto max-w-2xl">
      <AutoRefresh />
      <Link href="/messages" className="text-sm text-muted hover:text-ink">
        All messages
      </Link>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">{person.name}</h1>
          <p className="text-ink-2">@{person.username}</p>
        </div>
        <form action={block.byMe ? unblockUser : blockUser}>
          <input type="hidden" name="username" value={person.username} />
          <button className="btn py-1.5 text-sm">{block.byMe ? "Unblock" : "Block"}</button>
        </form>
      </div>

      {thread.length === 0 ? (
        <p className="py-10 text-center text-ink-2">No messages yet. Say hello below.</p>
      ) : (
        <ol className="space-y-3 py-6" aria-label="Messages">
          {thread.map(({ message: m, job, companyName }) => {
            const mine = m.senderId === session.userId;
            return (
              <li key={m.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
                <div className={`max-w-[85%] rounded-lg px-3.5 py-2.5 ${mine ? "bg-ink text-bg" : "bg-sunken text-ink"}`}>
                  {job && (
                    <Link
                      href={`/jobs/${job.id}`}
                      className={`mb-1.5 block rounded-md border px-3 py-2 ${mine ? "border-white/25 hover:bg-white/10" : "border-line bg-surface hover:border-ink-2"}`}
                    >
                      <span className={`block text-xs ${mine ? "text-white/70" : "text-muted"}`}>
                        {isAcceptingApplications(job) ? "Job" : "Job (closed)"}
                      </span>
                      <span className="block font-semibold">{job.title}</span>
                      <span className={`block text-sm ${mine ? "text-white/80" : "text-ink-2"}`}>
                        {companyName}, {job.city}
                      </span>
                    </Link>
                  )}
                  {m.body && <p className="whitespace-pre-line break-words">{m.body}</p>}
                </div>
                <span className="mt-0.5 text-xs text-muted">
                  {when(m.createdAt)}
                  {mine && m.readAt ? " · Seen" : ""}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      {block.byMe ? (
        <p className="box p-4 text-sm text-ink-2">You've blocked @{person.username}. Unblock them to send messages.</p>
      ) : block.byThem ? (
        <p className="box p-4 text-sm text-ink-2">You can't reply to this conversation.</p>
      ) : (
        <div className="border-t border-line pt-4">
          <MessageForm to={person.username} placeholder={`Message ${person.name}`} />
          <p className="mt-1 text-xs text-muted">Ctrl + Enter to send. Never share bank details or pay anyone to apply for a job.</p>
        </div>
      )}
    </div>
  );
}
