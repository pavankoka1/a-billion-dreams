import { getSiteUrl } from "./lib/siteUrl";

/**
 * Next.js file-convention robots.txt route.
 *   → served at `/robots.txt`
 */
const SITE_URL = getSiteUrl();

export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/particle-targets.json",
          "/story-beats.manifest.json",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
