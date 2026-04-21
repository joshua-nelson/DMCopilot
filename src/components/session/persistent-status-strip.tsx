import Link from "next/link";
import { Dice5, Pause, UserPlus } from "lucide-react";

import { getCampaignForUser } from "@/app/(app)/dashboard/campaigns/actions";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

import { PlayerStatusRow } from "./player-status-row";

type CharacterStripRow = {
  id: string;
  name: string;
  hp_current: number | null;
  hp_max: number | null;
  ac: number | null;
  conditions: string[];
};

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function normalizeConditions(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(isNonEmptyString)
    .map((c) => c.trim())
    .filter((c) => c.length > 0);
}

function parseEncounterParticipantConditions(rawParticipants: unknown) {
  const byId = new Map<string, string[]>();
  if (!Array.isArray(rawParticipants)) return byId;

  for (const item of rawParticipants) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const characterId = rec.character_id;
    if (!isNonEmptyString(characterId)) continue;

    const conditions = normalizeConditions(rec.conditions);
    byId.set(characterId.trim(), conditions);
  }

  return byId;
}

export async function PersistentStatusStrip({
  campaignId,
  sessionId,
}: {
  campaignId: string;
  sessionId: string;
}) {
  const campaign = await getCampaignForUser(campaignId);
  if (!campaign) return null;

  const supabase = getSupabaseAdminClient();

  const [
    { data: characters, error: charactersError },
    { data: activeEncounter, error: activeEncounterError },
  ] = await Promise.all([
    supabase
      .from("characters")
      .select("id, name, hp_current, hp_max, ac, conditions")
      .eq("campaign_id", campaignId)
      .eq("type", "pc")
      .order("created_at", { ascending: false }),
    supabase
      .from("encounters")
      .select("id, participants")
      .eq("campaign_id", campaignId)
      .eq("session_id", sessionId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (charactersError) throw charactersError;
  if (activeEncounterError) throw activeEncounterError;

  const encounterConditionsById = activeEncounter
    ? parseEncounterParticipantConditions(activeEncounter.participants)
    : new Map<string, string[]>();

  const rows: CharacterStripRow[] = (characters ?? []).map((c) => {
    const encounterConditions = encounterConditionsById.get(c.id);
    return {
      ...c,
      conditions: encounterConditions
        ? encounterConditions
        : normalizeConditions(c.conditions),
    };
  });

  return (
    <div className="grid h-full grid-cols-[auto_minmax(0,1fr)_auto] items-center">
      <div className="flex h-full items-center gap-2 border-r border-line-soft px-3.5 font-mono text-[11px] text-ink-3">
        <span className="h-[7px] w-[7px] rounded-full bg-bad shadow-[0_0_0_3px_oklch(0.66_0.15_20_/_0.18)]" />
        <span>● Live</span>
        {activeEncounter?.id ? (
          <Link
            href={`/dashboard/campaigns/${campaignId}/sessions/${sessionId}/encounters/${activeEncounter.id}`}
            className="ml-1 rounded bg-ember-soft px-1.5 py-0.5 text-ember hover:underline"
          >
            Combat
          </Link>
        ) : null}
      </div>

      <div className="flex min-w-0 items-stretch overflow-x-auto">
        {rows.length ? (
          rows.map((c) => (
            <PlayerStatusRow
              key={c.id}
              campaignId={campaignId}
              characterId={c.id}
              name={c.name}
              hpCurrent={c.hp_current}
              hpMax={c.hp_max}
              ac={c.ac}
              conditions={c.conditions}
            />
          ))
        ) : (
          <div className="px-4 py-2 text-[11px] text-ink-3">
            No PC characters yet.
          </div>
        )}
      </div>

      <div className="flex h-full items-center gap-1.5 border-l border-line-soft px-3.5">
        <QuickButton label="Roll">
          <Dice5 className="h-3.5 w-3.5" />
        </QuickButton>
        <QuickButton label="New NPC">
          <UserPlus className="h-3.5 w-3.5" />
        </QuickButton>
        <QuickButton label="Pause">
          <Pause className="h-3.5 w-3.5" />
        </QuickButton>
      </div>
    </div>
  );
}

function QuickButton({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className="grid h-8 w-8 place-items-center rounded-[var(--radius-sm)] border border-line-soft bg-bg-2 text-ink-2 hover:bg-bg-3 hover:text-ink-0"
    >
      {children}
    </button>
  );
}
