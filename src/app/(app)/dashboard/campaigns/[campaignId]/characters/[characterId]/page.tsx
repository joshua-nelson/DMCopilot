import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { getUserProfileByClerkUserId } from "@/lib/user-profiles";
import { getCampaignForUser } from "@/app/(app)/dashboard/campaigns/actions";
import {
  getCharacter,
  type CharacterRow,
  type CharacterType,
} from "@/app/(app)/dashboard/campaigns/[campaignId]/characters/actions";

export const dynamic = "force-dynamic";

function coerceType(value: string): CharacterType {
  if (value === "pc" || value === "npc" || value === "monster") return value;
  return "pc";
}

function typeLabel(type: CharacterType) {
  if (type === "pc") return "PC";
  if (type === "npc") return "NPC";
  return "Monster";
}

function formatHp(character: CharacterRow) {
  if (character.hp_current === null && character.hp_max === null) return "—";
  return `${character.hp_current ?? "—"}/${character.hp_max ?? "—"}`;
}

function renderStat(label: string, value: ReactNode) {
  return (
    <div className="rounded-md border bg-muted/20 px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}

export default async function CharacterViewPage({
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

  const type = coerceType(character.type);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
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

          <h1 className="mt-1 truncate text-2xl font-semibold">{character.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {typeLabel(type)}
            {character.class ? ` • ${character.class}` : ""}
            {` • Level ${character.level}`}
            {character.race ? ` • ${character.race}` : ""}
            {character.player_name ? ` • ${character.player_name}` : ""}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="ghost">
            <Link href={`/dashboard/campaigns/${campaignId}/characters`}>Back</Link>
          </Button>
          <Button asChild variant="outline">
            <Link
              href={`/dashboard/campaigns/${campaignId}/characters/${characterId}/edit`}
            >
              Edit
            </Link>
          </Button>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6 text-card-foreground">
        <div className="grid gap-3 sm:grid-cols-3">
          {renderStat("AC", character.ac ?? "—")}
          {renderStat("HP", formatHp(character))}
          {renderStat("Initiative", character.initiative_bonus)}
          {renderStat("Speed", character.speed ?? "—")}
          {renderStat("Type", typeLabel(type))}
          {renderStat("Level", character.level)}
        </div>

        <div className="mt-6">
          <div className="text-sm font-medium">Ability scores</div>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {renderStat("STR", character.str)}
            {renderStat("DEX", character.dex)}
            {renderStat("CON", character.con)}
            {renderStat("INT", character.int)}
            {renderStat("WIS", character.wis)}
            {renderStat("CHA", character.cha)}
          </div>
        </div>
      </div>
    </div>
  );
}
