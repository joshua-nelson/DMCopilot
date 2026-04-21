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

export const dynamic = "force-dynamic";

function formatDateTime(value: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

function coercePhase(phase: string): SessionPhase {
  if (phase === "prep" || phase === "exploration" || phase === "roleplay" || phase === "combat") {
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

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-sm text-muted-foreground">
            <Link
              href={`/dashboard/campaigns/${campaignId}/sessions`}
              className="hover:underline"
            >
              Sessions
            </Link>
            <span className="px-2">/</span>
            <span className="truncate">{campaign.name}</span>
          </div>

          <h1 className="mt-1 truncate text-2xl font-semibold">
            {session.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Status: {session.status}
            {session.phase ? ` • Phase: ${session.phase}` : ""}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Started: {formatDateTime(session.started_at)} • Ended: {formatDateTime(session.ended_at)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="ghost">
            <Link href={`/dashboard/campaigns/${campaignId}`}>Campaign</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/dashboard/campaigns/${campaignId}/sessions`}>All sessions</Link>
          </Button>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6 text-card-foreground">
        <div className="space-y-6">
          <SessionPhaseSwitcher
            campaignId={campaignId}
            sessionId={sessionId}
            initialPhase={coercePhase(session.phase)}
            disabled={!isActive}
          />

          <SessionNotesEditor
            campaignId={campaignId}
            sessionId={sessionId}
            initialNotesMd={session.notes_md ?? ""}
            disabled={!isActive}
          />

          {isActive ? (
            <div className="pt-2">
              <EndSessionButton campaignId={campaignId} sessionId={sessionId} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
