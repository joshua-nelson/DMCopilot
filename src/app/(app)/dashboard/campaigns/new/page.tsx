import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { getUserProfileByClerkUserId } from "@/lib/user-profiles";
import { CampaignCreateForm } from "@/app/(app)/dashboard/campaigns/_components/campaign-create-form";

export const dynamic = "force-dynamic";

export default async function NewCampaignPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const profile = await getUserProfileByClerkUserId(userId);
  if (!profile) redirect("/onboarding");

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Create campaign</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Set up the basics. You can change these later.
        </p>
      </div>

      <div className="rounded-lg border bg-card p-6 text-card-foreground">
        <CampaignCreateForm />
      </div>
    </div>
  );
}
