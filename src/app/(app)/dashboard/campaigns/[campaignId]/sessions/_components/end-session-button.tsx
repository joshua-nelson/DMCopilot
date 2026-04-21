"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { endSession } from "@/app/(app)/dashboard/campaigns/[campaignId]/sessions/actions";
import { generateSessionSummary } from "@/app/(app)/dashboard/campaigns/[campaignId]/sessions/summary-actions";

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
  const [confirming, setConfirming] = React.useState(false);
  const [alsoGenerateSummary, setAlsoGenerateSummary] = React.useState(true);
  const confirmBtnRef = React.useRef<HTMLButtonElement | null>(null);

  React.useEffect(() => {
    if (!confirming) return;
    confirmBtnRef.current?.focus();
  }, [confirming]);

  function onStart() {
    setError(null);
    setConfirming(true);
    setAlsoGenerateSummary(true);
  }

  function onCancel() {
    if (pending) return;
    setError(null);
    setConfirming(false);
  }

  function onConfirm() {
    setError(null);
    startTransition(async () => {
      const ended = await endSession(campaignId, sessionId);
      if (!ended.ok) {
        setError(ended.error);
        return;
      }

      if (alsoGenerateSummary) {
        const summary = await generateSessionSummary(campaignId, sessionId);
        if (!summary.ok) {
          // Session is already ended; user can retry from the summary panel.
          setError(summary.error);
        }
      }

      setConfirming(false);
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      {!confirming ? (
        <Button type="button" variant="destructive" disabled={pending} onClick={onStart}>
          End session
        </Button>
      ) : (
        <div
          className="space-y-3 rounded-md border bg-background p-3"
          role="dialog"
          aria-label="End session confirmation"
          onKeyDown={(e) => {
            if (e.key === "Escape") onCancel();
          }}
        >
          <div className="text-sm">
            End this session? This will mark it completed.
          </div>

          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={alsoGenerateSummary}
              onChange={(e) => setAlsoGenerateSummary(e.target.checked)}
              disabled={pending}
            />
            <span>Generate post-session summary</span>
          </label>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              ref={confirmBtnRef}
              type="button"
              variant="destructive"
              disabled={pending}
              onClick={onConfirm}
            >
              {pending ? "Ending…" : "Confirm end"}
            </Button>
            <Button type="button" variant="secondary" disabled={pending} onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {error ? <div className="text-sm text-destructive">{error}</div> : null}
    </div>
  );
}
