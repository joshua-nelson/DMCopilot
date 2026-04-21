"use client";

import * as React from "react";
import Link from "next/link";
import { useActionState } from "react";
import { PlusIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  createCharacterFormAction,
  updateCharacterFormAction,
  type CharacterFormState,
  type CharacterType,
  type InventoryItem,
  type SpellSlots,
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
  spell_slots: SpellSlots;
  inventory: InventoryItem[];
};

const initialState: CharacterFormState = { error: null };

const inputClassName =
  "h-10 w-full rounded-md border bg-background px-3 text-sm shadow-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

function numberDefault(value: number | null | undefined) {
  return value === null || value === undefined ? "" : value;
}

function newInventoryId() {
  const id = globalThis.crypto?.randomUUID?.();
  if (typeof id === "string" && id.length) return id;
  return `inv_${Date.now()}_${Math.random().toString(16).slice(2)}`;
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

  const [inventoryRows, setInventoryRows] = React.useState<InventoryItem[]>(
    props.initialValues.inventory,
  );

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

        <div className="rounded-lg border bg-card p-4 text-card-foreground">
          <div className="text-sm font-medium">Spell Slots</div>
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            {Array.from({ length: 9 }).map((_, idx) => {
              const level = String(idx + 1);
              const current = props.initialValues.spell_slots[level] ?? { total: 0, used: 0 };
              return (
                <div key={level} className="space-y-2">
                  <label
                    htmlFor={`spell_slots_${level}_total`}
                    className="text-xs font-medium text-muted-foreground"
                  >
                    Level {level}
                  </label>
                  <input
                    id={`spell_slots_${level}_total`}
                    name={`spell_slots_${level}_total`}
                    type="number"
                    min={0}
                    max={99}
                    defaultValue={current.total}
                    className={inputClassName}
                  />
                  <input
                    type="hidden"
                    name={`spell_slots_${level}_used`}
                    defaultValue={current.used}
                  />
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4 text-card-foreground">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-medium">Inventory</div>
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={() =>
                setInventoryRows((prev) => [
                  ...prev,
                  { id: newInventoryId(), name: "", quantity: 1, description: "" },
                ])
              }
            >
              <PlusIcon className="size-4" />
              Add item
            </Button>
          </div>

          {inventoryRows.length ? (
            <div className="mt-3 space-y-3">
              {inventoryRows.map((item, idx) => (
                <div
                  key={item.id}
                  className="grid gap-3 rounded-md border bg-muted/10 p-3 sm:grid-cols-12 sm:items-end"
                >
                  <input type="hidden" name="inventory_id" defaultValue={item.id} />

                  <div className="space-y-2 sm:col-span-5">
                    <label
                      htmlFor={`inventory_name_${idx}`}
                      className="text-xs font-medium text-muted-foreground"
                    >
                      Name
                    </label>
                    <input
                      id={`inventory_name_${idx}`}
                      name="inventory_name"
                      type="text"
                      maxLength={120}
                      defaultValue={item.name}
                      className={inputClassName}
                    />
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <label
                      htmlFor={`inventory_quantity_${idx}`}
                      className="text-xs font-medium text-muted-foreground"
                    >
                      Qty
                    </label>
                    <input
                      id={`inventory_quantity_${idx}`}
                      name="inventory_quantity"
                      type="number"
                      min={0}
                      max={9999}
                      defaultValue={item.quantity}
                      className={inputClassName}
                    />
                  </div>

                  <div className="space-y-2 sm:col-span-4">
                    <label
                      htmlFor={`inventory_description_${idx}`}
                      className="text-xs font-medium text-muted-foreground"
                    >
                      Description
                    </label>
                    <input
                      id={`inventory_description_${idx}`}
                      name="inventory_description"
                      type="text"
                      maxLength={500}
                      defaultValue={item.description ?? ""}
                      className={inputClassName}
                    />
                  </div>

                  <div className="flex justify-end sm:col-span-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Remove item"
                      onClick={() =>
                        setInventoryRows((prev) => prev.filter((r) => r.id !== item.id))
                      }
                    >
                      <Trash2Icon className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-3 text-sm text-muted-foreground">No items.</div>
          )}
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
    </div>
  );
}
