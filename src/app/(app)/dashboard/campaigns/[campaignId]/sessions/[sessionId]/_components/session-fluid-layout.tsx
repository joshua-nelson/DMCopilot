"use client";

import * as React from "react";
import { createPortal } from "react-dom";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { FluidLayout } from "@/components/ui/fluid-layout";
import { SortableFluidPanel } from "@/components/ui/fluid-panel";
import type { SessionPhase } from "@/components/ui/fluid-layout-presets";
import { SessionNotesEditor } from "@/app/(app)/dashboard/campaigns/[campaignId]/sessions/_components/session-notes-editor";
import { SessionSummaryPanel } from "@/app/(app)/dashboard/campaigns/[campaignId]/sessions/_components/session-summary-panel";
import { EndSessionButton } from "@/app/(app)/dashboard/campaigns/[campaignId]/sessions/_components/end-session-button";

const RESET_SLOT_ID = "fluid-layout-reset-slot";

function ResetLayoutPortal({
  show,
  onReset,
}: {
  show: boolean;
  onReset: () => void;
}) {
  const [target, setTarget] = React.useState<HTMLElement | null>(null);

  React.useEffect(() => {
    setTarget(document.getElementById(RESET_SLOT_ID));
  }, []);

  if (!target) return null;
  if (!show) return null;

  return createPortal(
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onReset}
      className="h-7"
    >
      Reset layout
    </Button>,
    target,
  );
}

export function SessionFluidLayout({
  campaignId,
  sessionId,
  campaignName,
  sessionStatus,
  phase,
  startedAtLabel,
  isActive,
  initialNotesMd,
  initialSummaryJson,
}: {
  campaignId: string;
  sessionId: string;
  campaignName: string;
  sessionStatus: string;
  phase: SessionPhase;
  startedAtLabel: string;
  isActive: boolean;
  initialNotesMd: string;
  initialSummaryJson: unknown;
}) {
  const panels = React.useMemo(
    () =>
      [
        { id: "notes" },
        { id: "summary" },
        { id: "scene-context" },
        { id: "actions" },
        ...(isActive ? [{ id: "session-control" }] : []),
      ] as const,
    [isActive],
  );

  return (
    <div className="flex flex-col gap-5 px-8 py-6">
      <div className="flex items-center gap-2.5 border-b border-dashed border-line-soft pb-2 font-mono text-[11px] text-ink-3">
        <span className="h-[7px] w-[7px] rounded-full bg-bad shadow-[0_0_0_3px_oklch(0.66_0.15_20_/_0.18)]" />
        <span>SESSION · {startedAtLabel}</span>
        <span className="ml-auto uppercase tracking-[0.08em]">Phase · {phase}</span>
      </div>

      <FluidLayout storageKey="fluid-layout:session" phase={phase} panels={panels}>
        {({ panelOrder, resetToPreset, isDirty }) => (
          <>
            <ResetLayoutPortal show={isDirty} onReset={resetToPreset} />

            <div className="flex flex-col gap-[18px]">
              {panelOrder.map((id) => {
                if (id === "notes") {
                  return (
                    <SortableFluidPanel key={id} id={id} title="Notes">
                      <SessionNotesEditor
                        campaignId={campaignId}
                        sessionId={sessionId}
                        initialNotesMd={initialNotesMd}
                        disabled={!isActive}
                      />
                    </SortableFluidPanel>
                  );
                }

                if (id === "summary") {
                  return (
                    <SortableFluidPanel key={id} id={id} title="Summary">
                      <SessionSummaryPanel
                        campaignId={campaignId}
                        sessionId={sessionId}
                        sessionStatus={sessionStatus}
                        initialSummaryJson={initialSummaryJson}
                      />
                    </SortableFluidPanel>
                  );
                }

                if (id === "scene-context") {
                  return (
                    <SortableFluidPanel
                      key={id}
                      id={id}
                      title="Scene context"
                      count={campaignName}
                    >
                      <div className="rounded-[6px] border-l-2 border-ember bg-[oklch(0.76_0.15_48_/_0.07)] px-3 py-2.5 text-[12px] leading-relaxed text-ink-1">
                        <div className="mb-1 flex gap-1.5 font-mono text-[10.5px] text-ink-3">
                          <span>PINNED · CAMPAIGN</span>
                        </div>
                        <span className="truncate">{campaignName}</span>
                      </div>
                      <div className="rounded-[6px] border-l-2 border-sky bg-[oklch(0.76_0.11_215_/_0.06)] px-3 py-2.5 text-[12px] leading-relaxed text-ink-1">
                        <div className="mb-1 flex gap-1.5 font-mono text-[10.5px] text-ink-3">
                          <span>SESSION · STATUS</span>
                        </div>
                        <span>
                          {isActive
                            ? "Session is live. Take notes as the party explores."
                            : "Session ended. Summary is read-only."}
                        </span>
                      </div>
                    </SortableFluidPanel>
                  );
                }

                if (id === "actions") {
                  return (
                    <SortableFluidPanel key={id} id={id} title="Actions">
                      <div className="flex flex-col gap-2">
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="justify-start"
                        >
                          <Link href={`/dashboard/campaigns/${campaignId}`}>
                            Campaign home
                          </Link>
                        </Button>
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="justify-start"
                        >
                          <Link
                            href={`/dashboard/campaigns/${campaignId}/sessions/${sessionId}/encounters`}
                          >
                            Combat / Encounters
                          </Link>
                        </Button>
                        <Button
                          asChild
                          variant="ghost"
                          size="sm"
                          className="justify-start"
                        >
                          <Link href={`/dashboard/campaigns/${campaignId}/sessions`}>
                            All sessions
                          </Link>
                        </Button>
                      </div>
                    </SortableFluidPanel>
                  );
                }

                if (id === "session-control") {
                  if (!isActive) return null;
                  return (
                    <SortableFluidPanel key={id} id={id} title="Session control">
                      <EndSessionButton campaignId={campaignId} sessionId={sessionId} />
                    </SortableFluidPanel>
                  );
                }

                return null;
              })}
            </div>
          </>
        )}
      </FluidLayout>
    </div>
  );
}
