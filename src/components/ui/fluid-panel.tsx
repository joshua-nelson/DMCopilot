"use client";

import * as React from "react";
import type { DraggableSyntheticListeners } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronUp, GripVertical } from "lucide-react";

import { cn } from "@/lib/utils";

type FluidPanelProps = {
  id: string;
  title: string;
  count?: string;
  defaultCollapsed?: boolean;
  collapsible?: boolean;
  className?: string;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
};

type SortableFluidPanelProps = FluidPanelProps & {
  disabled?: boolean;
};

type FluidPanelDndContextValue =
  | {
      attributes: React.HTMLAttributes<HTMLElement>;
      listeners: DraggableSyntheticListeners;
      setActivatorNodeRef: (element: HTMLElement | null) => void;
    }
  | null;

const FluidPanelDndContext = React.createContext<FluidPanelDndContextValue>(null);

type FluidLayoutContextValue =
  | {
      collapsedPanels: Set<string>;
      togglePanel: (id: string) => void;
    }
  | null;

const FluidLayoutContext = React.createContext<FluidLayoutContextValue>(null);

export function FluidLayoutProvider({
  value,
  children,
}: {
  value: NonNullable<FluidLayoutContextValue>;
  children: React.ReactNode;
}) {
  return (
    <FluidLayoutContext.Provider value={value}>
      {children}
    </FluidLayoutContext.Provider>
  );
}

export function FluidPanel({
  id,
  title,
  count,
  defaultCollapsed,
  collapsible = true,
  className,
  headerActions,
  children,
}: FluidPanelProps) {
  const dnd = React.useContext(FluidPanelDndContext);
  const layout = React.useContext(FluidLayoutContext);

  const [uncontrolledCollapsed, setUncontrolledCollapsed] = React.useState(
    Boolean(defaultCollapsed),
  );

  const collapsed = collapsible
    ? layout
      ? layout.collapsedPanels.has(id)
      : uncontrolledCollapsed
    : false;

  function toggle() {
    if (!collapsible) return;
    if (layout) {
      layout.togglePanel(id);
      return;
    }
    setUncontrolledCollapsed((v) => !v);
  }

  const ChevronIcon = collapsed ? ChevronDown : ChevronUp;

  return (
    <section
      data-panel-id={id}
      className={cn(
        "rounded-[var(--radius)] border border-line-soft bg-bg-1",
        className,
      )}
    >
      <div
        role={collapsible ? "button" : undefined}
        tabIndex={collapsible ? 0 : -1}
        aria-expanded={collapsible ? !collapsed : undefined}
        onClick={toggle}
        onKeyDown={(e) => {
          if (!collapsible) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggle();
          }
        }}
        className={cn(
          "flex items-center justify-between border-b border-line-soft px-3 py-2",
          collapsible ? "cursor-pointer" : undefined,
        )}
      >
        <div className="flex min-w-0 items-center gap-2 text-[11.5px] font-medium uppercase tracking-[0.06em] text-ink-1">
          {dnd ? (
            <button
              type="button"
              aria-label="Drag panel"
              onClick={(e) => e.stopPropagation()}
              className="-ml-1 inline-flex items-center justify-center rounded-[6px] p-1 text-ink-3 hover:text-ink-1"
              ref={dnd.setActivatorNodeRef}
              {...dnd.attributes}
              {...dnd.listeners}
            >
              <GripVertical className="h-4 w-4" />
            </button>
          ) : null}
          <span className="truncate">{title}</span>
          {count ? (
            <span className="truncate font-mono text-[10.5px] font-normal text-ink-3">
              {count}
            </span>
          ) : null}
        </div>

        <div
          className="flex items-center gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          {headerActions}
          {collapsible ? (
            <ChevronIcon className="h-4 w-4 text-ink-3" />
          ) : null}
        </div>
      </div>

      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-200",
          collapsed ? "grid-rows-[0fr]" : "grid-rows-[1fr]",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="flex flex-col gap-2.5 p-3.5">{children}</div>
        </div>
      </div>
    </section>
  );
}

export function SortableFluidPanel({ disabled, ...props }: SortableFluidPanelProps) {
  const {
    attributes,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.id, disabled });

  return (
    <FluidPanelDndContext.Provider
      value={{ attributes, listeners, setActivatorNodeRef }}
    >
      <div
        ref={setNodeRef}
        style={{
          transform: CSS.Transform.toString(transform),
          transition,
        }}
        className={cn(isDragging ? "opacity-90" : undefined)}
        data-panel-id={props.id}
      >
        <FluidPanel {...props} />
      </div>
    </FluidPanelDndContext.Provider>
  );
}
