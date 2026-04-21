"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
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
    <div className="space-y-2">
      <div className="text-sm font-medium">Phase</div>
      <div className="flex flex-wrap gap-2">
        {PHASES.map((p) => {
          const active = p.value === phase;
          return (
            <Button
              key={p.value}
              type="button"
              variant={active ? "default" : "outline"}
              disabled={disabled || pending}
              className={cn(active ? "" : "opacity-90")}
              onClick={() => onSelect(p.value)}
            >
              {p.label}
            </Button>
          );
        })}
      </div>
      {error ? <div className="text-sm text-destructive">{error}</div> : null}
    </div>
  );
}
