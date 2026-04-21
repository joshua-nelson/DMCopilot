type BuildSessionSummaryPromptInput = {
  notesMd: string;
  encounterSummary?: string | null;
};

function truncateForPrompt(value: string, maxChars: number): string {
  const v = value ?? "";
  if (v.length <= maxChars) return v;
  return `${v.slice(0, maxChars)}\n\n[TRUNCATED: ${v.length - maxChars} chars omitted]`;
}

/**
 * Build prompt text for generating a post-session summary JSON.
 *
 * IMPORTANT: caller should still enforce the schema (tool call + zod) before storing.
 */
export function buildSessionSummaryPrompt(input: BuildSessionSummaryPromptInput): string {
  const notes = truncateForPrompt(input.notesMd ?? "", 20_000);
  const encounter = (input.encounterSummary ?? "").trim();

  return [
    "You are generating a post-session summary for a tabletop RPG session.",
    "",
    "You MUST output data that matches the exact JSON schema below.",
    "- Output MUST be valid JSON.",
    "- Output MUST be a single JSON object.",
    "- Do NOT wrap in markdown fences.",
    "- Do NOT include commentary, explanations, or extra keys.",
    "- Keep fields short, structured, and concrete.",
    "",
    "Schema (all keys required):",
    "{",
    '  "events": Array<{ "type": "combat"|"discovery"|"decision"|"npc_met", "description": string }>,',
    '  "npcs_encountered": Array<{ "name": string, "role": string, "relationship": string }>,',
    '  "loot_gained": Array<{ "item": string, "quantity": number }>,',
    '  "decisions_made": Array<{ "choice": string, "consequence"?: string }>,',
    '  "unresolved_threads": Array<{ "thread": string, "last_mentioned": string }>,',
    '  "next_session_hooks": Array<string>',
    "}",
    "",
    "Guidelines:",
    "- Prefer 0–8 items per list. Use [] if none.",
    "- Use plain names (no honorifics unless important).",
    "- For relationship, use short phrases (e.g., 'friendly', 'hostile', 'unknown', 'ally', 'patron').",
    "- For last_mentioned, use a short clue like 'during final scene at the tavern' (not a date unless stated).",
    "",
    encounter ? `Lightweight combat context:\n${encounter}` : "",
    "",
    "Session notes (markdown, may be messy/incomplete):",
    notes.trim().length ? notes : "(no notes)",
  ]
    .filter((p) => p.trim().length > 0)
    .join("\n");
}
