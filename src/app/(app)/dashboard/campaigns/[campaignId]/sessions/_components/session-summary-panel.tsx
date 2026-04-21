"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  generateSessionSummary,
  updateSessionSummaryJson,
} from "@/app/(app)/dashboard/campaigns/[campaignId]/sessions/summary-actions";
import type { SessionSummary } from "@/app/(app)/dashboard/campaigns/[campaignId]/sessions/summary-actions";

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function coerceSummary(raw: unknown): SessionSummary | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;

  const events = Array.isArray(obj.events)
    ? obj.events
        .map((e) => {
          if (!e || typeof e !== "object" || Array.isArray(e)) return null;
          const ev = e as Record<string, unknown>;
          const type = asString(ev.type) ?? "";
          const description = asString(ev.description) ?? "";
          if (!description) return null;
          return { type, description };
        })
        .filter(Boolean)
    : [];

  const npcs = Array.isArray(obj.npcs_encountered)
    ? obj.npcs_encountered
        .map((n) => {
          if (!n || typeof n !== "object" || Array.isArray(n)) return null;
          const npc = n as Record<string, unknown>;
          const name = asString(npc.name) ?? "";
          const role = asString(npc.role) ?? "";
          const relationship = asString(npc.relationship) ?? "";
          if (!name) return null;
          return { name, role, relationship };
        })
        .filter(Boolean)
    : [];

  const loot = Array.isArray(obj.loot_gained)
    ? obj.loot_gained
        .map((l) => {
          if (!l || typeof l !== "object" || Array.isArray(l)) return null;
          const lo = l as Record<string, unknown>;
          const item = asString(lo.item) ?? "";
          const quantity = typeof lo.quantity === "number" ? lo.quantity : null;
          if (!item) return null;
          return { item, quantity: quantity ?? 1 };
        })
        .filter(Boolean)
    : [];

  const decisions = Array.isArray(obj.decisions_made)
    ? obj.decisions_made
        .map((d) => {
          if (!d || typeof d !== "object" || Array.isArray(d)) return null;
          const dec = d as Record<string, unknown>;
          const choice = asString(dec.choice) ?? "";
          const consequence = asString(dec.consequence);
          if (!choice) return null;
          return consequence ? { choice, consequence } : { choice };
        })
        .filter(Boolean)
    : [];

  const threads = Array.isArray(obj.unresolved_threads)
    ? obj.unresolved_threads
        .map((t) => {
          if (!t || typeof t !== "object" || Array.isArray(t)) return null;
          const th = t as Record<string, unknown>;
          const thread = asString(th.thread) ?? "";
          const last_mentioned = asString(th.last_mentioned) ?? "";
          if (!thread) return null;
          return { thread, last_mentioned };
        })
        .filter(Boolean)
    : [];

  const hooks = Array.isArray(obj.next_session_hooks)
    ? obj.next_session_hooks.map((h) => asString(h)).filter(Boolean)
    : [];

  return {
    events,
    npcs_encountered: npcs,
    loot_gained: loot,
    decisions_made: decisions,
    unresolved_threads: threads,
    next_session_hooks: hooks,
  } as SessionSummary;
}

function EmptyList({ label }: { label: string }) {
  return <div className="text-sm text-muted-foreground">No {label}.</div>;
}

export function SessionSummaryPanel({
  campaignId,
  sessionId,
  sessionStatus,
  initialSummaryJson,
}: {
  campaignId: string;
  sessionId: string;
  sessionStatus: string;
  initialSummaryJson: unknown;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [summary, setSummary] = React.useState<SessionSummary | null>(() =>
    coerceSummary(initialSummaryJson),
  );

  const [editing, setEditing] = React.useState(false);
  const [jsonText, setJsonText] = React.useState(() => {
    const s = coerceSummary(initialSummaryJson);
    return s ? JSON.stringify(s, null, 2) : "";
  });

  React.useEffect(() => {
    const next = coerceSummary(initialSummaryJson);
    setSummary(next);
    setEditing(false);
    setJsonText(next ? JSON.stringify(next, null, 2) : "");
    setError(null);
  }, [sessionId, initialSummaryJson]);

  const canGenerate = sessionStatus === "completed" || sessionStatus === "active";

  function onGenerate() {
    if (!canGenerate) return;
    setError(null);
    startTransition(async () => {
      const result = await generateSessionSummary(campaignId, sessionId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSummary(result.data.summary);
      setJsonText(JSON.stringify(result.data.summary, null, 2));
      router.refresh();
    });
  }

  function onSaveEdit() {
    setError(null);
    startTransition(async () => {
      const result = await updateSessionSummaryJson(campaignId, sessionId, jsonText);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSummary(result.data.summary);
      setEditing(false);
      setJsonText(JSON.stringify(result.data.summary, null, 2));
      router.refresh();
    });
  }

  return (
    <section className="overflow-hidden rounded-[var(--radius)] border border-line-soft bg-bg-1">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line-soft px-3 py-2">
        <h2 className="text-[11.5px] font-medium uppercase tracking-[0.06em] text-ink-1">
          Post-session summary
        </h2>
        {summary ? (
          <div className="flex items-center gap-2">
            {!editing ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => {
                  setEditing(true);
                  setError(null);
                  setJsonText(JSON.stringify(summary, null, 2));
                }}
              >
                Edit summary
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="p-3.5">

      {!summary ? (
        <div className="space-y-3">
          <div className="text-[12px] text-ink-2">
            {sessionStatus === "active"
              ? "You can generate a draft summary now, or after you end the session."
              : "Generate a structured summary from your notes."}
          </div>
          <div>
            <Button
              type="button"
              variant={sessionStatus === "active" ? "outline" : "default"}
              disabled={pending || !canGenerate}
              onClick={onGenerate}
            >
              {pending ? "Generating…" : sessionStatus === "active" ? "Generate draft summary" : "Generate summary"}
            </Button>
          </div>
          {error ? <div className="text-[12px] text-bad">{error}</div> : null}
        </div>
      ) : editing ? (
        <div className="space-y-2">
          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            rows={16}
            className="scrollbar-thin w-full resize-y rounded-[var(--radius-sm)] border border-line-soft bg-bg-2 px-3 py-2 font-mono text-[11.5px] text-ink-1 outline-none focus-visible:border-ember-line focus-visible:ring-2 focus-visible:ring-ember-line"
            aria-label="Edit summary JSON"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" disabled={pending} onClick={onSaveEdit}>
              {pending ? "Saving…" : "Save"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={() => {
                setEditing(false);
                setError(null);
                setJsonText(summary ? JSON.stringify(summary, null, 2) : "");
              }}
            >
              Cancel
            </Button>
          </div>
          {error ? <div className="text-[12px] text-bad">{error}</div> : null}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="text-sm font-medium">Events</div>
              {summary.events.length ? (
                <ul className="list-disc space-y-1 pl-5 text-sm">
                  {summary.events.map((e, idx) => (
                    <li key={idx}>
                      {e.type ? (
                        <span className="text-muted-foreground">[{e.type}] </span>
                      ) : null}
                      {e.description}
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyList label="events" />
              )}
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">NPCs encountered</div>
              {summary.npcs_encountered.length ? (
                <ul className="list-disc space-y-1 pl-5 text-sm">
                  {summary.npcs_encountered.map((n, idx) => (
                    <li key={idx}>
                      <span className="font-medium">{n.name}</span>
                      {n.role ? <span className="text-muted-foreground"> — {n.role}</span> : null}
                      {n.relationship ? (
                        <span className="text-muted-foreground"> ({n.relationship})</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyList label="NPCs" />
              )}
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Loot gained</div>
              {summary.loot_gained.length ? (
                <ul className="list-disc space-y-1 pl-5 text-sm">
                  {summary.loot_gained.map((l, idx) => (
                    <li key={idx}>
                      {l.item}
                      {typeof l.quantity === "number" ? (
                        <span className="text-muted-foreground"> × {l.quantity}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyList label="loot" />
              )}
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Decisions</div>
              {summary.decisions_made.length ? (
                <ul className="list-disc space-y-1 pl-5 text-sm">
                  {summary.decisions_made.map((d, idx) => (
                    <li key={idx}>
                      {d.choice}
                      {d.consequence ? (
                        <span className="text-muted-foreground"> — {d.consequence}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyList label="decisions" />
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="text-sm font-medium">Unresolved threads</div>
              {summary.unresolved_threads.length ? (
                <ul className="list-disc space-y-1 pl-5 text-sm">
                  {summary.unresolved_threads.map((t, idx) => (
                    <li key={idx}>
                      {t.thread}
                      {t.last_mentioned ? (
                        <span className="text-muted-foreground"> — last: {t.last_mentioned}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyList label="threads" />
              )}
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Next session hooks</div>
              {summary.next_session_hooks.length ? (
                <ul className="list-disc space-y-1 pl-5 text-sm">
                  {summary.next_session_hooks.map((h, idx) => (
                    <li key={idx}>{h}</li>
                  ))}
                </ul>
              ) : (
                <EmptyList label="hooks" />
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </section>
  );
}
