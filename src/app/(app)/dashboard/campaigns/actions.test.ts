import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createCookieStoreMock, type CookieStoreMock } from "@/test/mocks/nextCookiesMock";
import { RedirectError } from "@/test/mocks/nextRedirectMock";
import {
  createSupabaseAdminMock,
  hasEqCall,
  type SupabaseAdminMock,
  type SupabaseResponse,
} from "@/test/mocks/supabaseAdminMock";

// Use `var` because Vitest hoists `vi.mock` calls.
// The mocks read these variables at runtime (inside tests), not at import time.
// eslint-disable-next-line no-var
var currentUserId: string | null = "user_1";
// eslint-disable-next-line no-var
var revalidatePath: ReturnType<typeof vi.fn>;
// eslint-disable-next-line no-var
var cookieStore: CookieStoreMock;
// eslint-disable-next-line no-var
var supabase: SupabaseAdminMock;

vi.mock("@clerk/nextjs/server", () => ({
  auth: async () => ({ userId: currentUserId }),
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string): never => {
    throw new RedirectError(url);
  },
}));
vi.mock("next/cache", () => {
  revalidatePath = vi.fn();
  return { revalidatePath };
});
vi.mock("next/headers", () => ({ cookies: async () => cookieStore }));
vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdminClient: () => supabase.client,
}));

import {
  createCampaign,
  createCampaignFormAction,
  deleteCampaign,
  getCampaignForUser,
  getCurrentCampaignIdCookie,
  listCampaignsForUser,
  setCampaignArchived,
  setCurrentCampaign,
  updateCampaign,
} from "./actions";

function queueCampaignResponse(response: SupabaseResponse) {
  supabase.queueResponse("campaigns", response);
}

describe("campaigns server actions", () => {
  beforeEach(() => {
    currentUserId = "user_1";
    cookieStore = createCookieStoreMock();
    supabase = createSupabaseAdminMock();
    revalidatePath.mockReset();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-02T03:04:05.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("listCampaignsForUser redirects when not authenticated", async () => {
    currentUserId = null;
    await expect(listCampaignsForUser()).rejects.toMatchObject({
      url: "/sign-in",
    });
  });

  it("listCampaignsForUser scopes by dm_user_id", async () => {
    queueCampaignResponse({ data: [], error: null });
    await listCampaignsForUser();

    expect(hasEqCall(supabase, "campaigns", "dm_user_id", "user_1")).toBe(true);
  });

  it("getCampaignForUser scopes by id + dm_user_id", async () => {
    queueCampaignResponse({ data: null, error: null });
    await getCampaignForUser("camp_1");

    expect(hasEqCall(supabase, "campaigns", "id", "camp_1")).toBe(true);
    expect(hasEqCall(supabase, "campaigns", "dm_user_id", "user_1")).toBe(true);
  });

  it("createCampaign rejects invalid input without DB calls", async () => {
    const res = await createCampaign({ name: "x" });
    expect(res.ok).toBe(false);
    expect(supabase.queries.length).toBe(0);
  });

  it("createCampaign inserts with dm_user_id and revalidates /dashboard", async () => {
    queueCampaignResponse({
      data: {
        id: "camp_1",
        dm_user_id: "user_1",
        name: "My Campaign",
      },
      error: null,
    });

    const res = await createCampaign({ name: "My Campaign", system: "d&d5e" });
    expect(res).toEqual({ ok: true, data: expect.any(Object) });

    const q = supabase.queries.find((x) => x.table === "campaigns");
    const insertCall = q?.calls.find((c) => c.method === "insert");
    expect(insertCall?.args[0]).toMatchObject({
      dm_user_id: "user_1",
      name: "My Campaign",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
  });

  it("updateCampaign scopes update by id + dm_user_id", async () => {
    queueCampaignResponse({ data: { id: "camp_1" }, error: null });
    const res = await updateCampaign("camp_1", { name: "New Name" });
    expect(res.ok).toBe(true);
    expect(hasEqCall(supabase, "campaigns", "id", "camp_1")).toBe(true);
    expect(hasEqCall(supabase, "campaigns", "dm_user_id", "user_1")).toBe(true);
  });

  it("updateCampaign returns not found when maybeSingle returns null", async () => {
    queueCampaignResponse({ data: null, error: null });
    const res = await updateCampaign("camp_missing", { name: "New Name" });
    expect(res).toEqual({ ok: false, error: "Campaign not found." });
  });

  it("setCampaignArchived scopes update by id + dm_user_id", async () => {
    queueCampaignResponse({ data: { id: "camp_1" }, error: null });
    const res = await setCampaignArchived("camp_1", true);
    expect(res.ok).toBe(true);
    expect(hasEqCall(supabase, "campaigns", "id", "camp_1")).toBe(true);
    expect(hasEqCall(supabase, "campaigns", "dm_user_id", "user_1")).toBe(true);
  });

  it("deleteCampaign clears dm_campaign_id cookie when deleting current campaign", async () => {
    cookieStore.set("dm_campaign_id", "camp_1", { path: "/dashboard" });
    queueCampaignResponse({ data: null, error: null });

    const res = await deleteCampaign("camp_1");
    expect(res).toEqual({ ok: true, data: null });

    expect(hasEqCall(supabase, "campaigns", "id", "camp_1")).toBe(true);
    expect(hasEqCall(supabase, "campaigns", "dm_user_id", "user_1")).toBe(true);
    expect(cookieStore._setCalls.some((c) => c.name === "dm_campaign_id" && c.value === "")).toBe(
      true,
    );
  });

  it("setCurrentCampaign verifies ownership then sets dm_campaign_id cookie", async () => {
    queueCampaignResponse({ data: { id: "camp_1" }, error: null });
    const res = await setCurrentCampaign("camp_1");
    expect(res).toEqual({ ok: true, data: null });

    expect(hasEqCall(supabase, "campaigns", "id", "camp_1")).toBe(true);
    expect(hasEqCall(supabase, "campaigns", "dm_user_id", "user_1")).toBe(true);
    expect(cookieStore.get("dm_campaign_id")?.value).toBe("camp_1");
  });

  it("getCurrentCampaignIdCookie returns cookie value", async () => {
    cookieStore.set("dm_campaign_id", "camp_99", { path: "/dashboard" });
    await expect(getCurrentCampaignIdCookie()).resolves.toBe("camp_99");
  });

  it("createCampaignFormAction sets current campaign then redirects", async () => {
    queueCampaignResponse({ data: { id: "camp_1", dm_user_id: "user_1", name: "CC" }, error: null });
    queueCampaignResponse({ data: { id: "camp_1" }, error: null }); // setCurrentCampaign select

    const fd = new FormData();
    fd.set("name", "CC");

    const p = createCampaignFormAction({ error: null }, fd);
    await expect(p).rejects.toBeInstanceOf(RedirectError);
    await expect(p).rejects.toMatchObject({ url: "/dashboard/campaigns/camp_1" });
  });
});
