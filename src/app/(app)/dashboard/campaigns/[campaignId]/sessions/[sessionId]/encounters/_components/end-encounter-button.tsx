"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { endEncounter } from "@/app/(app)/dashboard/campaigns/[campaignId]/sessions/[sessionId]/encounters/actions";

export function EndEncounterButton(props: {
  campaignId: string;
  sessionId: string;
  encounterId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function onClick() {
    if (!window.confirm("End this encounter? This will move it to history.")) {
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await endEncounter(
        props.campaignId,
        props.sessionId,
        props.encounterId,
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }

      router.push(
        `/dashboard/campaigns/${props.campaignId}/sessions/${props.sessionId}/encounters`,
      );
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <Button type="button" variant="destructive" disabled={pending} onClick={onClick}>
        {pending ? "Ending…" : "End encounter"}
      </Button>
      {error ? <div className="text-sm text-destructive">{error}</div> : null}
    </div>
  );
}
