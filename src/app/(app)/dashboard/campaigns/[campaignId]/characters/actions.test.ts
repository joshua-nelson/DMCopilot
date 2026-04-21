import { beforeEach, describe, expect, it, vi } from "vitest";

import { RedirectError } from "@/test/mocks/nextRedirectMock";
import {
  createSupabaseAdminMock,
  getQueryCalls,
  hasEqCall,
  type SupabaseAdminMock,
  type SupabaseResponse,
} from "@/test/mocks/supabaseAdminMock";

// eslint-disable-next-line no-var
var revalidatePath: ReturnType<typeof vi.fn>;
// eslint-disable-next-line no-var
var supabase: SupabaseAdminMock;
// eslint-disable-next-line no-var
var getCampaignForUser: ReturnType<typeof vi.fn>;

vi.mock("next/navigation", () => ({
  redirect: (url: string): never => {
    throw new RedirectError(url);
  },
}));
vi.mock("next/cache", () => {
  revalidatePath = vi.fn();
  return { revalidatePath };
});
vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdminClient: () => supabase.client,
}));
vi.mock("@/app/(app)/dashboard/campaigns/actions", () => ({
  getCampaignForUser: (getCampaignForUser = vi.fn()),
}));

import {
  createCharacter,
  deleteCharacter,
  getCharacter,
  listCharacters,
  updateCharacter,
} from "./actions";

function queueCharactersResponse(response: SupabaseResponse) {
  supabase.queueResponse("characters", response);
}

describe("characters server actions", () => {
  beforeEach(() => {
    revalidatePath.mockReset();
    supabase = createSupabaseAdminMock();
    getCampaignForUser.mockReset();
  });

  it("listCharacters scopes by campaign_id (and optional type)", async () => {
    getCampaignForUser.mockResolvedValue({ id: "camp_1" });
    queueCharactersResponse({ data: [], error: null });

    await listCharacters("camp_1", { type: "npc" });
    expect(hasEqCall(supabase, "characters", "campaign_id", "camp_1")).toBe(true);
    expect(hasEqCall(supabase, "characters", "type", "npc")).toBe(true);
  });

  it("getCharacter scopes by id + campaign_id", async () => {
    getCampaignForUser.mockResolvedValue({ id: "camp_1" });
    queueCharactersResponse({ data: null, error: null });

    await getCharacter("camp_1", "char_1");
    expect(hasEqCall(supabase, "characters", "id", "char_1")).toBe(true);
    expect(hasEqCall(supabase, "characters", "campaign_id", "camp_1")).toBe(true);
  });

  it("createCharacter validates bounds (current HP cannot exceed max)", async () => {
    getCampaignForUser.mockResolvedValue({ id: "camp_1" });
    const res = await createCharacter("camp_1", {
      name: "Hero",
      hp_current: 11,
      hp_max: 10,
    });
    expect(res).toEqual({ ok: false, error: "Current HP cannot exceed Max HP." });
    expect(supabase.queries.length).toBe(0);
  });

  it("createCharacter inserts with campaign_id scoping", async () => {
    getCampaignForUser.mockResolvedValue({ id: "camp_1" });
    queueCharactersResponse({ data: { id: "char_1", campaign_id: "camp_1" }, error: null });

    const res = await createCharacter("camp_1", { name: "Hero", type: "pc" });
    expect(res.ok).toBe(true);

    const q = getQueryCalls(supabase, "characters")[0];
    const insertCall = q.calls.find((c) => c.method === "insert");
    expect(insertCall?.args[0]).toMatchObject({ campaign_id: "camp_1", name: "Hero" });
  });

  it("updateCharacter scopes by id + campaign_id and sets is_npc when type changes", async () => {
    getCampaignForUser.mockResolvedValue({ id: "camp_1" });
    queueCharactersResponse({
      data: { id: "char_1", campaign_id: "camp_1", type: "npc", is_npc: true },
      error: null,
    });

    const res = await updateCharacter("camp_1", "char_1", { type: "npc" });
    expect(res.ok).toBe(true);
    expect(hasEqCall(supabase, "characters", "id", "char_1")).toBe(true);
    expect(hasEqCall(supabase, "characters", "campaign_id", "camp_1")).toBe(true);

    const q = getQueryCalls(supabase, "characters")[0];
    const updateCall = q.calls.find((c) => c.method === "update");
    expect(updateCall?.args[0]).toMatchObject({ is_npc: true });
  });

  it("deleteCharacter scopes by id + campaign_id", async () => {
    getCampaignForUser.mockResolvedValue({ id: "camp_1" });
    queueCharactersResponse({ data: null, error: null });

    const res = await deleteCharacter("camp_1", "char_1");
    expect(res).toEqual({ ok: true, data: null });
    expect(hasEqCall(supabase, "characters", "id", "char_1")).toBe(true);
    expect(hasEqCall(supabase, "characters", "campaign_id", "camp_1")).toBe(true);
  });
});
