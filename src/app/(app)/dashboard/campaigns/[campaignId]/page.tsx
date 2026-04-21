import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { getUserProfileByClerkUserId } from "@/lib/user-profiles";
import { getCampaignForUser } from "@/app/(app)/dashboard/campaigns/actions";
import { startSession } from "@/app/(app)/dashboard/campaigns/[campaignId]/sessions/actions";

export const dynamic = "force-dynamic";

export default async function CampaignDashboardPage({
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

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold">{campaign.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            System: {campaign.system}
            {campaign.is_archived ? " • Archived" : ""}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/dashboard/campaigns/${campaign.id}/settings`}>Settings</Link>
        </Button>
      </div>

      <div className="rounded-lg border bg-card p-6 text-card-foreground">
        {campaign.description ? (
          <p className="text-sm text-muted-foreground">{campaign.description}</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            No description yet.
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button asChild variant="secondary">
            <Link href={`/dashboard/campaigns/${campaign.id}/sessions`}>Sessions</Link>
          </Button>

          <form action={startSession.bind(null, campaign.id)}>
            <Button type="submit">Start session</Button>
          </form>
        </div>
      </div>
    </div>
  );
}
