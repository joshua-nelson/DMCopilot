"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";

type RulesChunkHit = {
  id: string;
  content: string;
  metadata: unknown;
  rank: number;
};

type SearchError = { ok: false; error: string };

type QACitation = {
  id: string;
  section?: string;
  url?: string;
  license?: string;
  attribution?: string;
};

type QAResponse =
  | { ok: true; answer: string; citations: QACitation[] }
  | { ok: false; error: string };

type MetadataShape = {
  title?: string;
  section?: string;
  url?: string;
  source_page?: string;
  license?: { id?: string; name?: string; url?: string };
  attribution?: string;
};

function asMetadataShape(value: unknown): MetadataShape {
  if (!value || typeof value !== "object") return {};
  return value as MetadataShape;
}

const RECENTS_KEY = "dmcopilot.rules.recentQueries";

function loadRecents(): string[] {
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x) => typeof x === "string").slice(0, 10);
  } catch {
    return [];
  }
}

function saveRecents(queries: string[]) {
  try {
    localStorage.setItem(RECENTS_KEY, JSON.stringify(queries.slice(0, 10)));
  } catch {
    // ignore
  }
}

function pushRecent(existing: string[], q: string): string[] {
  const next = [q, ...existing.filter((x) => x !== q)].slice(0, 10);
  saveRecents(next);
  return next;
}

export function RulesCommandBar() {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [recents, setRecents] = React.useState<string[]>([]);

  const [searchLoading, setSearchLoading] = React.useState(false);
  const [searchError, setSearchError] = React.useState<string | null>(null);
  const [results, setResults] = React.useState<RulesChunkHit[]>([]);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const [qaLoading, setQaLoading] = React.useState(false);
  const [qaError, setQaError] = React.useState<string | null>(null);
  const [qaAnswer, setQaAnswer] = React.useState<string>("");
  const [qaCitations, setQaCitations] = React.useState<QACitation[]>([]);

  const inputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    setRecents(loadRecents());
  }, []);

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const isCmdK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";
      if (isCmdK) {
        e.preventDefault();
        setOpen(true);
        return;
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  React.useEffect(() => {
    if (!open) return;

    const q = query.trim();
    setSearchError(null);
    setQaError(null);
    setQaAnswer("");
    setQaCitations([]);

    if (!q) {
      setResults([]);
      setSelectedId(null);
      return;
    }

    const controller = new AbortController();
    const debounce = window.setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(
          `/api/rules/search?q=${encodeURIComponent(q)}&limit=10&offset=0`,
          { signal: controller.signal },
        );
        const json = (await res.json()) as unknown;
        if (Array.isArray(json)) {
          const hits = json as RulesChunkHit[];
          setResults(hits);
          setSelectedId(hits[0]?.id ?? null);
          setRecents((prev) => pushRecent(prev, q));
          return;
        }

        const maybeErr = json as Partial<SearchError>;
        setSearchError(maybeErr.error ?? "Search failed");
        setResults([]);
        setSelectedId(null);
      } catch (err) {
        if (controller.signal.aborted) return;
        setSearchError(err instanceof Error ? err.message : String(err));
        setResults([]);
        setSelectedId(null);
      } finally {
        if (!controller.signal.aborted) setSearchLoading(false);
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(debounce);
    };
  }, [open, query]);

  async function onAskAI() {
    const q = query.trim();
    if (!q) return;
    setQaLoading(true);
    setQaError(null);
    setQaAnswer("");
    setQaCitations([]);

    try {
      const res = await fetch("/api/rules/qa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q }),
      });
      const json = (await res.json()) as QAResponse;
      if (!json.ok) {
        setQaError(json.error);
        return;
      }
      setQaAnswer(json.answer);
      setQaCitations(json.citations);
      setRecents((prev) => pushRecent(prev, q));
    } catch (err) {
      setQaError(err instanceof Error ? err.message : String(err));
    } finally {
      setQaLoading(false);
    }
  }

  const selected = selectedId
    ? results.find((r) => r.id === selectedId) ?? null
    : null;

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-16"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div className="w-full max-w-4xl overflow-hidden rounded-xl border bg-background shadow-xl">
        <div className="flex items-center gap-2 border-b p-3">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search SRD rules (e.g. grapple, advantage, cover)"
            className="h-9 flex-1 rounded-lg border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
          >
            Close
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-0 md:grid-cols-2">
          <div className="border-b p-3 md:border-b-0 md:border-r">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm font-medium">Results</div>
              <div className="text-xs text-muted-foreground">
                {searchLoading ? "Searching…" : `${results.length} found`}
              </div>
            </div>

            {searchError ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
                {searchError}
              </div>
            ) : null}

            {!query.trim() && recents.length ? (
              <div className="mt-2">
                <div className="mb-1 text-xs font-medium text-muted-foreground">
                  Recent
                </div>
                <div className="flex flex-wrap gap-2">
                  {recents.map((r) => (
                    <button
                      key={r}
                      type="button"
                      className="rounded-full border bg-muted px-2 py-1 text-xs hover:bg-muted/70"
                      onClick={() => setQuery(r)}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-3 max-h-[380px] space-y-2 overflow-auto pr-1">
              {results.map((r) => {
                const m = asMetadataShape(r.metadata);
                const active = r.id === selectedId;

                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelectedId(r.id)}
                    className={
                      "w-full rounded-lg border p-2 text-left text-sm hover:bg-muted/50 " +
                      (active ? "bg-muted" : "")
                    }
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-medium">
                          {m.section ?? m.title ?? "SRD excerpt"}
                        </div>
                        <div className="mt-1 max-h-10 overflow-hidden text-xs text-muted-foreground">
                          {r.content}
                        </div>
                      </div>
                      <div className="shrink-0 text-xs text-muted-foreground">
                        {Number.isFinite(r.rank) ? r.rank.toFixed(2) : ""}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="text-sm font-medium">Details</div>
              <Button
                type="button"
                variant="default"
                onClick={onAskAI}
                disabled={!query.trim() || qaLoading}
              >
                {qaLoading ? "Asking…" : "Ask AI"}
              </Button>
            </div>

            {selected ? (
              <div className="rounded-lg border p-3">
                <div className="text-sm font-medium">
                  {asMetadataShape(selected.metadata).section ??
                    asMetadataShape(selected.metadata).title ??
                    "SRD excerpt"}
                </div>
                <div className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-foreground">
                  {selected.content}
                </div>

                <div className="mt-3 border-t pt-2 text-xs text-muted-foreground">
                  <div className="flex flex-wrap gap-x-3 gap-y-1">
                    <span className="font-mono">id: {selected.id}</span>
                    {asMetadataShape(selected.metadata).url ? (
                      <a
                        className="underline"
                        href={asMetadataShape(selected.metadata).url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        source
                      </a>
                    ) : null}
                    {asMetadataShape(selected.metadata).license?.url ? (
                      <a
                        className="underline"
                        href={asMetadataShape(selected.metadata).license?.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {asMetadataShape(selected.metadata).license?.id ?? "license"}
                      </a>
                    ) : asMetadataShape(selected.metadata).license?.id ? (
                      <span>{asMetadataShape(selected.metadata).license?.id}</span>
                    ) : null}
                  </div>
                  {asMetadataShape(selected.metadata).attribution ? (
                    <div className="mt-2">
                      Attribution: {asMetadataShape(selected.metadata).attribution}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border p-3 text-sm text-muted-foreground">
                Select a result to view.
              </div>
            )}

            {qaError ? (
              <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
                {qaError}
              </div>
            ) : null}

            {qaAnswer ? (
              <div className="mt-3 rounded-lg border p-3">
                <div className="text-sm font-medium">Answer</div>
                <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
                  {qaAnswer}
                </div>
                {qaCitations.length ? (
                  <div className="mt-3 border-t pt-2">
                    <div className="text-xs font-medium text-muted-foreground">
                      Citations (CC-BY)
                    </div>
                    <ul className="mt-2 space-y-2">
                      {qaCitations.map((c) => (
                        <li key={c.id} className="text-xs text-muted-foreground">
                          <div className="font-mono">[{c.id}]</div>
                          {c.section ? <div>Section: {c.section}</div> : null}
                          {c.url ? (
                            <div>
                              URL:{" "}
                              <a
                                className="underline"
                                href={c.url}
                                target="_blank"
                                rel="noreferrer"
                              >
                                {c.url}
                              </a>
                            </div>
                          ) : null}
                          {c.license ? <div>License: {c.license}</div> : null}
                          {c.attribution ? (
                            <div>Attribution: {c.attribution}</div>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <div className="border-t p-3 text-xs text-muted-foreground">
          Tip: press <span className="font-mono">Esc</span> to close.
        </div>
      </div>
    </div>
  );
}
