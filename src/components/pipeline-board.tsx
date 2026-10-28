"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { updateApplication } from "@/app/actions/employer";
import { STATUS_LABELS, STATUS_ORDER } from "@/lib/constants";
import type { ApplicationStatus } from "@/db/schema";
import type { CriterionResult } from "@/lib/matching";
import { FitBar, ScoreNumber } from "./fit-bar";
import { Stars } from "./star-rating";

export interface BoardCard {
  id: string;
  rank: number;
  name: string;
  href: string;
  total: number;
  criteria: CriterionResult[];
  mustHavesMet: boolean | null;
  rating: number | null;
  status: ApplicationStatus;
}

/**
 * Applicants as cards in one column per stage. Drag a card to another column, or use
 * its menu (which also works with a keyboard and on phones).
 */
export function PipelineBoard({ cards }: { cards: BoardCard[] }) {
  const [moves, addMove] = useOptimistic(
    {} as Record<string, ApplicationStatus>,
    (state, move: { id: string; status: ApplicationStatus }) => ({ ...state, [move.id]: move.status }),
  );
  const [, startTransition] = useTransition();
  const [over, setOver] = useState<ApplicationStatus | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const statusOf = (c: BoardCard) => moves[c.id] ?? c.status;

  function move(card: BoardCard, status: ApplicationStatus) {
    if (statusOf(card) === status) return;
    setAnnouncement(`Moved ${card.name} to ${STATUS_LABELS[status]}`);
    startTransition(async () => {
      addMove({ id: card.id, status });
      const data = new FormData();
      data.set("applicationId", card.id);
      data.set("status", status);
      await updateApplication(data);
    });
  }

  return (
    <div className="relative -mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
      <div className="grid min-w-[60rem] grid-cols-5 gap-3">
        {STATUS_ORDER.map((status) => {
          const column = cards.filter((c) => statusOf(c) === status);
          return (
            <section
              key={status}
              aria-label={STATUS_LABELS[status]}
              onDragOver={(e) => {
                e.preventDefault();
                setOver(status);
              }}
              onDragLeave={() => setOver((o) => (o === status ? null : o))}
              onDrop={(e) => {
                e.preventDefault();
                setOver(null);
                const card = cards.find((c) => c.id === e.dataTransfer.getData("text/plain"));
                if (card) move(card, status);
              }}
              className={`min-h-48 rounded-lg p-2 transition-colors ${over === status ? "bg-[color-mix(in_srgb,var(--ink)_10%,var(--sunken))]" : "bg-sunken"}`}
            >
              <h3 className="flex items-baseline justify-between px-1.5 pt-1 pb-2 text-sm font-semibold">
                {STATUS_LABELS[status]}
                <span className="num font-normal text-muted">{column.length}</span>
              </h3>
              <ul className="space-y-2">
                {column.map((card) => (
                  <li
                    key={card.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", card.id);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    className="cursor-grab rounded-md border border-line bg-surface p-3 shadow-[0_1px_0_rgba(0,0,0,0.04)] active:cursor-grabbing"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <Link href={card.href} className="min-w-0 font-semibold leading-snug break-words hover:underline">
                        <span className="num mr-1 text-muted">{card.rank}.</span>
                        {card.name}
                      </Link>
                      <ScoreNumber total={card.total} className="text-lg" />
                    </div>
                    <div className="mt-1.5">
                      <FitBar criteria={card.criteria} size="sm" />
                    </div>
                    <div className="mt-2 flex min-h-5 flex-wrap items-center justify-between gap-x-2 gap-y-1 text-xs">
                      {card.mustHavesMet ? (
                        <span className="text-good">Meets must-haves</span>
                      ) : (
                        <span className="text-warn">Missed a must-have</span>
                      )}
                      <Stars rating={card.rating} />
                    </div>
                    <label className="sr-only" htmlFor={`move-${card.id}`}>
                      Stage for {card.name}
                    </label>
                    <select
                      id={`move-${card.id}`}
                      value={statusOf(card)}
                      onChange={(e) => move(card, e.target.value as ApplicationStatus)}
                      className="input mt-2 py-1 text-xs"
                    >
                      {STATUS_ORDER.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
