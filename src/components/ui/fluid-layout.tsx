"use client";

import * as React from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import {
  PHASE_PRESETS,
  type LayoutPreset,
  type SessionPhase,
} from "@/components/ui/fluid-layout-presets";
import { FluidLayoutProvider } from "@/components/ui/fluid-panel";

export type FluidPanelConfig = {
  id: string;
  defaultCollapsed?: boolean;
};

export type FluidLayoutRenderProps = {
  panelOrder: string[];
  collapsedPanels: Set<string>;
  togglePanel: (id: string) => void;
  resetToPreset: () => void;
  isDirty: boolean;
};

function uniq<T>(items: T[]) {
  return Array.from(new Set(items));
}

function arraysEqual(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function sanitizeOrder(order: string[], allowed: Set<string>) {
  const out: string[] = [];
  for (const id of order) {
    if (allowed.has(id) && !out.includes(id)) out.push(id);
  }
  for (const id of allowed) {
    if (!out.includes(id)) out.push(id);
  }
  return out;
}

function presetForPhase(phase: SessionPhase, allowed: Set<string>): LayoutPreset {
  const preset = PHASE_PRESETS[phase];
  return {
    order: sanitizeOrder(preset.order, allowed),
    collapsed: uniq(preset.collapsed).filter((id) => allowed.has(id)),
  };
}

type StoredLayout = {
  order?: unknown;
  collapsed?: unknown;
  dirty?: unknown;
};

function readStoredLayout(storageKey: string): StoredLayout | null {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as StoredLayout;
  } catch {
    return null;
  }
}

function coerceStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const out: string[] = [];
  for (const v of value) {
    if (typeof v === "string") out.push(v);
  }
  return out;
}

export function FluidLayout({
  storageKey,
  phase,
  panels,
  children,
}: {
  storageKey: string;
  phase: SessionPhase;
  panels: ReadonlyArray<FluidPanelConfig>;
  children: (renderProps: FluidLayoutRenderProps) => React.ReactNode;
}) {
  const allowedIds = React.useMemo(
    () => new Set(panels.map((p) => p.id)),
    [panels],
  );
  const preset = React.useMemo(() => presetForPhase(phase, allowedIds), [phase, allowedIds]);

  const [panelOrder, setPanelOrder] = React.useState<string[]>(preset.order);
  const [collapsedPanels, setCollapsedPanels] = React.useState<Set<string>>(
    () => new Set(preset.collapsed),
  );
  const [isDirty, setIsDirty] = React.useState(false);

  // Restore from storage on mount / storageKey change.
  React.useEffect(() => {
    const stored = readStoredLayout(storageKey);
    const storedOrder = stored ? coerceStringArray(stored.order) : null;
    const storedCollapsed = stored ? coerceStringArray(stored.collapsed) : null;
    const storedDirty = stored?.dirty === true;

    const nextOrder = sanitizeOrder(storedOrder ?? preset.order, allowedIds);
    const nextCollapsed = new Set(
      (storedCollapsed ?? preset.collapsed).filter((id) => allowedIds.has(id)),
    );

    setPanelOrder(nextOrder);
    setCollapsedPanels(nextCollapsed);

    const presetCollapsedSet = new Set(preset.collapsed);
    const differsFromPreset =
      !arraysEqual(nextOrder, preset.order) ||
      nextCollapsed.size !== presetCollapsedSet.size ||
      Array.from(nextCollapsed).some((id) => !presetCollapsedSet.has(id));

    setIsDirty(storedDirty || differsFromPreset);
  }, [storageKey, allowedIds, preset.order, preset.collapsed]);

  // Keep state valid if available panels change.
  React.useEffect(() => {
    setPanelOrder((prev) => sanitizeOrder(prev, allowedIds));
    setCollapsedPanels((prev) => {
      const next = new Set<string>();
      for (const id of prev) {
        if (allowedIds.has(id)) next.add(id);
      }
      return next;
    });
  }, [allowedIds]);

  // Phase change: apply preset only if not dirty.
  React.useEffect(() => {
    if (isDirty) return;
    setPanelOrder(preset.order);
    setCollapsedPanels(new Set(preset.collapsed));
  }, [phase, preset.order, preset.collapsed, isDirty]);

  // Persist.
  React.useEffect(() => {
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          order: panelOrder,
          collapsed: Array.from(collapsedPanels),
          dirty: isDirty,
        }),
      );
    } catch {
      // ignore
    }
  }, [storageKey, panelOrder, collapsedPanels, isDirty]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function togglePanel(id: string) {
    setCollapsedPanels((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setIsDirty(true);
  }

  function resetToPreset() {
    setPanelOrder(preset.order);
    setCollapsedPanels(new Set(preset.collapsed));
    setIsDirty(false);
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    if (active.id === over.id) return;

    setPanelOrder((items) => {
      const oldIndex = items.indexOf(String(active.id));
      const newIndex = items.indexOf(String(over.id));
      if (oldIndex === -1 || newIndex === -1) return items;
      return arrayMove(items, oldIndex, newIndex);
    });
    setIsDirty(true);
  }

  return (
    <FluidLayoutProvider value={{ collapsedPanels, togglePanel }}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext
          items={panelOrder}
          strategy={verticalListSortingStrategy}
        >
          {children({
            panelOrder,
            collapsedPanels,
            togglePanel,
            resetToPreset,
            isDirty,
          })}
        </SortableContext>
      </DndContext>
    </FluidLayoutProvider>
  );
}
