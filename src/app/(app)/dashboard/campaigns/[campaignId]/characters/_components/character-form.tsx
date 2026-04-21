"use client";

import * as React from "react";
import Link from "next/link";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import {
  createCharacterFormAction,
  updateCharacterFormAction,
  type CharacterFormState,
  type CharacterType,
} from "@/app/(app)/dashboard/campaigns/[campaignId]/characters/actions";

type CharacterFormValues = {
  name: string;
  type: CharacterType;
  player_name: string;
  class: string;
  race: string;
  level: number;
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
  hp_current: number | null;
  hp_max: number | null;
  ac: number | null;
  initiative_bonus: number;
  speed: number | null;
};

const initialState: CharacterFormState = { error: null };

const inputClassName =
  "h-10 w-full rounded-md border bg-background px-3 text-sm shadow-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

function numberDefault(value: number | null | undefined) {
  return value === null || value === undefined ? "" : value;
}

export function CharacterForm(props: {
  mode: "create" | "edit";
  campaignId: string;
  characterId?: string;
  initialValues: CharacterFormValues;
  cancelHref: string;
}) {
  const action =
    props.mode === "create"
      ? createCharacterFormAction.bind(null, props.campaignId)
      : updateCharacterFormAction.bind(
          null,
          props.campaignId,
          props.characterId ?? "",
        );

  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <div className="space-y-6">
      {state.error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {state.error}
        </div>
      ) : null}

      <form action={formAction} className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
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
              defaultValue={props.initialValues.name}
              className={inputClassName}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="type" className="text-sm font-medium">
              Type
            </label>
            <select
              id="type"
              name="type"
              defaultValue={props.initialValues.type}
              className={inputClassName}
            >
              <option value="pc">PC</option>
              <option value="npc">NPC</option>
              <option value="monster">Monster</option>
            </select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <label htmlFor="player_name" className="text-sm font-medium">
              Player name
            </label>
            <input
              id="player_name"
              name="player_name"
              type="text"
              maxLength={80}
              defaultValue={props.initialValues.player_name}
              className={inputClassName}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="class" className="text-sm font-medium">
              Class
            </label>
            <input
              id="class"
              name="class"
              type="text"
              maxLength={80}
              defaultValue={props.initialValues.class}
              className={inputClassName}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="race" className="text-sm font-medium">
              Race
            </label>
            <input
              id="race"
              name="race"
              type="text"
              maxLength={80}
              defaultValue={props.initialValues.race}
              className={inputClassName}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div className="space-y-2">
            <label htmlFor="level" className="text-sm font-medium">
              Level
            </label>
            <input
              id="level"
              name="level"
              type="number"
              min={1}
              defaultValue={props.initialValues.level}
              className={inputClassName}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="ac" className="text-sm font-medium">
              AC
            </label>
            <input
              id="ac"
              name="ac"
              type="number"
              min={0}
              max={50}
              defaultValue={numberDefault(props.initialValues.ac)}
              className={inputClassName}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="initiative_bonus" className="text-sm font-medium">
              Initiative
            </label>
            <input
              id="initiative_bonus"
              name="initiative_bonus"
              type="number"
              min={-30}
              max={30}
              defaultValue={props.initialValues.initiative_bonus}
              className={inputClassName}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="speed" className="text-sm font-medium">
              Speed
            </label>
            <input
              id="speed"
              name="speed"
              type="number"
              min={0}
              max={1000}
              defaultValue={numberDefault(props.initialValues.speed)}
              className={inputClassName}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="hp_current" className="text-sm font-medium">
              Current HP
            </label>
            <input
              id="hp_current"
              name="hp_current"
              type="number"
              min={0}
              max={9999}
              defaultValue={numberDefault(props.initialValues.hp_current)}
              className={inputClassName}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="hp_max" className="text-sm font-medium">
              Max HP
            </label>
            <input
              id="hp_max"
              name="hp_max"
              type="number"
              min={0}
              max={9999}
              defaultValue={numberDefault(props.initialValues.hp_max)}
              className={inputClassName}
            />
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4 text-card-foreground">
          <div className="text-sm font-medium">Ability scores</div>
          <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {([
              ["str", "STR"],
              ["dex", "DEX"],
              ["con", "CON"],
              ["int", "INT"],
              ["wis", "WIS"],
              ["cha", "CHA"],
            ] as const).map(([key, label]) => (
              <div key={key} className="space-y-2">
                <label htmlFor={key} className="text-xs font-medium text-muted-foreground">
                  {label}
                </label>
                <input
                  id={key}
                  name={key}
                  type="number"
                  min={1}
                  max={30}
                  defaultValue={props.initialValues[key]}
                  className={inputClassName}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={pending}>
            {pending
              ? props.mode === "create"
                ? "Creating…"
                : "Saving…"
              : props.mode === "create"
                ? "Create character"
                : "Save changes"}
          </Button>
          <Button asChild type="button" variant="ghost">
            <Link href={props.cancelHref}>Cancel</Link>
          </Button>
        </div>
      </form>

      {props.mode === "create" ? (
        <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
          Skills, saves, spell slots, and features will be added in a later phase.
        </div>
      ) : null}
    </div>
  );
}
