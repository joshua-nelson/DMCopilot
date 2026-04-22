import { Button } from "@/components/ui/button";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";

import { getUserProfileByClerkUserId } from "@/lib/user-profiles";
import { listCampaignsForUser } from "@/app/(app)/dashboard/campaigns/actions";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const profile = await getUserProfileByClerkUserId(userId);
  if (!profile) redirect("/onboarding");

  let campaigns: Awaited<ReturnType<typeof listCampaignsForUser>> = [];
  let loadError: string | null = null;

  try {
    campaigns = await listCampaignsForUser();
  } catch (err) {
    loadError = err instanceof Error ? err.message : String(err);
  }

  const activeCampaigns = campaigns.filter((c) => !c.is_archived);
  const archivedCampaigns = campaigns.filter((c) => c.is_archived);

  return (
    <div className="p-6">
      <div className="mx-auto max-w-4xl">
        {/* Page header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="font-pixel text-[13px] leading-tight text-ink-0 pixel-glow">
              CAMPAIGNS
            </h1>
            <p className="mt-2 font-pixel-body text-[16px] text-ink-3">
              Manage your D&amp;D campaigns, sessions, and encounters.
            </p>
          </div>
          <Button asChild>
            <Link href="/dashboard/campaigns/new">+ NEW CAMPAIGN</Link>
          </Button>
        </div>

        {/* Error state */}
        {loadError ? (
          <div className="border-2 border-bad bg-bad/10 p-4 font-pixel-body text-[15px] text-bad pixel-border-bad">
            ERROR: {loadError}
          </div>
        ) : activeCampaigns.length === 0 ? (
          /* Empty state */
          <div className="border-2 border-line bg-bg-1 p-8 text-center pixel-inset">
            <div className="mb-4 font-pixel text-[11px] text-ink-0">
              NO CAMPAIGNS
            </div>
            <p className="mb-6 font-pixel-body text-[16px] text-ink-3">
              Create your first campaign to begin your adventure.
            </p>
            <Button asChild>
              <Link href="/dashboard/campaigns/new">START ADVENTURE</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Active campaigns grid */}
            <div className="grid gap-4 md:grid-cols-2">
              {activeCampaigns.map((c) => (
                <Link
                  key={c.id}
                  href={`/dashboard/campaigns/${c.id}`}
                  className="group block border-2 border-line bg-bg-1 p-4 cursor-pointer transition-colors hover:border-ember hover:bg-bg-2 pixel-inset"
                >
                  {/* Pixel corner decoration */}
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-pixel text-[9px] leading-loose text-ink-0 group-hover:text-ember transition-colors">
                        {c.name}
                      </div>
                      <div className="mt-1 font-pixel-body text-[14px] uppercase tracking-widest text-ink-3">
                        {c.system}
                      </div>
                    </div>
                    {/* Pixel right-arrow indicator */}
                    <span className="font-pixel text-[10px] text-ink-4 group-hover:text-ember transition-colors shrink-0">
                      ▶
                    </span>
                  </div>
                  {c.description ? (
                    <p className="font-pixel-body text-[15px] text-ink-2 line-clamp-3 border-t-2 border-line-soft pt-2 mt-2">
                      {c.description}
                    </p>
                  ) : null}
                  {/* Bottom status bar */}
                  <div className="mt-3 flex items-center gap-2 border-t-2 border-line-soft pt-2">
                    <span className="h-2 w-2 bg-ok" />
                    <span className="font-pixel text-[6px] text-ok">ACTIVE</span>
                  </div>
                </Link>
              ))}
            </div>

            {/* Archived */}
            {archivedCampaigns.length ? (
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <span className="font-pixel text-[7px] uppercase tracking-widest text-ink-4">
                    ARCHIVED
                  </span>
                  <div className="flex-1 border-t-2 border-line-soft" />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {archivedCampaigns.map((c) => (
                    <Link
                      key={c.id}
                      href={`/dashboard/campaigns/${c.id}`}
                      className="group block border-2 border-line-soft bg-bg-1 p-4 opacity-60 cursor-pointer transition-all hover:opacity-90 hover:border-line"
                    >
                      <div className="truncate font-pixel text-[9px] leading-loose text-ink-2 group-hover:text-ink-1 transition-colors">
                        {c.name}
                      </div>
                      <div className="mt-1 font-pixel-body text-[14px] uppercase tracking-widest text-ink-4">
                        {c.system}
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="h-2 w-2 bg-ink-4" />
                        <span className="font-pixel text-[6px] text-ink-4">ARCHIVED</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
