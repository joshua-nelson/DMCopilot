import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RedirectError } from "@/test/mocks/nextRedirectMock";
import {
  createSupabaseAdminMock,
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
  endSession,
  listSessions,
  setSessionPhase,
  startSession,
  updateSessionNotes,
} from "./actions";

function queueSessionResponse(response: SupabaseResponse) {
  supabase.queueResponse("sessions", response);
}

describe("sessions server actions", () => {
  beforeEach(() => {
    revalidatePath.mockReset();
    supabase = createSupabaseAdminMock();
    getCampaignForUser.mockReset();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-02-03T04:05:06.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("listSessions returns [] when campaign not found", async () => {
    getCampaignForUser.mockResolvedValue(null);
    queueSessionResponse({ data: [{ id: "s1" }], error: null });

    const res = await listSessions("camp_1");
    expect(res).toEqual([]);
    expect(supabase.queries.length).toBe(0);
  });

  it("listSessions scopes by campaign_id", async () => {
    getCampaignForUser.mockResolvedValue({ id: "camp_1" });
    queueSessionResponse({ data: [], error: null });

    await listSessions("camp_1");
    expect(hasEqCall(supabase, "sessions", "campaign_id", "camp_1")).toBe(true);
  });

  it("startSession redirects to /dashboard when campaign not found", async () => {
    getCampaignForUser.mockResolvedValue(null);
    await expect(startSession("camp_1")).rejects.toMatchObject({ url: "/dashboard" });
  });

  it("startSession redirects to existing active session when present", async () => {
    getCampaignForUser.mockResolvedValue({ id: "camp_1" });
    queueSessionResponse({ data: { id: "sess_active" }, error: null });

    await expect(startSession("camp_1")).rejects.toMatchObject({
      url: "/dashboard/campaigns/camp_1/sessions/sess_active",
    });

    // Only the existence check should run
    expect(supabase.queries.filter((q) => q.table === "sessions").length).toBe(1);
    expect(hasEqCall(supabase, "sessions", "campaign_id", "camp_1")).toBe(true);
    expect(hasEqCall(supabase, "sessions", "status", "active")).toBe(true);
  });

  it("startSession creates a new session then redirects", async () => {
    getCampaignForUser.mockResolvedValue({ id: "camp_1" });
    queueSessionResponse({ data: null, error: null });
    queueSessionResponse({ data: { id: "sess_new" }, error: null });

    const p = startSession("camp_1");
    await expect(p).rejects.toBeInstanceOf(RedirectError);
    await expect(p).rejects.toMatchObject({
      url: "/dashboard/campaigns/camp_1/sessions/sess_new",
    });

    const insertQuery = supabase.queries.find(
      (q) => q.table === "sessions" && q.calls.some((c) => c.method === "insert"),
    );
    const insertCall = insertQuery?.calls.find((c) => c.method === "insert");
    expect(insertCall?.args[0]).toMatchObject({
      campaign_id: "camp_1",
      status: "active",
      phase: "prep",
      notes_md: "",
    });
  });

  it("setSessionPhase rejects invalid phases without DB calls", async () => {
    getCampaignForUser.mockResolvedValue({ id: "camp_1" });
    // @ts-expect-error - intentionally invalid
    const res = await setSessionPhase("camp_1", "sess_1", "bad-phase");
    expect(res).toEqual({ ok: false, error: "Invalid phase." });
    expect(supabase.queries.length).toBe(0);
  });

  it("endSession scopes by id + campaign_id", async () => {
    getCampaignForUser.mockResolvedValue({ id: "camp_1" });
    queueSessionResponse({ data: { id: "sess_1" }, error: null });
    const res = await endSession("camp_1", "sess_1");
    expect(res).toEqual({ ok: true, data: null });
    expect(hasEqCall(supabase, "sessions", "id", "sess_1")).toBe(true);
    expect(hasEqCall(supabase, "sessions", "campaign_id", "camp_1")).toBe(true);
  });

  it("updateSessionNotes scopes by id + campaign_id", async () => {
    getCampaignForUser.mockResolvedValue({ id: "camp_1" });
    queueSessionResponse({ data: { id: "sess_1" }, error: null });
    const res = await updateSessionNotes("camp_1", "sess_1", "Hello");
    expect(res).toEqual({ ok: true, data: null });
    expect(hasEqCall(supabase, "sessions", "id", "sess_1")).toBe(true);
    expect(hasEqCall(supabase, "sessions", "campaign_id", "camp_1")).toBe(true);
  });
});
