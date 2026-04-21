import "server-only";

import { auth } from "@clerk/nextjs/server";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";

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
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase.rpc("search_rules_chunks", {
      q,
      match_limit: Math.min(limit, 50),
      match_offset: offset,
    });

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json(data ?? [], {
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
