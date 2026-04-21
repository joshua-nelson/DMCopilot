"use client";

import * as React from "react";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import {
  deleteCharacterFormAction,
  type CharacterFormState,
} from "@/app/(app)/dashboard/campaigns/[campaignId]/characters/actions";

const initialState: CharacterFormState = { error: null };

export function DeleteCharacterForm(props: {
  campaignId: string;
  characterId: string;
}) {
  const [state, action, pending] = useActionState(
    deleteCharacterFormAction.bind(null, props.campaignId, props.characterId),
    initialState,
  );

  return (
    <div className="rounded-lg border border-destructive/30 p-4">
      <div className="text-sm font-medium text-destructive">Delete character</div>
      <p className="mt-1 text-sm text-muted-foreground">
        This permanently deletes the character.
      </p>

      {state.error ? (
        <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {state.error}
        </div>
      ) : null}

      <form action={action} className="mt-4 space-y-3">
        <div className="space-y-2">
          <label htmlFor="confirmation" className="text-sm font-medium">
            Type DELETE to confirm
          </label>
          <input
            id="confirmation"
            name="confirmation"
            type="text"
            autoComplete="off"
            className="h-10 w-full rounded-md border bg-background px-3 text-sm shadow-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>

        <Button type="submit" variant="destructive" disabled={pending}>
          {pending ? "Deleting…" : "Delete character"}
        </Button>
      </form>
    </div>
  );
}
