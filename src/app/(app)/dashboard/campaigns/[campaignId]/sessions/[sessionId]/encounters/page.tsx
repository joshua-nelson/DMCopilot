import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getUserProfileByClerkUserId } from "@/lib/user-profiles";
import { getCampaignForUser } from "@/app/(app)/dashboard/campaigns/actions";
import { listEncounters } from "@/app/(app)/dashboard/campaigns/[campaignId]/sessions/[sessionId]/encounters/actions";
import { StartEncounterForm } from "@/app/(app)/dashboard/campaigns/[campaignId]/sessions/[sessionId]/encounters/_components/start-encounter-form";

export const dynamic = "force-dynamic";

function formatDateTime(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

export default async function EncountersListPage({
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
  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select("id, campaign_id, name, status")
    .eq("id", sessionId)
    .eq("campaign_id", campaignId)
    .maybeSingle();

  if (sessionError) throw sessionError;
  if (!session) notFound();

  const encounters = await listEncounters(campaignId, sessionId);
  const active = encounters.find((e) => e.status === "active") ?? null;
  const history = encounters.filter((e) => e.status !== "active");

  const { data: characters, error: charactersError } = await supabase
    .from("characters")
    .select("id, name, initiative_bonus")
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: false });

  if (charactersError) throw charactersError;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-sm text-muted-foreground">
            <Link
              href={`/dashboard/campaigns/${campaignId}/sessions/${sessionId}`}
              className="hover:underline"
            >
              {session.name}
            </Link>
            <span className="px-2">/</span>
            <span className="truncate">Encounters</span>
          </div>
          <h1 className="mt-1 truncate text-2xl font-semibold">
            Combat / Encounters
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Session status: {session.status}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="ghost">
            <Link href={`/dashboard/campaigns/${campaignId}/sessions/${sessionId}`}>
              Back to session
            </Link>
          </Button>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6 text-card-foreground">
        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Active</h2>
            {active ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
                <div className="text-sm">
                  <div className="font-medium">Active encounter</div>
                  <div className="text-muted-foreground">
                    Started: {formatDateTime(active.created_at)}
                  </div>
                </div>
                <Button asChild>
                  <Link
                    href={`/dashboard/campaigns/${campaignId}/sessions/${sessionId}/encounters/${active.id}`}
                  >
                    Resume combat
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                No active encounter.
              </div>
            )}
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-semibold">History</h2>
            {history.length ? (
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr className="text-left">
                      <th className="px-3 py-2">When</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Link</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((e) => (
                      <tr key={e.id} className="border-t">
                        <td className="px-3 py-2 text-muted-foreground">
                          {formatDateTime(e.created_at)}
                        </td>
                        <td className="px-3 py-2">{e.status}</td>
                        <td className="px-3 py-2">
                          <Link
                            href={`/dashboard/campaigns/${campaignId}/sessions/${sessionId}/encounters/${e.id}`}
                            className="text-primary hover:underline"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                No completed encounters yet.
              </div>
            )}
          </div>

          <StartEncounterForm
            campaignId={campaignId}
            sessionId={sessionId}
            characters={characters ?? []}
          />
        </div>
      </div>
    </div>
  );
}
