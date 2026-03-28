/**
 * Public Auth0 / app origin settings for the SPA.
 * Use env in production; fallbacks match the configured Auth0 application (localhost:3000).
 */
export const auth0Domain = process.env.NEXT_PUBLIC_AUTH0_DOMAIN;
export const auth0ClientId = process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID;

/** Must match Allowed Web Origins / callback host (no trailing slash). */
export const appOrigin = process.env.NEXT_PUBLIC_APP_ORIGIN;

/**
 * OAuth redirect_uri — must exactly match an entry in Auth0 "Allowed Callback URLs".
 * Stable across SSR and client so the Auth0 client config hydrates consistently.
 */
export const auth0RedirectUri = (
  process.env.NEXT_PUBLIC_APP_ORIGIN ??
  process.env.NEXT_PUBLIC_AUTH0_ORIGIN ??
  "http://localhost:3000"
).replace(/\/$/, "");
