import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { Button } from "@/components/ui/button";
import { trackAICall } from "@/lib/ai/trackAICall";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import { getUserProfileByClerkUserId } from "@/lib/user-profiles";

export const dynamic = "force-dynamic";

type AiCallRow = Database["public"]["Tables"]["ai_calls"]["Row"];

async function insertFakeAICallAction() {
  "use server";

  if (process.env.NODE_ENV === "production") return;

  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  await trackAICall({
    clerkUserId: userId,
    feature: "dev_fake",
    provider: "openai",
    model: "gpt-4.1-mini",
    inputTokens: 123,
    outputTokens: 456,
    cacheHit: false,
    costUsd: 0.0123,
    latencyMs: 987,
    metadata: { source: "dev_button" },
  });

  revalidatePath("/dashboard/metrics");
}

function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 6,
  }).format(value);
}

export default async function MetricsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const profile = await getUserProfileByClerkUserId(userId);
  if (!profile) redirect("/onboarding");

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  let rows: Pick<AiCallRow, "feature" | "model" | "cost_usd" | "created_at">[] =
    [];
  let loadError: string | null = null;

  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("ai_calls")
      .select("feature, model, cost_usd, created_at")
      .eq("clerk_user_id", userId)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(5000);

    if (error) {
      loadError = error.message;
    } else {
      rows = data ?? [];
    }
  } catch (err) {
    loadError = err instanceof Error ? err.message : String(err);
  }

  const totalCalls = rows.length;
  const totalCost = rows.reduce((sum, r) => sum + Number(r.cost_usd ?? 0), 0);

  const breakdownMap = new Map<
    string,
    { feature: string; model: string; calls: number; cost: number }
  >();
  for (const r of rows) {
    const feature = r.feature;
    const model = r.model;
    const key = `${feature}|||${model}`;
    const existing = breakdownMap.get(key) ?? {
      feature,
      model,
      calls: 0,
      cost: 0,
    };
    existing.calls += 1;
    existing.cost += Number(r.cost_usd ?? 0);
    breakdownMap.set(key, existing);
  }

  const breakdown = Array.from(breakdownMap.values()).sort(
    (a, b) => b.cost - a.cost,
  );

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Metrics</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          AI usage for the last 7 days (your account).
        </p>
      </div>

      {process.env.NODE_ENV !== "production" ? (
        <form action={insertFakeAICallAction} className="mb-6">
          <Button type="submit" variant="secondary">
            Insert fake AI call (dev-only)
          </Button>
        </form>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border bg-card p-6 text-card-foreground">
          <div className="text-sm text-muted-foreground">Total AI cost</div>
          <div className="mt-2 text-2xl font-semibold">
            {formatUsd(totalCost)}
          </div>
        </div>
        <div className="rounded-lg border bg-card p-6 text-card-foreground">
          <div className="text-sm text-muted-foreground">Total calls</div>
          <div className="mt-2 text-2xl font-semibold">{totalCalls}</div>
        </div>
      </div>

      <div className="mt-8 rounded-lg border bg-card p-6 text-card-foreground">
        <h2 className="text-base font-medium">Breakdown (feature × model)</h2>

        {loadError ? (
          <p className="mt-3 text-sm text-destructive">
            Unable to load metrics: {loadError}
          </p>
        ) : breakdown.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            No AI calls recorded in the last 7 days.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Feature</th>
                  <th className="py-2 pr-3 font-medium">Model</th>
                  <th className="py-2 pr-3 font-medium">Calls</th>
                  <th className="py-2 pr-3 font-medium">Cost</th>
                </tr>
              </thead>
              <tbody>
                {breakdown.map((b) => (
                  <tr key={`${b.feature}-${b.model}`} className="border-b">
                    <td className="py-2 pr-3 align-top">{b.feature}</td>
                    <td className="py-2 pr-3 align-top">{b.model}</td>
                    <td className="py-2 pr-3 align-top">{b.calls}</td>
                    <td className="py-2 pr-3 align-top">{formatUsd(b.cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
