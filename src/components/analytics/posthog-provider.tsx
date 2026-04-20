"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { PostHogProvider as PostHogReactProvider } from "posthog-js/react";

function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key) return;

    // Track a minimal pageview (no user identity in Phase 0).
    posthog.capture("$pageview", {
      $current_url:
        typeof window === "undefined"
          ? undefined
          : `${window.location.origin}${pathname}${searchParams?.toString() ? `?${searchParams.toString()}` : ""}`,
    });
  }, [pathname, searchParams]);

  return null;
}

export function PostHogProvider({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const posthogHost =
    process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://app.posthog.com";

  useEffect(() => {
    if (!posthogKey) return;

    posthog.init(posthogKey, {
      api_host: posthogHost,

      // Safe-by-default: avoid broad/implicit capture until we define events.
      autocapture: false,
      capture_pageview: false,
      disable_session_recording: true,
    });
  }, [posthogKey, posthogHost]);

  if (!posthogKey) return <>{children}</>;

  return (
    <PostHogReactProvider client={posthog}>
      <PostHogPageView />
      {children}
    </PostHogReactProvider>
  );
}
