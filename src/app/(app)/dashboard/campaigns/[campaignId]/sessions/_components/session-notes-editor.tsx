"use client";

import * as React from "react";

import { updateSessionNotes } from "@/app/(app)/dashboard/campaigns/[campaignId]/sessions/actions";
import { Button } from "@/components/ui/button";

type SaveStatus = "idle" | "saving" | "saved" | "error";

type MarkerKind = "pin" | "event" | "foreshadow" | "decision";

const MARKERS: Record<MarkerKind, string> = {
  pin: "<!-- pin -->",
  event: "<!-- flag:event -->",
  foreshadow: "<!-- flag:foreshadow -->",
  decision: "<!-- flag:decision -->",
};

function stripMarkersFromLine(line: string) {
  let out = line;
  out = out.replaceAll(MARKERS.pin, "");
  out = out.replaceAll(MARKERS.event, "");
  out = out.replaceAll(MARKERS.foreshadow, "");
  out = out.replaceAll(MARKERS.decision, "");
  return out;
}

function markerKindForLine(line: string): MarkerKind | null {
  if (line.includes(MARKERS.pin)) return "pin";
  if (line.includes(MARKERS.event)) return "event";
  if (line.includes(MARKERS.foreshadow)) return "foreshadow";
  if (line.includes(MARKERS.decision)) return "decision";
  return null;
}

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
  const [search, setSearch] = React.useState("");

  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);

  const lastSavedRef = React.useRef(initialNotesMd);
  const saveSeqRef = React.useRef(0);

  React.useEffect(() => {
    setValue(initialNotesMd);
    lastSavedRef.current = initialNotesMd;
    setStatus("idle");
    setError(null);
    setSearch("");
  }, [initialNotesMd, sessionId]);

  const insertMarker = React.useCallback(
    (marker: string) => {
      if (disabled) return;
      const el = textareaRef.current;
      if (!el) {
        setValue((prev) => prev + marker);
        if (status !== "saving") setStatus("idle");
        return;
      }

      const start = el.selectionStart ?? value.length;
      const end = el.selectionEnd ?? value.length;
      const nextCursor = start + marker.length;

      setValue((prev) => prev.slice(0, start) + marker + prev.slice(end));
      if (status !== "saving") setStatus("idle");

      // Restore cursor after controlled value update.
      window.requestAnimationFrame(() => {
        const current = textareaRef.current;
        if (!current) return;
        current.focus();
        current.setSelectionRange(nextCursor, nextCursor);
      });
    },
    [disabled, status, value.length],
  );

  const previewLines = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    const lines = value.split(/\r?\n/);

    return lines.map((rawLine) => {
      const kind = markerKindForLine(rawLine);
      const displayLine = stripMarkersFromLine(rawLine);
      const isSearchMatch = term ? displayLine.toLowerCase().includes(term) : false;

      return { rawLine, displayLine, kind, isSearchMatch };
    });
  }, [value, search]);

  const searchMatchesCount = React.useMemo(() => {
    const term = search.trim();
    if (!term) return 0;
    return previewLines.reduce((acc, l) => (l.isSearchMatch ? acc + 1 : acc), 0);
  }, [previewLines, search]);

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
          <span className="font-mono text-[10.5px] font-normal text-ink-3">markdown</span>
        </div>
        <div className="font-mono text-[10.5px] text-ink-3">{statusLabel}</div>
      </div>

      <div className="p-3.5">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="session-notes-search">
            Search notes
          </label>
          <input
            id="session-notes-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={disabled}
            placeholder="Search notes…"
            className="h-8 w-full min-w-[220px] flex-1 rounded-[var(--radius-sm)] border border-line-soft bg-bg-2 px-3 text-[12.5px] text-ink-1 outline-none placeholder:text-ink-4 focus-visible:border-ember-line focus-visible:ring-2 focus-visible:ring-ember-line"
            aria-label="Search notes"
          />
          <div className="shrink-0 font-mono text-[10.5px] text-ink-4">
            {search.trim() ? `${searchMatchesCount} matches` : ""}
          </div>
        </div>

        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => insertMarker(MARKERS.pin)}
            aria-label="Insert pin marker"
          >
            📌 Pin
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => insertMarker(MARKERS.event)}
            aria-label="Insert event marker"
          >
            ⚡ Event
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => insertMarker(MARKERS.foreshadow)}
            aria-label="Insert foreshadow marker"
          >
            🔮 Foreshadow
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => insertMarker(MARKERS.decision)}
            aria-label="Insert decision marker"
          >
            ✅ Decision
          </Button>
        </div>

        <textarea
          ref={textareaRef}
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

        <div className="mt-3 rounded-[var(--radius-sm)] border border-line-soft bg-bg-2">
          <div className="border-b border-line-soft px-3 py-2 text-[11.5px] font-medium uppercase tracking-[0.06em] text-ink-2">
            Preview
            <span className="ml-2 font-mono text-[10.5px] font-normal text-ink-4">
              markers hidden
            </span>
          </div>
          <div className="max-h-[320px] overflow-auto px-2 py-2">
            <div className="space-y-1">
              {previewLines.map((l, idx) => {
                const base =
                  "rounded-md px-2 py-1 text-[13px] leading-relaxed text-ink-1 whitespace-pre-wrap break-words";

                const markerClass =
                  l.kind === "pin"
                    ? "border-l-2 border-amber-500/60 bg-amber-500/10 dark:border-amber-400/50 dark:bg-amber-500/15"
                    : l.kind === "event"
                      ? "bg-yellow-500/10 dark:bg-yellow-500/15"
                      : l.kind === "foreshadow"
                        ? "bg-purple-500/10 dark:bg-purple-500/15"
                        : l.kind === "decision"
                          ? "bg-emerald-500/10 dark:bg-emerald-500/15"
                          : "";

                const searchClass = l.isSearchMatch ? "bg-yellow-500/25 dark:bg-yellow-500/25" : "";

                const className = [base, markerClass, searchClass].filter(Boolean).join(" ");

                const content = l.displayLine.length ? l.displayLine : " ";

                return (
                  <div key={idx} className={className}>
                    {content}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {error ? <div className="mt-2 text-[12px] text-bad">{error}</div> : null}
        <div className="mt-2 font-mono text-[10.5px] text-ink-4">
          Autosaves after you pause typing.
        </div>
      </div>
    </section>
  );
}
