import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getUserProfileByClerkUserId } from "@/lib/user-profiles";
import { getCampaignForUser } from "@/app/(app)/dashboard/campaigns/actions";
import {
  adjustCharacterHpFormAction,
  getEncounter,
  moveParticipantFormAction,
  nextTurnFormAction,
  setActiveTurnFormAction,
  setParticipantConditionsFormAction,
  updateParticipantInitiativeFormAction,
} from "@/app/(app)/dashboard/campaigns/[campaignId]/sessions/[sessionId]/encounters/actions";
import { EndEncounterButton } from "@/app/(app)/dashboard/campaigns/[campaignId]/sessions/[sessionId]/encounters/_components/end-encounter-button";

export const dynamic = "force-dynamic";

const inputClassName =
  "h-9 w-full rounded-md border bg-background px-2 text-sm shadow-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

function conditionsToText(conditions: string[]) {
  return (conditions ?? []).join(", ");
}

function hpText(hp_current: number | null, hp_max: number | null) {
  const cur = hp_current === null ? "—" : String(hp_current);
  const max = hp_max === null ? "—" : String(hp_max);
  return `${cur} / ${max}`;
}

export default async function EncounterTrackerPage({
  params,
}: {
  params: Promise<{ campaignId: string; sessionId: string; encounterId: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const profile = await getUserProfileByClerkUserId(userId);
  if (!profile) redirect("/onboarding");

  const { campaignId, sessionId, encounterId } = await params;
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
        </div>
      </div>

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
                      <td className="px-3 py-2 font-medium">
                        <Link
                          href={`/dashboard/campaigns/${campaignId}/characters/${p.character_id}`}
                          className="hover:underline"
                        >
                          {p.name}
                        </Link>
                      </td>
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
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <form
                            action={adjustCharacterHpFormAction.bind(
                              null,
                              campaignId,
                              p.character_id,
                              -1,
                            )}
                          >
                            <Button type="submit" variant="outline">
                              -
                            </Button>
                          </form>
                          <div className="min-w-[90px] text-center font-mono text-xs">
                            {hpText(p.hp_current, p.hp_max)}
                          </div>
                          <form
                            action={adjustCharacterHpFormAction.bind(
                              null,
                              campaignId,
                              p.character_id,
                              1,
                            )}
                          >
                            <Button type="submit" variant="outline">
                              +
                            </Button>
                          </form>
                        </div>
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">
                        {p.ac === null ? "—" : p.ac}
                      </td>
                      <td className="px-3 py-2">
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
                            placeholder="e.g. prone, poisoned"
                            defaultValue={conditionsToText(p.conditions)}
                            className={inputClassName}
                          />
                          <Button type="submit" variant="secondary">
                            Save
                          </Button>
                        </form>
                      </td>
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
            Note: HP updates are saved to the character record.
          </div>
        </div>
      </div>
    </div>
  );
}
