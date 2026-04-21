import type { ReactNode } from "react";

import { notFound } from "next/navigation";

import { getCampaignForUser } from "@/app/(app)/dashboard/campaigns/actions";
import { PersistentStatusStrip } from "@/components/session/persistent-status-strip";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function CampaignLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = await params;
  const campaign = await getCampaignForUser(campaignId);
  if (!campaign) notFound();

  const supabase = getSupabaseAdminClient();
  const { data: activeSession, error } = await supabase
    .from("sessions")
    .select("id")
    .eq("campaign_id", campaignId)
    .eq("status", "active")
    .order("started_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  const showStrip = Boolean(activeSession?.id);

  return (
    <>
      <div className={showStrip ? "pb-[56px]" : undefined}>{children}</div>
      {showStrip ? (
        <div className="sticky bottom-0 z-10 h-[56px] border-t border-line-soft bg-bg-1 backdrop-blur">
          <PersistentStatusStrip campaignId={campaignId} />
        </div>
      ) : null}
    </>
  );
}
