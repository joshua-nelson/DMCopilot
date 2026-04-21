import "server-only";

import { auth } from "@clerk/nextjs/server";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { embedTexts } from "@/lib/voyage/embed";

function parsePositiveInt(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.floor(n));
}

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { ok: false, error: "Unauthenticated" },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  const limit = parsePositiveInt(searchParams.get("limit"), 20);
  const offset = parsePositiveInt(searchParams.get("offset"), 0);

  if (!q) {
    return NextResponse.json(
      { ok: false, error: "Missing query param: q" },
      { status: 400 },
    );
  }
  if (q.length > 500) {
    return NextResponse.json(
      { ok: false, error: "Query too long" },
      { status: 400 },
    );
  }

  try {
    let queryEmbedding: number[] | null = null;
    try {
      const embeddings = await embedTexts([q]);
      const e0 = embeddings[0];
      queryEmbedding = Array.isArray(e0) && e0.length > 0 ? e0 : null;
    } catch {
      // Embeddings are optional; fall back to FTS-only.
      queryEmbedding = null;
    }

    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase.rpc("search_rules_chunks", {
      query_text: q,
      query_embedding: queryEmbedding,
      match_count: Math.min(limit + offset, 50),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }

    const rows = (data ?? []) as unknown[];
    const page = rows.slice(offset, offset + limit);

    return NextResponse.json(page, {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 },
    );
  }
}
