"use client";

import { useOptimistic, useTransition } from "react";
import { rateApplication } from "@/app/actions/employer";

const STAR = "M8 1.6l1.95 3.95 4.36.64-3.16 3.08.75 4.34L8 11.56l-3.9 2.05.75-4.34L1.69 6.19l4.36-.64L8 1.6z";

function Star({ filled, className = "size-5" }: { filled: boolean; className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className={className}>
      <path d={STAR} fill={filled ? "#d39d3c" : "none"} stroke={filled ? "#d39d3c" : "#a3a3a3"} strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}

/** The employer's private 1 to 5 star rating. Pressing the current rating again clears it. */
export function StarRating({ applicationId, rating }: { applicationId: string; rating: number | null }) {
  const [current, setCurrent] = useOptimistic(rating ?? 0);
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex items-center gap-2">
      <div role="group" aria-label="Your rating" className="relative z-10 flex">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-pressed={current === n}
            aria-label={`${n} star${n === 1 ? "" : "s"}`}
            disabled={pending}
            className="rounded p-0.5 hover:bg-sunken"
            onClick={() =>
              startTransition(async () => {
                const next = current === n ? 0 : n;
                setCurrent(next);
                await rateApplication(applicationId, next);
              })
            }
          >
            <Star filled={n <= current} />
          </button>
        ))}
      </div>
      <span className="text-sm text-muted">{current ? `${current} of 5` : "Not rated"}</span>
    </div>
  );
}

/** A read-only row of stars for lists. */
export function Stars({ rating }: { rating: number | null }) {
  if (!rating) return null;
  return (
    <span className="inline-flex items-center" role="img" aria-label={`Rated ${rating} of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} filled={n <= rating} className="size-3.5" />
      ))}
    </span>
  );
}
