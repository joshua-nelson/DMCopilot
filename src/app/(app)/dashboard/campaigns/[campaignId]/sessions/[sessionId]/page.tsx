import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getUserProfileByClerkUserId } from "@/lib/user-profiles";
import { getCampaignForUser } from "@/app/(app)/dashboard/campaigns/actions";
import {
  type SessionPhase,
  type SessionRow,
} from "@/app/(app)/dashboard/campaigns/[campaignId]/sessions/actions";
import { EndSessionButton } from "@/app/(app)/dashboard/campaigns/[campaignId]/sessions/_components/end-session-button";
import { SessionNotesEditor } from "@/app/(app)/dashboard/campaigns/[campaignId]/sessions/_components/session-notes-editor";
import { SessionPhaseSwitcher } from "@/app/(app)/dashboard/campaigns/[campaignId]/sessions/_components/session-phase-switcher";
import { SessionSummaryPanel } from "@/app/(app)/dashboard/campaigns/[campaignId]/sessions/_components/session-summary-panel";

export const dynamic = "force-dynamic";

function formatDateTime(value: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

function coercePhase(phase: string): SessionPhase {
  if (
    phase === "prep" ||
    phase === "exploration" ||
    phase === "roleplay" ||
    phase === "combat"
  ) {
    return phase;
  }
  return "prep";
}

export default async function CampaignSessionPage({
  params,
}: {
  params: Promise<{ campaignId: string; sessionId: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const profile = await getUserProfileByClerkUserId(userId);
  if (!profile) redirect("/onboarding");

  const { campaignId, sessionId } = await params;
  const campaign = await getCampaignForUser(campaignId);
  if (!campaign) notFound();

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("sessions")
    .select(
      "id, campaign_id, name, status, phase, started_at, ended_at, token_budget_used, summary_json, notes_md, created_at, updated_at",
    )
    .eq("id", sessionId)
    .eq("campaign_id", campaignId)
    .maybeSingle();

  if (error) throw error;
  if (!data) notFound();

  const session: SessionRow = data;
  const isActive = session.status === "active";
  const phase = coercePhase(session.phase);

  return (
    <div className="flex flex-col bg-bg-0">
      {/* Scene header */}
      <div className="sticky top-0 z-[5] flex items-center justify-between gap-6 border-b border-line-soft bg-bg-0/95 px-8 py-4 backdrop-blur">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[11px] text-ink-3">
            <Link
              href={`/dashboard/campaigns/${campaignId}/sessions`}
              className="hover:text-ink-1"
            >
              Sessions
            </Link>
            <span className="text-ink-4">/</span>
            <span className="truncate text-ink-2">{campaign.name}</span>
          </div>
          <div className="mt-1 flex items-baseline gap-3">
            <h1 className="truncate font-heading text-[26px] font-normal tracking-tight text-ink-0 [&::first-letter]:text-ember">
              {session.name}
            </h1>
            <span className="truncate text-[12px] text-ink-3">
              Status: <span className="text-ink-2">{session.status}</span>
              {" · "}Started {formatDateTime(session.started_at)}
              {session.ended_at ? ` · Ended ${formatDateTime(session.ended_at)}` : ""}
            </span>
          </div>
        </div>

        <SessionPhaseSwitcher
          campaignId={campaignId}
          sessionId={sessionId}
          initialPhase={phase}
          disabled={!isActive}
        />
      </div>

      {/* Main body */}
      <div className="grid grid-cols-[minmax(0,1fr)_320px]">
        {/* Primary column — notes / summary */}
        <section className="flex flex-col gap-5 px-8 py-6">
          <div className="flex items-center gap-2.5 border-b border-dashed border-line-soft pb-2 font-mono text-[11px] text-ink-3">
            <span className="h-[7px] w-[7px] rounded-full bg-bad shadow-[0_0_0_3px_oklch(0.66_0.15_20_/_0.18)]" />
            <span>SESSION · {formatDateTime(session.started_at)}</span>
            <span className="ml-auto uppercase tracking-[0.08em]">
              Phase · {phase}
            </span>
          </div>

          <SessionNotesEditor
            campaignId={campaignId}
            sessionId={sessionId}
            initialNotesMd={session.notes_md ?? ""}
            disabled={!isActive}
          />

          <SessionSummaryPanel
            campaignId={campaignId}
            sessionId={sessionId}
            sessionStatus={session.status}
            initialSummaryJson={session.summary_json}
          />
        </section>

        {/* Context column */}
        <aside className="flex flex-col gap-[18px] border-l border-line-soft bg-bg-0 p-5">
          <Panel title="Scene context" count={campaign.name}>
            <div className="rounded-[6px] border-l-2 border-ember bg-[oklch(0.76_0.15_48_/_0.07)] px-3 py-2.5 text-[12px] leading-relaxed text-ink-1">
              <div className="mb-1 flex gap-1.5 font-mono text-[10.5px] text-ink-3">
                <span>PINNED · CAMPAIGN</span>
              </div>
              <span className="truncate">{campaign.name}</span>
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
          </Panel>

          <Panel title="Actions">
            <div className="flex flex-col gap-2">
              <Button asChild variant="outline" size="sm" className="justify-start">
                <Link href={`/dashboard/campaigns/${campaignId}`}>
                  Campaign home
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="justify-start">
                <Link
                  href={`/dashboard/campaigns/${campaignId}/sessions/${sessionId}/encounters`}
                >
                  Combat / Encounters
                </Link>
              </Button>
              <Button asChild variant="ghost" size="sm" className="justify-start">
                <Link href={`/dashboard/campaigns/${campaignId}/sessions`}>
                  All sessions
                </Link>
              </Button>
            </div>
          </Panel>

          {isActive ? (
            <Panel title="Session control">
              <EndSessionButton campaignId={campaignId} sessionId={sessionId} />
            </Panel>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function Panel({
  title,
  count,
  children,
}: {
  title: string;
  count?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[var(--radius)] border border-line-soft bg-bg-1">
      <div className="flex items-center justify-between border-b border-line-soft px-3 py-2">
        <div className="flex items-center gap-2 text-[11.5px] font-medium uppercase tracking-[0.06em] text-ink-1">
          {title}
          {count ? (
            <span className="font-mono text-[10.5px] font-normal text-ink-3">
              {count}
            </span>
          ) : null}
        </div>
      </div>
      <div className="flex flex-col gap-2.5 p-3.5">{children}</div>
    </section>
  );
}
