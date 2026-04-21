import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { getUserProfileByClerkUserId } from "@/lib/user-profiles";
import { getCampaignForUser } from "@/app/(app)/dashboard/campaigns/actions";
import {
  listSessions,
  startSession,
  type SessionRow,
} from "@/app/(app)/dashboard/campaigns/[campaignId]/sessions/actions";

export const dynamic = "force-dynamic";

function formatDateTime(value: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

function renderSessionRow(
  campaignId: string,
  session: SessionRow,
  opts?: { muted?: boolean },
) {
  return (
    <Link
      key={session.id}
      href={`/dashboard/campaigns/${campaignId}/sessions/${session.id}`}
      className={
        "rounded-lg border bg-card p-4 text-card-foreground hover:bg-muted/40" +
        (opts?.muted ? " opacity-80" : "")
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{session.name}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {session.status}
            {session.phase ? ` • ${session.phase}` : ""}
          </div>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <div>Started: {formatDateTime(session.started_at)}</div>
          <div>Ended: {formatDateTime(session.ended_at)}</div>
        </div>
      </div>
    </Link>
  );
}

export default async function CampaignSessionsPage({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const profile = await getUserProfileByClerkUserId(userId);
  if (!profile) redirect("/onboarding");

  const { campaignId } = await params;
  const campaign = await getCampaignForUser(campaignId);
  if (!campaign) notFound();

  const sessions = await listSessions(campaignId);
  const activeSessions = sessions.filter((s) => s.status === "active");
  const completedSessions = sessions.filter((s) => s.status !== "active");

  const active = activeSessions[0] ?? null;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold">Sessions</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {campaign.name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost">
            <Link href={`/dashboard/campaigns/${campaignId}`}>Back</Link>
          </Button>
          <form action={startSession.bind(null, campaignId)}>
            <Button type="submit">Start session</Button>
          </form>
        </div>
      </div>

      {active ? (
        <div className="space-y-3">
          <div className="text-sm font-medium">Active</div>
          {renderSessionRow(campaignId, active)}
        </div>
      ) : (
        <div className="rounded-lg border bg-card p-6 text-card-foreground">
          <div className="text-sm font-medium">No active session</div>
          <p className="mt-1 text-sm text-muted-foreground">
            Start a new session to begin taking notes.
          </p>
          <div className="mt-4">
            <form action={startSession.bind(null, campaignId)}>
              <Button type="submit">Start session</Button>
            </form>
          </div>
        </div>
      )}

      <div className="mt-10 space-y-3">
        <div className="text-sm font-medium text-muted-foreground">History</div>
        {completedSessions.length ? (
          <div className="grid gap-3">
            {completedSessions.map((s) => renderSessionRow(campaignId, s, { muted: true }))}
          </div>
        ) : (
          <div className="rounded-lg border bg-card p-6 text-card-foreground">
            <div className="text-sm text-muted-foreground">
              No completed sessions yet.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
