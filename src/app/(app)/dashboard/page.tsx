import { Button } from "@/components/ui/button";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";

import { getUserProfileByClerkUserId } from "@/lib/user-profiles";
import { listCampaignsForUser } from "@/app/(app)/dashboard/campaigns/actions";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const profile = await getUserProfileByClerkUserId(userId);
  if (!profile) redirect("/onboarding");

  let campaigns: Awaited<ReturnType<typeof listCampaignsForUser>> = [];
  let loadError: string | null = null;

  try {
    campaigns = await listCampaignsForUser();
  } catch (err) {
    loadError = err instanceof Error ? err.message : String(err);
  }

  const activeCampaigns = campaigns.filter((c) => !c.is_archived);
  const archivedCampaigns = campaigns.filter((c) => c.is_archived);

  return (
    <div className="p-6">
      <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-[26px] font-normal tracking-tight text-ink-0 [&::first-letter]:text-ember">
            Campaigns
          </h1>
          <p className="mt-1 text-sm text-ink-3">
            Create a campaign to start tracking sessions, characters, encounters,
            and notes.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/campaigns/new">Create campaign</Link>
        </Button>
      </div>

      {loadError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          Unable to load campaigns: {loadError}
        </div>
      ) : activeCampaigns.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-card-foreground">
          <h2 className="text-lg font-medium">No campaigns yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Create your first campaign to get started.
          </p>
          <div className="mt-6">
            <Button asChild>
              <Link href="/dashboard/campaigns/new">Create your first campaign</Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid gap-4 md:grid-cols-2">
            {activeCampaigns.map((c) => (
              <Link
                key={c.id}
                href={`/dashboard/campaigns/${c.id}`}
                className="rounded-lg border bg-card p-5 text-card-foreground hover:bg-muted/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-base font-medium">{c.name}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {c.system}
                    </div>
                  </div>
                </div>
                {c.description ? (
                  <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">
                    {c.description}
                  </p>
                ) : null}
              </Link>
            ))}
          </div>

          {archivedCampaigns.length ? (
            <div>
              <h2 className="text-sm font-medium text-muted-foreground">
                Archived
              </h2>
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                {archivedCampaigns.map((c) => (
                  <Link
                    key={c.id}
                    href={`/dashboard/campaigns/${c.id}`}
                    className="rounded-lg border bg-card p-5 text-card-foreground opacity-80 hover:bg-muted/40"
                  >
                    <div className="truncate text-base font-medium">{c.name}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {c.system}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
      </div>
    </div>
  );
}
