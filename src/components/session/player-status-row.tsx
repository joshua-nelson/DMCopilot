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

function abilityMod(score: number | null | undefined): number | null {
  if (score === null || score === undefined) return null;
  if (!Number.isFinite(score)) return null;
  return Math.floor((score - 10) / 2);
}

function displayNumber(value: number | null | undefined) {
  return value === null || value === undefined ? "—" : value;
}

function AbilityPill({ label, value }: { label: string; value: number | null | undefined }) {
  return (
    <div className="flex items-baseline justify-between rounded-[7px] border border-line-soft bg-bg-2 px-2 py-1">
      <span className="font-mono text-[10px] text-ink-3">{label}</span>
      <span className="font-mono text-[11px] text-ink-0">{displayNumber(value)}</span>
    </div>
  );
}

export function PlayerStatusRow({
  campaignId,
  characterId,
  name,
  hpCurrent,
  hpMax,
  ac,
  conditions,
  str,
  dex,
  con,
  int: intScore,
  wis,
  cha,
  speed,
}: {
  campaignId: string;
  characterId: string;
  name: string;
  hpCurrent: number | null;
  hpMax: number | null;
  ac: number | null;
  conditions: string[];
  str?: number | null;
  dex?: number | null;
  con?: number | null;
  int?: number | null;
  wis?: number | null;
  cha?: number | null;
  speed?: number | null;
}) {
  const ratio = hpRatio(hpCurrent, hpMax);
  const hpText =
    hpCurrent === null || hpMax === null ? "—" : `${hpCurrent} / ${hpMax}`;

  const shownConditions = (conditions ?? []).slice(0, 3);
  const extraCount = Math.max(
    0,
    (conditions ?? []).length - shownConditions.length,
  );

  const wisMod = abilityMod(wis);
  const passivePerception = wisMod === null ? null : 10 + wisMod;
  const allConditions = conditions ?? [];

  return (
    <details
      className="group relative min-w-[240px] shrink-0 border-r border-line-soft"
      title={name}
    >
      <summary className="flex cursor-pointer list-none items-center gap-3 px-[18px] py-2 [&::-webkit-details-marker]:hidden">
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
      </summary>

      <div className="absolute inset-x-0 bottom-[calc(100%+8px)] z-20 px-[18px]">
        <div className="rounded-[var(--radius-sm)] border border-line-soft bg-bg-1 p-3 shadow-lg">
          <div className="grid grid-cols-3 gap-2">
            <AbilityPill label="STR" value={str} />
            <AbilityPill label="DEX" value={dex} />
            <AbilityPill label="CON" value={con} />
            <AbilityPill label="INT" value={intScore} />
            <AbilityPill label="WIS" value={wis} />
            <AbilityPill label="CHA" value={cha} />
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="flex items-baseline justify-between rounded-[7px] border border-line-soft bg-bg-2 px-2 py-1">
              <span className="font-mono text-[10px] text-ink-3">Speed</span>
              <span className="font-mono text-[11px] text-ink-0">
                {speed === null || speed === undefined ? "—" : `${speed}`}
              </span>
            </div>
            <div className="flex items-baseline justify-between rounded-[7px] border border-line-soft bg-bg-2 px-2 py-1">
              <span className="font-mono text-[10px] text-ink-3">Passive</span>
              <span className="font-mono text-[11px] text-ink-0">
                {passivePerception === null ? "—" : passivePerception}
              </span>
            </div>
          </div>

          <div className="mt-2">
            <div className="mb-1 font-mono text-[10px] text-ink-3">
              Conditions
            </div>
            {allConditions.length ? (
              <div className="flex flex-wrap gap-1">
                {allConditions.map((c, idx) => (
                  <span
                    key={`${c}-${idx}`}
                    className="rounded-full border border-line-soft bg-bg-2 px-2 py-0.5 font-mono text-[10px] text-ink-2"
                  >
                    {c}
                  </span>
                ))}
              </div>
            ) : (
              <div className="font-mono text-[10px] text-ink-2">None</div>
            )}
          </div>

          <div className="mt-2">
            <Link
              href={`/dashboard/campaigns/${campaignId}/characters/${characterId}`}
              className="text-[11px] text-ink-2 underline hover:text-ink-0"
            >
              Open character
            </Link>
          </div>
        </div>
      </div>
    </details>
  );
}
