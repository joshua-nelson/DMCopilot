"use client";

import * as React from "react";
import Link from "next/link";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import {
  createCampaignFormAction,
  type CampaignFormState,
} from "@/app/(app)/dashboard/campaigns/actions";

const initialState: CampaignFormState = { error: null };

export function CampaignCreateForm() {
  const [state, formAction, pending] = useActionState(
    createCampaignFormAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      {state.error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {state.error}
        </div>
      ) : null}

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
          placeholder="e.g. Lost Mine of Phandelver"
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
          defaultValue="d&d5e"
          placeholder="e.g. d&d5e"
          className="h-10 w-full rounded-md border bg-background px-3 text-sm shadow-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
        <p className="text-xs text-muted-foreground">
          This is a simple label for now.
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="description" className="text-sm font-medium">
          Description (optional)
        </label>
        <textarea
          id="description"
          name="description"
          maxLength={2000}
          rows={5}
          placeholder="What is this campaign about?"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create campaign"}
        </Button>
        <Button asChild type="button" variant="ghost">
          <Link href="/dashboard">Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
