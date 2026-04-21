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
    <section className="rounded-[var(--radius)] border border-line-soft bg-bg-1">
      <div className="flex items-center justify-between gap-3 border-b border-line-soft px-3 py-2">
        <div className="flex items-center gap-2 text-[11.5px] font-medium uppercase tracking-[0.06em] text-ink-1">
          Notes
          <span className="font-mono text-[10.5px] font-normal text-ink-3">
            markdown
          </span>
        </div>
        <div className="font-mono text-[10.5px] text-ink-3">{statusLabel}</div>
      </div>

      <div className="p-3.5">
        <textarea
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (status !== "saving") setStatus("idle");
          }}
          disabled={disabled}
          rows={18}
          placeholder="Type session notes here…"
          className="scrollbar-thin w-full resize-y rounded-[var(--radius-sm)] border border-line-soft bg-bg-2 px-3 py-2.5 text-[13px] leading-relaxed text-ink-1 outline-none placeholder:text-ink-4 focus-visible:border-ember-line focus-visible:ring-2 focus-visible:ring-ember-line"
        />

        {error ? (
          <div className="mt-2 text-[12px] text-bad">{error}</div>
        ) : null}
        <div className="mt-2 font-mono text-[10.5px] text-ink-4">
          Autosaves after you pause typing.
        </div>
      </div>
    </section>
  );
}
