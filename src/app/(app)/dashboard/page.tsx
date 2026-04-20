import { Button } from "@/components/ui/button";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { getUserProfileByClerkUserId } from "@/lib/user-profiles";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const profile = await getUserProfileByClerkUserId(userId);
  if (!profile) redirect("/onboarding");

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your campaigns, sessions, and tools will live here.
        </p>
      </div>

      <div className="rounded-lg border bg-card p-8 text-card-foreground">
        <h2 className="text-lg font-medium">No campaigns yet</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Create a campaign to start tracking characters, encounters, notes, and
          sessions.
        </p>
        <div className="mt-6">
          <Button type="button">Create your first campaign</Button>
        </div>
      </div>
    </div>
  );
}
