import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getUser } from "@/lib/queries";
import { inbox } from "@/lib/messaging";
import { timeAgo } from "@/lib/format";
import { MessageForm } from "@/components/message-form";
import { AutoRefresh } from "@/components/auto-refresh";

export const metadata: Metadata = { title: "Messages", robots: { index: false } };

export default async function MessagesPage() {
  const session = await requireUser("/messages");
  const me = await getUser(session.userId);
  const conversations = await inbox(session.userId);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
      <AutoRefresh seconds={20} />
      <section className="min-w-0">
        <h1 className="text-3xl font-bold sm:text-4xl">Messages</h1>
        <p className="mt-1 text-ink-2">
          Your username is <span className="font-semibold text-ink">@{me?.username}</span>.{" "}
          <Link href="/settings#username" className="link">
            Change it
          </Link>
        </p>
        {conversations.length === 0 ? (
          <div className="box mt-6 p-6">
            <p className="font-semibold">No messages yet.</p>
            <p className="mt-1 text-ink-2">
              Start a conversation with someone's username, or send a job from its Share button.
            </p>
          </div>
        ) : (
          <ul className="list mt-6 divide-y divide-line">
            {conversations.map((c) => (
              <li key={c.conversationId} className="relative flex items-start gap-4 p-4 hover:bg-sunken/60">
                <span
                  aria-hidden
                  className="grid size-10 shrink-0 place-items-center rounded-full bg-sunken text-sm font-bold text-ink-2 uppercase"
                >
                  {c.person.name.slice(0, 1)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <Link
                      href={`/messages/${c.person.username}`}
                      className={`truncate after:absolute after:inset-0 hover:underline ${c.unread ? "font-bold" : "font-semibold"}`}
                    >
                      {c.person.name} <span className="font-normal text-muted">@{c.person.username}</span>
                    </Link>
                    <span className="shrink-0 text-xs text-muted">{timeAgo(c.lastMessageAt)}</span>
                  </div>
                  <p className={`truncate text-sm ${c.unread ? "text-ink" : "text-ink-2"}`}>
                    {c.last?.senderId === session.userId && <span className="text-muted">You: </span>}
                    {c.last?.body || (c.last?.jobTitle ? `Sent a job: ${c.last.jobTitle}` : "")}
                  </p>
                </div>
                {c.unread > 0 && (
                  <span className="num mt-1 rounded-full bg-ink px-2 py-0.5 text-xs font-bold text-bg">
                    {c.unread}
                    <span className="sr-only"> unread</span>
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
      <aside className="lg:sticky lg:top-6 lg:self-start">
        <div className="box p-5">
          <h2 className="font-semibold">New message</h2>
          <div className="mt-3">
            <MessageForm recent={conversations.slice(0, 8).map((c) => c.person.username)} showConversationLink />
          </div>
        </div>
      </aside>
    </div>
  );
}
