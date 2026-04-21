import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { getUserProfileByClerkUserId } from "@/lib/user-profiles";
import { getCampaignForUser } from "@/app/(app)/dashboard/campaigns/actions";
import {
  listCharacters,
  type CharacterRow,
  type CharacterType,
} from "@/app/(app)/dashboard/campaigns/[campaignId]/characters/actions";

export const dynamic = "force-dynamic";

function typeLabel(type: CharacterType) {
  if (type === "pc") return "PC";
  if (type === "npc") return "NPC";
  return "Monster";
}

function typeBadgeClass(type: CharacterType) {
  if (type === "pc") return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  if (type === "npc") return "bg-blue-500/10 text-blue-700 dark:text-blue-300";
  return "bg-amber-500/10 text-amber-700 dark:text-amber-300";
}

function formatHp(character: CharacterRow) {
  if (character.hp_current === null && character.hp_max === null) return "—";
  return `${character.hp_current ?? "—"}/${character.hp_max ?? "—"}`;
}

export default async function CampaignCharactersPage({
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

  const characters = await listCharacters(campaignId);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold">Characters</h1>
          <p className="mt-1 text-sm text-muted-foreground">{campaign.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost">
            <Link href={`/dashboard/campaigns/${campaignId}`}>Back</Link>
          </Button>
          <Button asChild>
            <Link href={`/dashboard/campaigns/${campaignId}/characters/new`}>
              New character
            </Link>
          </Button>
        </div>
      </div>

      {characters.length ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {characters.map((c) => (
            <Link
              key={c.id}
              href={`/dashboard/campaigns/${campaignId}/characters/${c.id}`}
              className="rounded-lg border bg-card p-4 text-card-foreground hover:bg-muted/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="truncate text-sm font-medium">{c.name}</div>
                    <span
                      className={
                        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium " +
                        typeBadgeClass(c.type as CharacterType)
                      }
                    >
                      {typeLabel(c.type as CharacterType)}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {(c.class ? c.class : "—") + ` • Level ${c.level}`}
                    {c.player_name ? ` • ${c.player_name}` : ""}
                  </div>
                </div>

                <div className="shrink-0 text-right text-xs text-muted-foreground">
                  <div>AC: {c.ac ?? "—"}</div>
                  <div>HP: {formatHp(c)}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border bg-card p-6 text-card-foreground">
          <div className="text-sm font-medium">No characters yet</div>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first character to start tracking stats.
          </p>
          <div className="mt-4">
            <Button asChild>
              <Link href={`/dashboard/campaigns/${campaignId}/characters/new`}>
                New character
              </Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
