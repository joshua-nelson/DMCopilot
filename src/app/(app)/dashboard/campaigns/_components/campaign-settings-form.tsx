"use client";

import * as React from "react";
import Link from "next/link";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import {
  archiveCampaignFormAction,
  deleteCampaignFormAction,
  type CampaignFormState,
  updateCampaignFormAction,
} from "@/app/(app)/dashboard/campaigns/actions";

type Campaign = {
  id: string;
  name: string;
  system: string;
  description: string | null;
  isArchived: boolean;
};

const initialState: CampaignFormState = { error: null };

export function CampaignSettingsForm({ campaign }: { campaign: Campaign }) {
  const [updateState, updateAction, updatePending] = useActionState(
    updateCampaignFormAction.bind(null, campaign.id),
    initialState,
  );

  const [archiveState, archiveAction, archivePending] = useActionState(
    archiveCampaignFormAction,
    initialState,
  );

  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteCampaignFormAction,
    initialState,
  );

  const topError = updateState.error ?? archiveState.error ?? deleteState.error;

  return (
    <div className="space-y-8">
      {topError ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {topError}
        </div>
      ) : null}

      <form action={updateAction} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium">
            Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            minLength={2}
            maxLength={80}
            defaultValue={campaign.name}
            className="h-10 w-full rounded-md border bg-background px-3 text-sm shadow-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="system" className="text-sm font-medium">
            System
          </label>
          <input
            id="system"
            name="system"
            type="text"
            maxLength={40}
            defaultValue={campaign.system}
            className="h-10 w-full rounded-md border bg-background px-3 text-sm shadow-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="description" className="text-sm font-medium">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            maxLength={2000}
            rows={6}
            defaultValue={campaign.description ?? ""}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={updatePending}>
            {updatePending ? "Saving…" : "Save changes"}
          </Button>
          <Button asChild type="button" variant="ghost">
            <Link href={`/dashboard/campaigns/${campaign.id}`}>Back</Link>
          </Button>
        </div>
      </form>

      <div className="rounded-lg border p-4">
        <div className="text-sm font-medium">Archive</div>
        <p className="mt-1 text-sm text-muted-foreground">
          Archived campaigns are hidden from the switcher by default.
        </p>

        <form action={archiveAction} className="mt-4">
          <input type="hidden" name="campaignId" value={campaign.id} />
          <input
            type="hidden"
            name="isArchived"
            value={campaign.isArchived ? "false" : "true"}
          />
          <Button
            type="submit"
            variant="secondary"
            disabled={archivePending}
          >
            {archivePending
              ? campaign.isArchived
                ? "Unarchiving…"
                : "Archiving…"
              : campaign.isArchived
                ? "Unarchive campaign"
                : "Archive campaign"}
          </Button>
        </form>
      </div>

      <div className="rounded-lg border border-destructive/30 p-4">
        <div className="text-sm font-medium text-destructive">
          Delete campaign
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          This permanently deletes the campaign and all related data.
        </p>

        <form action={deleteAction} className="mt-4 space-y-3">
          <input type="hidden" name="campaignId" value={campaign.id} />

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

          <Button type="submit" variant="destructive" disabled={deletePending}>
            {deletePending ? "Deleting…" : "Delete campaign"}
          </Button>
        </form>
      </div>
    </div>
  );
}
