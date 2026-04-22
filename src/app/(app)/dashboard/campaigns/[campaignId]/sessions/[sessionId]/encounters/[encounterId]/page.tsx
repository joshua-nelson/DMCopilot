import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getUserProfileByClerkUserId } from "@/lib/user-profiles";
import { getCampaignForUser } from "@/app/(app)/dashboard/campaigns/actions";
import {
  getEncounter,
  moveParticipantFormAction,
  nextTurnFormAction,
  setActiveTurnFormAction,
  setParticipantConditionsFormAction,
  setParticipantConcentrationSpellFormAction,
  setParticipantHpVisibleFormAction,
  setParticipantTempHpFormAction,
  updateParticipantInitiativeFormAction,
} from "@/app/(app)/dashboard/campaigns/[campaignId]/sessions/[sessionId]/encounters/actions";
import { EndEncounterButton } from "@/app/(app)/dashboard/campaigns/[campaignId]/sessions/[sessionId]/encounters/_components/end-encounter-button";
import { HpAdjustCell } from "@/app/(app)/dashboard/campaigns/[campaignId]/sessions/[sessionId]/encounters/_components/hp-adjust-cell";
import type { Condition } from "@/app/(app)/dashboard/campaigns/[campaignId]/sessions/[sessionId]/encounters/actions";

export const dynamic = "force-dynamic";

const inputClassName =
  "h-9 w-full rounded-md border bg-background px-2 text-sm shadow-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

function conditionsToText(conditions: Condition[]) {
  return (conditions ?? [])
    .map((c) => (c.duration !== null ? `${c.name}:${c.duration}` : c.name))
    .join(", ");
}

export default async function EncounterTrackerPage({
  params,
  searchParams,
}: {
  params: Promise<{ campaignId: string; sessionId: string; encounterId: string }>;
  searchParams: Promise<{ concCheck?: string; concName?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const profile = await getUserProfileByClerkUserId(userId);
  if (!profile) redirect("/onboarding");

  const { campaignId, sessionId, encounterId } = await params;
  const { concCheck, concName } = await searchParams;
  const campaign = await getCampaignForUser(campaignId);
  if (!campaign) notFound();

  const supabase = getSupabaseAdminClient();
  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select("id, campaign_id, name")
    .eq("id", sessionId)
    .eq("campaign_id", campaignId)
    .maybeSingle();

  if (sessionError) throw sessionError;
  if (!session) notFound();

  const details = await getEncounter(campaignId, sessionId, encounterId);
  if (!details) notFound();

  const { encounter, participants } = details;
  const activeIdx = Math.max(
    0,
    Math.min(participants.length - 1, encounter.active_turn_idx ?? 0),
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const summaryJson = (encounter as any).summary_json as Record<string, unknown> | null | undefined;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-sm text-muted-foreground">
            <Link
              href={`/dashboard/campaigns/${campaignId}/sessions/${sessionId}`}
              className="hover:underline"
            >
              {session.name}
            </Link>
            <span className="px-2">/</span>
            <Link
              href={`/dashboard/campaigns/${campaignId}/sessions/${sessionId}/encounters`}
              className="hover:underline"
            >
              Encounters
            </Link>
            <span className="px-2">/</span>
            <span className="truncate">Combat tracker</span>
          </div>
          <h1 className="mt-1 truncate text-2xl font-semibold">Combat tracker</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Status: {encounter.status} • Round: {encounter.round}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {encounter.status === "active" ? (
            <>
              <form
                action={nextTurnFormAction.bind(null, campaignId, sessionId, encounterId)}
              >
                <Button type="submit">Next turn</Button>
              </form>
              <EndEncounterButton
                campaignId={campaignId}
                sessionId={sessionId}
                encounterId={encounterId}
              />
            </>
          ) : null}
        </div>
      </div>

      {/* Concentration check alert */}
      {concCheck && (
        <div className="rounded-lg border border-amber-400 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-600 dark:bg-amber-950 dark:text-amber-200">
          <strong>Concentration check required</strong> for {concName ?? "unknown"}: DC {concCheck}.{" "}
          <Link
            href={`/dashboard/campaigns/${campaignId}/sessions/${sessionId}/encounters/${encounterId}`}
            className="underline"
          >
            Dismiss
          </Link>
        </div>
      )}

      {/* End-combat summary */}
      {encounter.status === "completed" && summaryJson && (
        <div className="rounded-lg border bg-card p-5 text-card-foreground">
          <h2 className="mb-3 text-base font-semibold">Combat summary</h2>
          <dl className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Rounds</dt>
              <dd className="font-mono font-medium">{String(summaryJson.rounds_elapsed ?? "—")}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Total damage dealt</dt>
              <dd className="font-mono font-medium">{String(summaryJson.total_damage_dealt ?? "—")}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Knocked out</dt>
              <dd className="font-medium">
                {Array.isArray(summaryJson.knocked_out) && summaryJson.knocked_out.length > 0
                  ? (summaryJson.knocked_out as string[]).join(", ")
                  : "None"}
              </dd>
            </div>
          </dl>
        </div>
      )}

      <div className="rounded-lg border bg-card p-6 text-card-foreground">
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr className="text-left">
                  <th className="px-3 py-2">Turn</th>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Initiative</th>
                  <th className="px-3 py-2">HP</th>
                  <th className="px-3 py-2">AC</th>
                  <th className="px-3 py-2">Conditions</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {participants.map((p, idx) => {
                  const isActive = idx === activeIdx;
                  return (
                    <tr
                      key={p.character_id}
                      className={isActive ? "border-t bg-primary/5" : "border-t"}
                    >
                      {/* Turn */}
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">{idx + 1}</span>
                          {isActive ? (
                            <span className="rounded bg-primary/10 px-2 py-0.5 text-xs text-primary">
                              Active
                            </span>
                          ) : null}
                        </div>
                      </td>

                      {/* Name + concentration */}
                      <td className="px-3 py-2 font-medium">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Link
                            href={`/dashboard/campaigns/${campaignId}/characters/${p.character_id}`}
                            className="hover:underline"
                          >
                            {p.name}
                          </Link>
                          {p.concentration_spell && (
                            <span
                              title={`Concentrating: ${p.concentration_spell}`}
                              className="rounded bg-violet-100 px-1.5 py-0.5 text-[10px] text-violet-700 dark:bg-violet-950 dark:text-violet-300"
                            >
                              🔮 {p.concentration_spell}
                            </span>
                          )}
                        </div>
                        {/* Concentration form */}
                        <form
                          action={setParticipantConcentrationSpellFormAction.bind(
                            null,
                            campaignId,
                            sessionId,
                            encounterId,
                            p.character_id,
                          )}
                          className="mt-1 flex items-center gap-1"
                        >
                          <input
                            name="concentration_spell"
                            type="text"
                            placeholder="Spell name (or clear)"
                            defaultValue={p.concentration_spell ?? ""}
                            className="h-7 w-36 rounded border bg-background px-2 text-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          />
                          <Button type="submit" variant="ghost" size="sm" className="h-7 px-2 text-xs">
                            Set
                          </Button>
                        </form>
                      </td>

                      {/* Initiative */}
                      <td className="px-3 py-2">
                        <form
                          action={updateParticipantInitiativeFormAction.bind(
                            null,
                            campaignId,
                            sessionId,
                            encounterId,
                            p.character_id,
                          )}
                          className="flex items-center gap-2"
                        >
                          <input
                            name="initiative"
                            type="number"
                            defaultValue={p.initiative}
                            className={inputClassName}
                          />
                          <Button type="submit" variant="secondary">
                            Save
                          </Button>
                        </form>
                      </td>

                      {/* HP */}
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <HpAdjustCell
                            campaignId={campaignId}
                            characterId={p.character_id}
                            hpCurrent={p.hp_current}
                            hpMax={p.hp_max}
                            hpVisible={p.hp_visible}
                            tempHp={p.temp_hp}
                          />
                          {/* HP visibility toggle */}
                          <form
                            action={setParticipantHpVisibleFormAction.bind(
                              null,
                              campaignId,
                              sessionId,
                              encounterId,
                              p.character_id,
                              !p.hp_visible,
                            )}
                          >
                            <Button
                              type="submit"
                              variant="ghost"
                              size="sm"
                              title={p.hp_visible ? "Hide HP" : "Reveal HP"}
                              className="h-7 px-1.5 text-xs"
                            >
                              {p.hp_visible ? "👁" : "🙈"}
                            </Button>
                          </form>
                        </div>
                        {/* Temp HP */}
                        {p.temp_hp > 0 && (
                          <div className="mt-1 text-[11px] text-blue-600 dark:text-blue-400">
                            +{p.temp_hp} temp
                          </div>
                        )}
                        <form
                          action={setParticipantTempHpFormAction.bind(
                            null,
                            campaignId,
                            sessionId,
                            encounterId,
                            p.character_id,
                          )}
                          className="mt-1 flex items-center gap-1"
                        >
                          <input
                            name="temp_hp"
                            type="number"
                            min="0"
                            placeholder="Temp HP"
                            defaultValue={p.temp_hp || ""}
                            className="h-7 w-20 rounded border bg-background px-2 text-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          />
                          <Button type="submit" variant="ghost" size="sm" className="h-7 px-2 text-xs">
                            Set
                          </Button>
                        </form>
                      </td>

                      {/* AC */}
                      <td className="px-3 py-2 font-mono text-xs">
                        {p.ac === null ? "—" : p.ac}
                      </td>

                      {/* Conditions */}
                      <td className="px-3 py-2">
                        {/* Condition pills */}
                        {p.conditions.length > 0 && (
                          <div className="mb-1 flex flex-wrap gap-1">
                            {p.conditions.map((c, ci) => (
                              <span
                                key={ci}
                                className="inline-flex items-center gap-0.5 rounded bg-muted px-1.5 py-0.5 text-xs"
                              >
                                {c.name}
                                {c.duration !== null && (
                                  <span className="ml-0.5 rounded bg-amber-200 px-1 text-[10px] font-medium text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                                    {c.duration}r
                                  </span>
                                )}
                              </span>
                            ))}
                          </div>
                        )}
                        <form
                          action={setParticipantConditionsFormAction.bind(
                            null,
                            campaignId,
                            sessionId,
                            encounterId,
                            p.character_id,
                          )}
                          className="flex items-center gap-2"
                        >
                          <input
                            name="conditions"
                            type="text"
                            placeholder="prone, poisoned:3"
                            defaultValue={conditionsToText(p.conditions)}
                            className={inputClassName}
                          />
                          <Button type="submit" variant="secondary">
                            Save
                          </Button>
                        </form>
                      </td>

                      {/* Actions */}
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <form
                            action={setActiveTurnFormAction.bind(
                              null,
                              campaignId,
                              sessionId,
                              encounterId,
                              idx,
                            )}
                          >
                            <Button type="submit" variant="secondary">
                              Set active
                            </Button>
                          </form>
                          <div className="flex items-center gap-1">
                            <form
                              action={moveParticipantFormAction.bind(
                                null,
                                campaignId,
                                sessionId,
                                encounterId,
                                p.character_id,
                                "up",
                              )}
                            >
                              <Button type="submit" variant="outline">
                                ↑
                              </Button>
                            </form>
                            <form
                              action={moveParticipantFormAction.bind(
                                null,
                                campaignId,
                                sessionId,
                                encounterId,
                                p.character_id,
                                "down",
                              )}
                            >
                              <Button type="submit" variant="outline">
                                ↓
                              </Button>
                            </form>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {!participants.length ? (
                  <tr>
                    <td className="px-3 py-4 text-sm text-muted-foreground" colSpan={7}>
                      No participants.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="text-xs text-muted-foreground">
            Note: HP updates are saved to the character record. Conditions format: name or name:rounds (e.g. poisoned:3).
          </div>
        </div>
      </div>
    </div>
  );
}
