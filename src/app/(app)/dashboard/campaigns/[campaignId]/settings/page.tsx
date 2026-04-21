import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";

import { getUserProfileByClerkUserId } from "@/lib/user-profiles";
import { getCampaignForUser } from "@/app/(app)/dashboard/campaigns/actions";
import { CampaignSettingsForm } from "@/app/(app)/dashboard/campaigns/_components/campaign-settings-form";

export const dynamic = "force-dynamic";

export default async function CampaignSettingsPage({
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
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Campaign settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your campaign details.
        </p>
      </div>

      <div className="rounded-lg border bg-card p-6 text-card-foreground">
        <CampaignSettingsForm
          campaign={{
            id: campaign.id,
            name: campaign.name,
            system: campaign.system,
            description: campaign.description,
            isArchived: campaign.is_archived,
          }}
        />
      </div>
    </div>
  );
}
