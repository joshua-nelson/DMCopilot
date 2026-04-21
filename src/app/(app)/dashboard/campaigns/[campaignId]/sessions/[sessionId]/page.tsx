import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getUserProfileByClerkUserId } from "@/lib/user-profiles";
import { getCampaignForUser } from "@/app/(app)/dashboard/campaigns/actions";
import {
  type SessionPhase,
  type SessionRow,
} from "@/app/(app)/dashboard/campaigns/[campaignId]/sessions/actions";
import { SessionPhaseSwitcher } from "@/app/(app)/dashboard/campaigns/[campaignId]/sessions/_components/session-phase-switcher";
import { SessionFluidLayout } from "@/app/(app)/dashboard/campaigns/[campaignId]/sessions/[sessionId]/_components/session-fluid-layout";

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

        <div className="flex items-center gap-3">
          <div id="fluid-layout-reset-slot" />
          <SessionPhaseSwitcher
            campaignId={campaignId}
            sessionId={sessionId}
            initialPhase={phase}
            disabled={!isActive}
          />
        </div>
      </div>

      {/* Main body */}
      <SessionFluidLayout
        campaignId={campaignId}
        sessionId={sessionId}
        campaignName={campaign.name}
        sessionStatus={session.status}
        phase={phase}
        startedAtLabel={formatDateTime(session.started_at)}
        isActive={isActive}
        initialNotesMd={session.notes_md ?? ""}
        initialSummaryJson={session.summary_json}
      />
    </div>
  );
}
