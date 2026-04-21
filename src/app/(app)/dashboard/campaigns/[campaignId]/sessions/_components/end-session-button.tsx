"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { endSession } from "@/app/(app)/dashboard/campaigns/[campaignId]/sessions/actions";

export function EndSessionButton({
  campaignId,
  sessionId,
}: {
  campaignId: string;
  sessionId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function onClick() {
    if (!window.confirm("End this session? This will move it to history.")) {
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await endSession(campaignId, sessionId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/dashboard/campaigns/${campaignId}/sessions`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <Button type="button" variant="destructive" disabled={pending} onClick={onClick}>
        {pending ? "Ending…" : "End session"}
      </Button>
      {error ? <div className="text-sm text-destructive">{error}</div> : null}
    </div>
  );
}
