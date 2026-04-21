"use client";

import * as React from "react";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import {
  startEncounterFormAction,
  type CharacterRow,
} from "@/app/(app)/dashboard/campaigns/[campaignId]/sessions/[sessionId]/encounters/actions";

const inputClassName =
  "h-9 w-full rounded-md border bg-background px-2 text-sm shadow-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

const initialState = { error: null as string | null };

export function StartEncounterForm(props: {
  campaignId: string;
  sessionId: string;
  characters: Array<Pick<CharacterRow, "id" | "name" | "initiative_bonus">>;
}) {
  const action = startEncounterFormAction.bind(
    null,
    props.campaignId,
    props.sessionId,
  );
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Start new encounter</h2>
        <p className="text-sm text-muted-foreground">
          Select participants. Leave initiative blank to auto-roll.
        </p>
      </div>

      {state.error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {state.error}
        </div>
      ) : null}

      <form action={formAction} className="space-y-4">
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left">
                <th className="px-3 py-2">Add</th>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Init bonus</th>
                <th className="px-3 py-2">Initiative</th>
              </tr>
            </thead>
            <tbody>
              {props.characters.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      name="characterIds"
                      value={c.id}
                      className="h-4 w-4"
                    />
                  </td>
                  <td className="px-3 py-2 font-medium">{c.name}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {c.initiative_bonus ?? 0}
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      name={`initiative_${c.id}`}
                      placeholder="auto"
                      className={inputClassName}
                    />
                  </td>
                </tr>
              ))}
              {!props.characters.length ? (
                <tr>
                  <td className="px-3 py-4 text-sm text-muted-foreground" colSpan={4}>
                    No characters found for this campaign.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <Button type="submit" disabled={pending || props.characters.length === 0}>
          {pending ? "Starting…" : "Start encounter"}
        </Button>
      </form>
    </div>
  );
}
