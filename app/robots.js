/**
 * Next.js file-convention robots.txt route.
 *   → served at `/robots.txt`
 *
 * Deploy-time override:
 *   NEXT_PUBLIC_SITE_URL=https://your-domain.example
 */
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "https://a-billion-dreams.example";

export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/_next/",
          "/particle-targets.json",
          "/story-beats.manifest.json",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
