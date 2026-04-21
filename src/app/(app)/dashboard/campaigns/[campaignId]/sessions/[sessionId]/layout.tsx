import type { ReactNode } from "react";

import { PersistentStatusStrip } from "@/components/session/persistent-status-strip";

export const dynamic = "force-dynamic";

export default async function CampaignSessionLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ campaignId: string; sessionId: string }>;
}) {
  const { campaignId, sessionId } = await params;

  return (
    <>
      <div className="pb-[56px]">{children}</div>
      <div className="sticky bottom-0 z-10 h-[56px] border-t border-line-soft bg-bg-1 backdrop-blur">
        <PersistentStatusStrip campaignId={campaignId} sessionId={sessionId} />
      </div>
    </>
  );
}
