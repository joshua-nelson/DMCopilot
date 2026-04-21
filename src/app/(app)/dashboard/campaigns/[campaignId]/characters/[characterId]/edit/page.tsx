import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { getUserProfileByClerkUserId } from "@/lib/user-profiles";
import { getCampaignForUser } from "@/app/(app)/dashboard/campaigns/actions";
import { CharacterForm } from "@/app/(app)/dashboard/campaigns/[campaignId]/characters/_components/character-form";
import { DeleteCharacterForm } from "@/app/(app)/dashboard/campaigns/[campaignId]/characters/_components/delete-character-form";
import {
  getCharacter,
  type CharacterType,
} from "@/app/(app)/dashboard/campaigns/[campaignId]/characters/actions";

export const dynamic = "force-dynamic";

function coerceType(value: string): CharacterType {
  if (value === "pc" || value === "npc" || value === "monster") return value;
  return "pc";
}

export default async function EditCharacterPage({
  params,
}: {
  params: Promise<{ campaignId: string; characterId: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const profile = await getUserProfileByClerkUserId(userId);
  if (!profile) redirect("/onboarding");

  const { campaignId, characterId } = await params;
  const campaign = await getCampaignForUser(campaignId);
  if (!campaign) notFound();

  const character = await getCharacter(campaignId, characterId);
  if (!character) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-sm text-muted-foreground">
            <Link
              href={`/dashboard/campaigns/${campaignId}/characters/${characterId}`}
              className="hover:underline"
            >
              {character.name}
            </Link>
            <span className="px-2">/</span>
            <span className="truncate">Edit</span>
          </div>
          <h1 className="mt-1 text-2xl font-semibold">Edit character</h1>
          <p className="mt-1 text-sm text-muted-foreground">{campaign.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost">
            <Link href={`/dashboard/campaigns/${campaignId}/characters/${characterId}`}>
              Back
            </Link>
          </Button>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6 text-card-foreground">
        <CharacterForm
          mode="edit"
          campaignId={campaignId}
          characterId={characterId}
          cancelHref={`/dashboard/campaigns/${campaignId}/characters/${characterId}`}
          initialValues={{
            name: character.name,
            type: coerceType(character.type),
            player_name: character.player_name ?? "",
            class: character.class ?? "",
            race: character.race ?? "",
            level: character.level ?? 1,
            str: character.str ?? 10,
            dex: character.dex ?? 10,
            con: character.con ?? 10,
            int: character.int ?? 10,
            wis: character.wis ?? 10,
            cha: character.cha ?? 10,
            hp_current: character.hp_current,
            hp_max: character.hp_max,
            ac: character.ac,
            initiative_bonus: character.initiative_bonus ?? 0,
            speed: character.speed,
          }}
        />
      </div>

      <DeleteCharacterForm campaignId={campaignId} characterId={characterId} />
    </div>
  );
}
