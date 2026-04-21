/**
 * Resolve the canonical site URL from deployment env vars.
 * Uses the known production URL on Vercel production, and localhost for local builds
 * when no public URL is configured.
 */
export function getSiteUrl() {
  const PROD_SITE_URL = "https://a-billion-dreams.vercel.app";
  const vercelEnv = process.env.VERCEL_ENV;

  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    (vercelEnv === "production" ? PROD_SITE_URL : "") ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL ||
    "http://localhost:3000";
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  return withProtocol.replace(/\/$/, "");
}
