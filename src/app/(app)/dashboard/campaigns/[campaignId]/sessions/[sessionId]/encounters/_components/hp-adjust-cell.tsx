"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  adjustCharacterHp,
  setCharacterHp,
} from "@/app/(app)/dashboard/campaigns/[campaignId]/sessions/[sessionId]/encounters/actions";

type Props = {
  campaignId: string;
  characterId: string;
  hpCurrent: number | null;
  hpMax: number | null;
  hpVisible: boolean;
  tempHp: number;
};

function hpDisplayText(
  hpCurrent: number | null,
  hpMax: number | null,
  hpVisible: boolean,
  tempHp: number,
): string {
  if (!hpVisible) return "???";
  const cur = hpCurrent === null ? "—" : String(hpCurrent);
  const max = hpMax === null ? "—" : String(hpMax);
  const tempStr = tempHp > 0 ? ` +${tempHp}` : "";
  return `${cur} / ${max}${tempStr}`;
}

/**
 * Parse the HP input string.
 *
 * Rules:
 *   +N  → heal N (delta = +N)
 *   -N  → deal N damage (delta = -N)
 *    N  → set HP to exactly N (absolute)
 *
 * Returns null on invalid input.
 */
function parseHpInput(
  raw: string,
): { mode: "delta"; value: number } | { mode: "absolute"; value: number } | null {
  const s = raw.trim();
  if (!s) return null;

  if (s.startsWith("+")) {
    const n = parseInt(s.slice(1), 10);
    if (!Number.isFinite(n) || n < 0) return null;
    return { mode: "delta", value: n };
  }

  if (s.startsWith("-")) {
    const n = parseInt(s.slice(1), 10);
    if (!Number.isFinite(n) || n < 0) return null;
    return { mode: "delta", value: -n };
  }

  const n = parseInt(s, 10);
  if (!Number.isFinite(n) || n < 0) return null;
  return { mode: "absolute", value: n };
}

export function HpAdjustCell({
  campaignId,
  characterId,
  hpCurrent,
  hpMax,
  hpVisible,
  tempHp,
}: Props) {
  const router = useRouter();
  const [editing, setEditing] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  // Prevent double-commit when Enter fires then blur fires.
  const didSubmitRef = React.useRef(false);

  function doAdjust(delta: number) {
    setError(null);
    startTransition(async () => {
      const result = await adjustCharacterHp(campaignId, characterId, delta);
      if (!result.ok) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  function openEditor() {
    didSubmitRef.current = false;
    setInputValue("");
    setError(null);
    setEditing(true);
  }

  function cancelEdit() {
    didSubmitRef.current = true; // block any in-flight blur from re-submitting
    setEditing(false);
    setError(null);
  }

  function commitEdit() {
    if (didSubmitRef.current) {
      didSubmitRef.current = false;
      return;
    }

    const parsed = parseHpInput(inputValue);
    if (!parsed) {
      setError("+5 heal · −8 damage · 35 set");
      return;
    }

    didSubmitRef.current = true;
    setEditing(false);
    setError(null);

    startTransition(async () => {
      const result =
        parsed.mode === "delta"
          ? await adjustCharacterHp(campaignId, characterId, parsed.value)
          : await setCharacterHp(campaignId, characterId, parsed.value);

      if (!result.ok) {
        setError(result.error);
      } else {
        router.refresh();
      }
      didSubmitRef.current = false;
    });
  }

  // Keyboard shortcuts on the container (only when not editing).
  function handleContainerKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (editing) return;
    if (e.key === "+" || e.key === "=") {
      e.preventDefault();
      doAdjust(1);
    } else if (e.key === "-" || e.key === "_") {
      e.preventDefault();
      doAdjust(-1);
    } else if (e.key === "Enter" || e.key === "e") {
      e.preventDefault();
      openEditor();
    }
  }

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      commitEdit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelEdit();
    }
  }

  return (
    <div
      tabIndex={0}
      onKeyDown={handleContainerKeyDown}
      className="flex flex-col gap-0.5 rounded outline-none focus-visible:ring-1 focus-visible:ring-ring"
    >
      <div className="flex items-center gap-1">
        {/* −1 button */}
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          disabled={pending}
          onClick={() => doAdjust(-1)}
          aria-label="Deal 1 damage"
          title="Deal 1 damage (keyboard: −)"
        >
          −
        </Button>

        {editing ? (
          <input
            type="text"
            autoFocus
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setError(null);
            }}
            onKeyDown={handleInputKeyDown}
            onBlur={cancelEdit}
            placeholder="+5 / −8 / 35"
            aria-label="HP adjustment"
            className="h-7 w-24 rounded border bg-background px-2 font-mono text-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        ) : (
          <button
            type="button"
            onClick={openEditor}
            disabled={pending}
            title="Click to edit HP (keyboard: Enter or E)"
            className="min-w-[80px] rounded px-1 py-0.5 text-center font-mono text-xs hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            {hpDisplayText(hpCurrent, hpMax, hpVisible, tempHp)}
          </button>
        )}

        {/* +1 button */}
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          disabled={pending}
          onClick={() => doAdjust(1)}
          aria-label="Heal 1 HP"
          title="Heal 1 HP (keyboard: +)"
        >
          +
        </Button>
      </div>

      {error ? (
        <p role="alert" className="text-[10px] text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
