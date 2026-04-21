"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import {
  setSessionPhase,
  type SessionPhase,
} from "@/app/(app)/dashboard/campaigns/[campaignId]/sessions/actions";

const PHASES: { value: SessionPhase; label: string }[] = [
  { value: "prep", label: "Prep" },
  { value: "exploration", label: "Exploration" },
  { value: "roleplay", label: "Roleplay" },
  { value: "combat", label: "Combat" },
];

export function SessionPhaseSwitcher({
  campaignId,
  sessionId,
  initialPhase,
  disabled,
}: {
  campaignId: string;
  sessionId: string;
  initialPhase: SessionPhase;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [phase, setPhase] = React.useState<SessionPhase>(initialPhase);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  React.useEffect(() => {
    setPhase(initialPhase);
  }, [initialPhase, sessionId]);

  function onSelect(next: SessionPhase) {
    if (disabled) return;
    if (next === phase) return;

    setError(null);
    startTransition(async () => {
      const result = await setSessionPhase(campaignId, sessionId, next);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPhase(next);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div
        role="tablist"
        aria-label="Session phase"
        className="inline-flex rounded-[8px] border border-line-soft bg-bg-1 p-[3px]"
      >
        {PHASES.map((p) => {
          const active = p.value === phase;
          return (
            <button
              key={p.value}
              type="button"
              role="tab"
              aria-selected={active}
              disabled={disabled || pending}
              onClick={() => onSelect(p.value)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-[6px] px-[11px] py-[5px] text-[12px] transition-colors",
                active
                  ? "bg-bg-3 text-ink-0 shadow-[inset_0_1px_0_oklch(1_0_0_/_0.03)]"
                  : "text-ink-2 hover:text-ink-0 disabled:opacity-50",
              )}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  active ? "bg-ember" : "bg-ink-4",
                )}
              />
              {p.label}
            </button>
          );
        })}
      </div>
      {error ? (
        <div className="text-[11px] text-bad">{error}</div>
      ) : null}
    </div>
  );
}
