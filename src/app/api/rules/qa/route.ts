import "server-only";

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { chatComplete } from "@/lib/ai/chatComplete";
import { PromptBuilder } from "@/lib/ai/prompts/builder";
import type { Json } from "@/lib/supabase/database.types";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const BodySchema = z.object({
  q: z.string().min(1).max(500),
});

type RulesCitation = {
  id: string;
  section?: string;
  url?: string;
  license?: string;
  attribution?: string;
};

function pickString(obj: unknown, key: string): string | undefined {
  if (!obj || typeof obj !== "object") return undefined;
  const value = (obj as Record<string, unknown>)[key];
  return typeof value === "string" ? value : undefined;
}

function buildCitations(rows: Array<{ id: string; metadata: Json }>): RulesCitation[] {
  return rows.map((r) => {
    const m = r.metadata as unknown;
    const licenseObj =
      m && typeof m === "object" ? (m as Record<string, unknown>)["license"] : undefined;
    const licenseId = pickString(licenseObj, "id");

    return {
      id: r.id,
      section: pickString(m, "section"),
      url: pickString(m, "url") ?? pickString(m, "source_page"),
      license: licenseId,
      attribution: pickString(m, "attribution"),
    };
  });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { ok: false, error: "Unauthenticated" },
      { status: 401 },
    );
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid body" },
      { status: 400 },
    );
  }

  const q = parsed.data.q.trim();

  try {
    const supabase = getSupabaseAdminClient();
    const { data: rows, error } = await supabase.rpc("search_rules_chunks", {
      q,
      match_limit: 3,
      match_offset: 0,
    });
    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }

    const top = rows ?? [];
    const citations = buildCitations(top);

    if (top.length === 0) {
      return NextResponse.json(
        {
          ok: true,
          answer:
            "I couldn’t find anything in the SRD excerpts for that query. Try a different keyword (e.g. the rule name).",
          citations: [],
        },
        { status: 200, headers: { "Cache-Control": "no-store" } },
      );
    }

    const builder = new PromptBuilder();
    builder.addLayer(
      "static",
      [
        "You are a D&D 5e SRD rules lookup assistant.",
        "Use ONLY the provided SRD excerpts. Do not rely on outside knowledge.",
        "When you state a rule or make a claim supported by an excerpt, include citations by chunk id in square brackets, e.g. [<chunk_id>].",
        "If the excerpts do not contain the answer, say so and suggest a better search term.",
      ].join("\n"),
    );

    const excerpts = top
      .map((r, idx) => {
        const m = r.metadata as unknown;
        const title = pickString(m, "title") ?? "(untitled)";
        const section = pickString(m, "section");

        return [
          `Excerpt ${idx + 1} — id: ${r.id}`,
          `Title: ${title}`,
          section ? `Section: ${section}` : undefined,
          "Content:",
          r.content,
        ]
          .filter(Boolean)
          .join("\n");
      })
      .join("\n\n---\n\n");

    builder.addLayer(
      "volatile",
      [
        `Question: ${q}`,
        "",
        "SRD excerpts (cite by id):",
        excerpts,
      ].join("\n"),
      { cacheable: false },
    );

    const messages = builder.buildOpenRouterMessages([]);

    const result = await chatComplete({
      clerkUserId: userId,
      feature: "rules.qa",
      messages,
    });

    return NextResponse.json(
      { ok: true, answer: result.outputText, citations },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 },
    );
  }
}
