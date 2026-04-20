import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import {
  getUserProfileByClerkUserId,
  upsertUserProfile,
} from "@/lib/user-profiles";

export const dynamic = "force-dynamic";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string | string[] }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const existingProfile = await getUserProfileByClerkUserId(userId);
  if (existingProfile?.display_name) redirect("/dashboard");

  const user = await currentUser();
  const defaultDisplayName =
    user?.fullName ??
    user?.firstName ??
    user?.username ??
    user?.primaryEmailAddress?.emailAddress ??
    "";

  const resolvedSearchParams = (await searchParams) ?? {};
  const error =
    typeof resolvedSearchParams.error === "string"
      ? resolvedSearchParams.error
      : undefined;

  async function saveProfile(formData: FormData) {
    "use server";

    const { userId: actionUserId } = await auth();
    if (!actionUserId) redirect("/sign-in");

    const displayNameRaw = formData.get("displayName");
    const displayName =
      typeof displayNameRaw === "string" ? displayNameRaw.trim() : "";

    if (displayName.length < 2 || displayName.length > 80) {
      redirect(
        "/onboarding?error=" +
          encodeURIComponent("Display name must be 2–80 characters."),
      );
    }

    await upsertUserProfile({
      clerkUserId: actionUserId,
      displayName,
      role: "dm",
    });

    redirect("/dashboard");
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-2xl font-semibold">Welcome</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Set a display name to finish setting up your account.
      </p>

      {error ? (
        <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <form action={saveProfile} className="mt-6 space-y-4">
        <div className="space-y-2">
          <label htmlFor="displayName" className="text-sm font-medium">
            Display name
          </label>
          <input
            id="displayName"
            name="displayName"
            type="text"
            defaultValue={defaultDisplayName}
            placeholder="e.g. Keth the DM"
            required
            minLength={2}
            maxLength={80}
            className="h-10 w-full rounded-md border bg-background px-3 text-sm shadow-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>

        <button
          type="submit"
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
        >
          Continue
        </button>
      </form>
    </div>
  );
}
