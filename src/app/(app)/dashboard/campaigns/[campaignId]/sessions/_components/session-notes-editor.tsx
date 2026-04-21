"use client";

import * as React from "react";

import { updateSessionNotes } from "@/app/(app)/dashboard/campaigns/[campaignId]/sessions/actions";

type SaveStatus = "idle" | "saving" | "saved" | "error";

export function SessionNotesEditor({
  campaignId,
  sessionId,
  initialNotesMd,
  disabled,
}: {
  campaignId: string;
  sessionId: string;
  initialNotesMd: string;
  disabled?: boolean;
}) {
  const [value, setValue] = React.useState(initialNotesMd);
  const [status, setStatus] = React.useState<SaveStatus>("idle");
  const [error, setError] = React.useState<string | null>(null);

  const lastSavedRef = React.useRef(initialNotesMd);
  const saveSeqRef = React.useRef(0);

  React.useEffect(() => {
    setValue(initialNotesMd);
    lastSavedRef.current = initialNotesMd;
    setStatus("idle");
    setError(null);
  }, [initialNotesMd, sessionId]);

  React.useEffect(() => {
    if (disabled) return;
    if (value === lastSavedRef.current) return;

    setStatus("saving");
    setError(null);

    const seq = ++saveSeqRef.current;
    const handle = window.setTimeout(async () => {
      const result = await updateSessionNotes(campaignId, sessionId, value);

      // If a newer save was scheduled, ignore this result.
      if (seq !== saveSeqRef.current) return;

      if (!result.ok) {
        setStatus("error");
        setError(result.error);
        return;
      }

      lastSavedRef.current = value;
      setStatus("saved");
    }, 750);

    return () => window.clearTimeout(handle);
  }, [campaignId, sessionId, value, disabled]);

  const statusLabel =
    disabled
      ? "Read-only"
      : status === "saving"
        ? "Saving…"
        : status === "saved"
          ? "Saved"
          : status === "error"
            ? "Save failed"
            : "";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-medium">Notes (Markdown)</div>
        <div className="text-xs text-muted-foreground">{statusLabel}</div>
      </div>

      <textarea
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          if (status !== "saving") setStatus("idle");
        }}
        disabled={disabled}
        rows={18}
        placeholder="Type session notes here…"
        className="w-full resize-y rounded-md border bg-background px-3 py-2 text-sm shadow-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      />

      {error ? <div className="text-sm text-destructive">{error}</div> : null}
      <div className="text-xs text-muted-foreground">
        Autosaves after you pause typing.
      </div>
    </div>
  );
}
