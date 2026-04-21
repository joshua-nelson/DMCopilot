export type SessionPhase = "prep" | "exploration" | "roleplay" | "combat";

export type LayoutPreset = {
  order: string[];
  collapsed: string[];
};

// Panel ids used in the session view:
// "notes", "summary", "scene-context", "actions", "session-control"

export const PHASE_PRESETS: Record<SessionPhase, LayoutPreset> = {
  prep: {
    order: ["notes", "summary", "scene-context", "actions", "session-control"],
    collapsed: [],
  },
  exploration: {
    order: ["notes", "scene-context", "actions", "summary", "session-control"],
    collapsed: ["summary"],
  },
  roleplay: {
    order: ["notes", "scene-context", "actions", "summary", "session-control"],
    collapsed: ["summary"],
  },
  combat: {
    order: ["scene-context", "actions", "session-control", "notes", "summary"],
    collapsed: ["notes", "summary"],
  },
};
