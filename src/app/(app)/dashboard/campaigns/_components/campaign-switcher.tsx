import "server-only";

import { auth } from "@clerk/nextjs/server";

import {
  getCurrentCampaignIdCookie,
  listCampaignsForUser,
} from "@/app/(app)/dashboard/campaigns/actions";

import { CampaignSwitcherClient } from "@/app/(app)/dashboard/campaigns/_components/campaign-switcher-client";

export async function CampaignSwitcher() {
  const { userId } = await auth();
  if (!userId) return null;

  const [campaigns, cookieCampaignId] = await Promise.all([
    listCampaignsForUser(),
    getCurrentCampaignIdCookie(),
  ]);

  return (
    <CampaignSwitcherClient
      campaigns={campaigns.map((c) => ({
        id: c.id,
        name: c.name,
        isArchived: c.is_archived,
      }))}
      cookieCampaignId={cookieCampaignId}
    />
  );
}
