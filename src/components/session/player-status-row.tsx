import Link from "next/link";

import { cn } from "@/lib/utils";

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function hpRatio(hpCurrent: number | null, hpMax: number | null): number | null {
  if (hpCurrent === null || hpMax === null) return null;
  if (!Number.isFinite(hpCurrent) || !Number.isFinite(hpMax) || hpMax <= 0)
    return null;
  return clamp01(hpCurrent / hpMax);
}

function hpFillClass(ratio: number) {
  if (ratio <= 0.25) return "bg-bad";
  if (ratio <= 0.5) return "bg-warn";
  return "bg-ok";
}

function portraitLetter(name: string) {
  const trimmed = name.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : "?";
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

  const shownConditions = (conditions ?? []).slice(0, 3);
  const extraCount = Math.max(
    0,
    (conditions ?? []).length - shownConditions.length,
  );

  return (
    <Link
      href={`/dashboard/campaigns/${campaignId}/characters/${characterId}`}
      className="group flex min-w-[240px] shrink-0 items-center gap-3 border-r border-line-soft px-[18px] py-2"
      title={name}
    >
      <div
        className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[7px] border border-line font-heading text-[16px]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, oklch(0.30 0.02 30) 0 3px, oklch(0.24 0.02 30) 3px 6px)",
          color: "oklch(0.85 0.04 30)",
        }}
      >
        {portraitLetter(name)}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-baseline justify-between">
          <span className="truncate text-[12px] font-medium text-ink-0 group-hover:underline">
            {name}
          </span>
          <span className="whitespace-nowrap font-mono text-[10.5px] text-ink-3">
            AC {ac === null ? "—" : ac}
          </span>
        </div>

        <div className="relative mt-[5px] h-1 overflow-hidden rounded-full bg-bg-3">
          {ratio === null ? null : (
            <div
              className={cn(
                "absolute inset-y-0 left-0 rounded-full",
                hpFillClass(ratio),
              )}
              style={{ width: `${Math.round(ratio * 100)}%` }}
            />
          )}
        </div>

        <div className="mt-1 flex items-center justify-between">
          <span className="font-mono text-[10.5px] text-ink-2">{hpText}</span>
          {shownConditions.length ? (
            <div className="flex gap-[3px]">
              {shownConditions.map((c, idx) => (
                <span
                  key={`${c}-${idx}`}
                  className="grid h-[14px] min-w-[14px] place-items-center rounded-[3px] border border-line bg-bg-3 px-1 font-mono text-[9px] text-ink-2"
                  title={c}
                >
                  {c.slice(0, 2)}
                </span>
              ))}
              {extraCount ? (
                <span className="grid h-[14px] min-w-[14px] place-items-center rounded-[3px] border border-line bg-bg-3 px-1 font-mono text-[9px] text-ink-2">
                  +{extraCount}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
