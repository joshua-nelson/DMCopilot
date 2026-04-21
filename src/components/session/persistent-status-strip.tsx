import Link from "next/link";

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
  // Ensures the user is signed in and owns this campaign.
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
      conditions: encounterConditions ? encounterConditions : normalizeConditions(c.conditions),
    };
  });

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="text-xs text-muted-foreground">Players</div>
        {activeEncounter?.id ? (
          <Link
            href={`/dashboard/campaigns/${campaignId}/sessions/${sessionId}/encounters/${activeEncounter.id}`}
            className="rounded bg-primary/10 px-2 py-0.5 text-xs text-primary hover:underline"
          >
            Combat active
          </Link>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto py-1">
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
          <div className="text-xs text-muted-foreground">No PC characters yet.</div>
        )}
      </div>
    </div>
  );
}
