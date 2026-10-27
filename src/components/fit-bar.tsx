import type { CriterionResult, MatchResult } from "@/lib/matching";

/**
 * The match score, drawn as one bar split into the job's five criteria.
 * Each lane's width is the employer's weight for that criterion; how much of
 * the lane is filled is how well the candidate meets it. The empty space is
 * exactly where the points were lost.
 */
export function FitBar({ criteria, size = "md" }: { criteria: CriterionResult[]; size?: "sm" | "md" | "lg" }) {
  const total = criteria.reduce((s, c) => s + c.weight, 0) || 1;
  const h = size === "lg" ? "h-4" : size === "sm" ? "h-2" : "h-3";
  return (
    <div
      className={`flex w-full gap-[3px] ${h}`}
      role="img"
      aria-label={criteria.map((c) => `${c.label}: ${Math.round(c.fraction * 100)}%`).join(", ")}
    >
      {criteria
        .filter((c) => c.weight > 0)
        .map((c) => (
          <div
            key={c.key}
            title={`${c.label}: ${c.detail}`}
            className="relative overflow-hidden rounded-[2px]"
            style={{
              flexBasis: `${(c.weight / total) * 100}%`,
              background: `color-mix(in srgb, var(--fit-${c.key}) 18%, transparent)`,
            }}
          >
            <div
              className="fit-fill absolute inset-y-0 left-0"
              style={{ width: `${c.fraction * 100}%`, background: `var(--fit-${c.key})` }}
            />
          </div>
        ))}
    </div>
  );
}

export function ScoreNumber({ total, className = "" }: { total: number; className?: string }) {
  return (
    <span className={`num font-bold tracking-tight ${className}`}>
      {total}
      <span className="text-[0.55em] font-semibold text-muted">%</span>
    </span>
  );
}

/** Score + bar + per-criterion reasons. Used on job pages and applicant views. */
export function FitBreakdown({ match, heading }: { match: MatchResult; heading?: string }) {
  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <h3 className="text-base font-semibold">{heading ?? "Match"}</h3>
        <ScoreNumber total={match.total} className="text-3xl" />
      </div>
      <FitBar criteria={match.criteria} size="lg" />
      <ul className="mt-4 space-y-2.5">
        {match.criteria.map((c) => (
          <li key={c.key} className="grid grid-cols-[0.75rem_1fr_auto] items-start gap-x-2.5 text-sm">
            <span className="mt-1.5 size-2.5 rounded-[2px]" style={{ background: `var(--fit-${c.key})` }} />
            <span>
              <span className="font-semibold">{c.label}</span>
              <span className="text-muted"> ({c.weight}% weight)</span>
              <span className="block text-ink-2">{c.detail}</span>
            </span>
            <span className="num text-ink-2">
              {Math.round(c.points)}/{Math.round((c.weight / match.criteria.reduce((s, x) => s + x.weight, 0)) * 100)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
