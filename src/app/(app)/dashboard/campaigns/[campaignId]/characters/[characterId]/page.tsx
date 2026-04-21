import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { getUserProfileByClerkUserId } from "@/lib/user-profiles";
import { getCampaignForUser } from "@/app/(app)/dashboard/campaigns/actions";
import {
  getCharacter,
  type CharacterRow,
  type CharacterType,
  type InventoryItem,
  type SpellSlots,
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

const spellSlotsSchema: z.ZodType<SpellSlots> = z.record(
  z.string(),
  z.object({ total: z.number(), used: z.number() }),
);

const inventorySchema = z.array(
  z.object({
    id: z.string(),
    name: z.string(),
    quantity: z.number(),
    description: z.string().optional().nullable(),
  }),
);

function parseSpellSlots(value: unknown): SpellSlots {
  const parsed = spellSlotsSchema.safeParse(value);
  return parsed.success ? parsed.data : {};
}

function parseInventory(value: unknown): InventoryItem[] {
  const parsed = inventorySchema.safeParse(value);
  if (!parsed.success) return [];
  return parsed.data.map((i) => ({
    id: i.id,
    name: i.name,
    quantity: i.quantity,
    description: i.description ?? undefined,
  }));
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
  const spellSlots = parseSpellSlots(character.spell_slots);
  const inventory = parseInventory(character.inventory);
  const spellLevels = Array.from({ length: 9 })
    .map((_, idx) => String(idx + 1))
    .filter((level) => (spellSlots[level]?.total ?? 0) > 0);

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

        {spellLevels.length ? (
          <div className="mt-6">
            <div className="text-sm font-medium">Spell slots</div>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {spellLevels.map((level) => {
                const entry = spellSlots[level];
                const total = entry?.total ?? 0;
                const used = Math.max(0, Math.min(entry?.used ?? 0, total));
                return (
                  <div
                    key={level}
                    className="flex items-center justify-between gap-3 rounded-md border bg-muted/10 px-3 py-2"
                  >
                    <div className="text-xs font-medium text-muted-foreground">
                      Level {level}
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      {Array.from({ length: total }).map((_, idx) => (
                        <span
                          key={idx}
                          className={
                            "inline-block size-2 rounded-full " +
                            (idx < used
                              ? "bg-foreground/80"
                              : "border border-muted-foreground/40")
                          }
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="mt-6">
          <div className="text-sm font-medium">Inventory</div>
          {inventory.length ? (
            <div className="mt-3 overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/20 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Item</th>
                    <th className="px-3 py-2 text-right font-medium">Qty</th>
                    <th className="px-3 py-2 text-left font-medium">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.map((item) => (
                    <tr key={item.id} className="border-t">
                      <td className="px-3 py-2 font-medium">{item.name}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {item.quantity}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {item.description?.length ? item.description : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="mt-3 text-sm text-muted-foreground">No items.</div>
          )}
        </div>
      </div>
    </div>
  );
}
