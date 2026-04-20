# PostHog (product analytics)

Phase 0 uses PostHog for minimal product analytics.

## Environment variables

- `NEXT_PUBLIC_POSTHOG_KEY` (required to enable analytics)
- `NEXT_PUBLIC_POSTHOG_HOST` (optional; defaults to `https://app.posthog.com`)

If `NEXT_PUBLIC_POSTHOG_KEY` is empty, analytics is disabled.

## What we track in Phase 0

Implemented:

- `$pageview` (manual capture on route changes)

Planned key events (documented for consistency; do not over-instrument yet):

- `auth_sign_in_success`
- `auth_sign_up_success`
- `auth_sign_out`
- `nav_dashboard_view`
- `nav_metrics_view`

## Privacy / PII

- Autocapture is disabled.
- Session recording is disabled.
- We do not call `posthog.identify()` in Phase 0.
