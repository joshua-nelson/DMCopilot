"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ChevronDownIcon, PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { setCurrentCampaign } from "@/app/(app)/dashboard/campaigns/actions";

type CampaignOption = {
  id: string;
  name: string;
  isArchived: boolean;
};

export function CampaignSwitcherClient({
  campaigns,
  cookieCampaignId,
}: {
  campaigns: CampaignOption[];
  cookieCampaignId: string | null;
}) {
  const router = useRouter();
  const params = useParams<{ campaignId?: string }>();

  const routeCampaignId =
    typeof params?.campaignId === "string" ? params.campaignId : null;
  const currentCampaignId = routeCampaignId ?? cookieCampaignId;

  const currentCampaign = campaigns.find((c) => c.id === currentCampaignId);
  const currentLabel =
    currentCampaign?.name ?? (campaigns.length ? "Select campaign" : "Campaigns");

  React.useEffect(() => {
    if (!routeCampaignId) return;
    if (cookieCampaignId === routeCampaignId) return;
    if (!campaigns.some((c) => c.id === routeCampaignId)) return;

    void setCurrentCampaign(routeCampaignId);
  }, [routeCampaignId, cookieCampaignId, campaigns]);

  async function onSelectCampaign(id: string) {
    const result = await setCurrentCampaign(id);
    if (!result.ok) return;
    router.push(`/dashboard/campaigns/${id}`);
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" className="gap-2">
          <span className="max-w-[220px] truncate">{currentLabel}</span>
          <ChevronDownIcon className="size-4 opacity-70" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Campaign</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {campaigns.length === 0 ? (
          <div className="px-2 py-2 text-sm text-muted-foreground">
            No campaigns yet.
          </div>
        ) : (
          campaigns
            .filter((c) => !c.isArchived)
            .map((c) => (
              <DropdownMenuItem
                key={c.id}
                onSelect={(e) => {
                  e.preventDefault();
                  void onSelectCampaign(c.id);
                }}
              >
                <span className="truncate">{c.name}</span>
              </DropdownMenuItem>
            ))
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard/campaigns/new">
            <PlusIcon className="mr-1 size-4" />
            Create campaign
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
