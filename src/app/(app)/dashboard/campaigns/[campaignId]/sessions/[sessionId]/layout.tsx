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
    <div className="space-y-6">
      <div className="sticky top-0 z-20 -mx-6 -mt-6 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="px-6 py-2">
          <PersistentStatusStrip campaignId={campaignId} sessionId={sessionId} />
        </div>
      </div>

      {children}
    </div>
  );
}
