import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  sendDefaultPii: false,
  tracesSampleRate: 0,
  beforeSend(event) {
    // Extra defense-in-depth: never forward auth/cookie headers.
    if (event.request?.headers) {
      const headers = { ...event.request.headers };
      delete (headers as Record<string, unknown>)["cookie"];
      delete (headers as Record<string, unknown>)["authorization"];
      event.request.headers = headers;
    }

    return event;
  },
});
