import { beforeEach, describe, expect, it, vi } from "vitest";

// eslint-disable-next-line no-var
var auth: ReturnType<typeof vi.fn>;
// eslint-disable-next-line no-var
var getSupabaseAdminClient: ReturnType<typeof vi.fn>;
// eslint-disable-next-line no-var
var chatComplete: ReturnType<typeof vi.fn>;

vi.mock("@clerk/nextjs/server", () => ({
  auth: (auth = vi.fn()),
}));
vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdminClient: (getSupabaseAdminClient = vi.fn()),
}));
vi.mock("@/lib/ai/chatComplete", () => ({
  chatComplete: (chatComplete = vi.fn()),
}));
vi.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: unknown) => ({ body, init }),
  },
}));

import { POST } from "./route";

describe("rules qa route", () => {
  beforeEach(() => {
    auth.mockReset();
    getSupabaseAdminClient.mockReset();
    chatComplete.mockReset();
  });

  it("returns citations built from rules chunk metadata", async () => {
    auth.mockResolvedValue({ userId: "user_1" });
    const rpc = vi.fn().mockResolvedValue({
      data: [
        {
          id: "chunk_1",
          content: "A creature can take an action...",
          metadata: {
            section: "Actions in Combat",
            url: "https://example.com/srd/actions",
            license: { id: "cc-by" },
            attribution: "Wizards of the Coast",
          },
        },
        {
          id: "chunk_2",
          content: "Opportunity attacks...",
          metadata: {
            section: "Opportunity Attacks",
            source_page: "https://example.com/srd/ooa",
          },
        },
      ],
      error: null,
    });
    getSupabaseAdminClient.mockReturnValue({ rpc });
    chatComplete.mockResolvedValue({ outputText: "Answer with [chunk_1]" });

    const req = new Request("http://localhost/api/rules/qa", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ q: "opportunity attack" }),
    });

    const res = await POST(req);
    expect(res).toEqual(
      expect.objectContaining({
        body: {
          ok: true,
          answer: "Answer with [chunk_1]",
          citations: [
            {
              id: "chunk_1",
              section: "Actions in Combat",
              url: "https://example.com/srd/actions",
              license: "cc-by",
              attribution: "Wizards of the Coast",
            },
            {
              id: "chunk_2",
              section: "Opportunity Attacks",
              url: "https://example.com/srd/ooa",
              license: undefined,
              attribution: undefined,
            },
          ],
        },
      }),
    );

    expect(rpc).toHaveBeenCalledWith("search_rules_chunks", {
      q: "opportunity attack",
      match_limit: 3,
      match_offset: 0,
    });
  });
});
