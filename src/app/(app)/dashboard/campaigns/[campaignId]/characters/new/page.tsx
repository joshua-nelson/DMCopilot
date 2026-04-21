import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { getUserProfileByClerkUserId } from "@/lib/user-profiles";
import { getCampaignForUser } from "@/app/(app)/dashboard/campaigns/actions";
import { CharacterForm } from "@/app/(app)/dashboard/campaigns/[campaignId]/characters/_components/character-form";

export const dynamic = "force-dynamic";

export default async function NewCharacterPage({
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
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-sm text-muted-foreground">
            <Link
              href={`/dashboard/campaigns/${campaignId}/characters`}
              className="hover:underline"
            >
              Characters
            </Link>
            <span className="px-2">/</span>
            <span className="truncate">{campaign.name}</span>
          </div>
          <h1 className="mt-1 text-2xl font-semibold">New character</h1>
        </div>
        <Button asChild variant="ghost">
          <Link href={`/dashboard/campaigns/${campaignId}/characters`}>Back</Link>
        </Button>
      </div>

      <div className="rounded-lg border bg-card p-6 text-card-foreground">
        <CharacterForm
          mode="create"
          campaignId={campaignId}
          cancelHref={`/dashboard/campaigns/${campaignId}/characters`}
          initialValues={{
            name: "",
            type: "pc",
            player_name: "",
            class: "",
            race: "",
            level: 1,
            str: 10,
            dex: 10,
            con: 10,
            int: 10,
            wis: 10,
            cha: 10,
            hp_current: null,
            hp_max: null,
            ac: null,
            initiative_bonus: 0,
            speed: null,
          }}
        />
      </div>
    </div>
  );
}
