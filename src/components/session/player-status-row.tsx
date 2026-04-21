import Link from "next/link";

import { cn } from "@/lib/utils";

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function hpRatio(hpCurrent: number | null, hpMax: number | null): number | null {
  if (hpCurrent === null || hpMax === null) return null;
  if (!Number.isFinite(hpCurrent) || !Number.isFinite(hpMax) || hpMax <= 0) return null;
  return clamp01(hpCurrent / hpMax);
}

function hpFillClass(ratio: number) {
  if (ratio <= 0.25) return "bg-red-500";
  if (ratio <= 0.5) return "bg-amber-500";
  return "bg-emerald-500";
}

export function PlayerStatusRow({
  campaignId,
  characterId,
  name,
  hpCurrent,
  hpMax,
  ac,
  conditions,
}: {
  campaignId: string;
  characterId: string;
  name: string;
  hpCurrent: number | null;
  hpMax: number | null;
  ac: number | null;
  conditions: string[];
}) {
  const ratio = hpRatio(hpCurrent, hpMax);
  const hpText =
    hpCurrent === null || hpMax === null ? "—" : `${hpCurrent} / ${hpMax}`;

  const shownConditions = (conditions ?? []).slice(0, 2);
  const extraCount = Math.max(0, (conditions ?? []).length - shownConditions.length);

  return (
    <div className="flex shrink-0 items-center gap-2 rounded-md border bg-card px-2 py-1">
      <Link
        href={`/dashboard/campaigns/${campaignId}/characters/${characterId}`}
        className="max-w-[140px] truncate text-xs font-medium hover:underline"
        title={name}
      >
        {name}
      </Link>

      <div className="flex items-center gap-2">
        <div className="w-16">
          <div className="h-2 overflow-hidden rounded bg-muted">
            {ratio === null ? (
              <div className="h-full w-full bg-muted" />
            ) : (
              <div
                className={cn("h-full", hpFillClass(ratio))}
                style={{ width: `${Math.round(ratio * 100)}%` }}
              />
            )}
          </div>
          <div className="mt-0.5 text-[10px] font-mono text-muted-foreground">
            {hpText}
          </div>
        </div>

        <div className="text-[10px] font-mono text-muted-foreground">
          AC: {ac === null ? "—" : ac}
        </div>
      </div>

      {shownConditions.length ? (
        <div className="flex items-center gap-1">
          {shownConditions.map((c, idx) => (
            <span
              key={`${c}-${idx}`}
              className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
              title={c}
            >
              {c}
            </span>
          ))}
          {extraCount ? (
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              +{extraCount}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
