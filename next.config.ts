import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
};

const shouldEnableSentryWebpackPlugin =
  Boolean(process.env.SENTRY_AUTH_TOKEN) &&
  Boolean(process.env.SENTRY_ORG) &&
  Boolean(process.env.SENTRY_PROJECT);

export default
  shouldEnableSentryWebpackPlugin
    ? withSentryConfig(nextConfig, {
        // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/#configure-source-maps
        silent: true,
        telemetry: false,
        sourcemaps: {
          deleteSourcemapsAfterUpload: true,
        },
        authToken: process.env.SENTRY_AUTH_TOKEN,
        org: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
      })
    : nextConfig;
