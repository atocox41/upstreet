import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: "https://5e84b8153ae0485f9dc0e57e2efb9647@o4505596409151488.ingest.sentry.io/4505596410134528",
  tunnel: 'https://sentry.isekai.chat/tunnel/',
  integrations: [
    new Sentry.BrowserTracing({
      // Set 'tracePropagationTargets' to control for which URLs distributed tracing should be enabled
      // tracePropagationTargets: ["localhost", "https:yourserver.io/api/"],
    }),
    new Sentry.Replay(),
  ],
  // Performance Monitoring
  // tracesSampleRate: 1.0, // Capture 100% of the transactions, reduce in production!
  // Session Replay
  replaysSessionSampleRate: 0.1, // This sets the sample rate at 10%. You may want to change it to 100% while in development and then sample at a lower rate in production.
  replaysOnErrorSampleRate: 1.0, // If you're not already sampling the entire session, change the sample rate to 100% when sampling sessions where errors occur.
});