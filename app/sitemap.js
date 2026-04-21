import { getSiteUrl } from "./lib/siteUrl";

/**
 * Next.js file-convention sitemap.xml route.
 *   → served at `/sitemap.xml`
 *
 * Single-page experience today; expand this list when new routes are added.
 */
const SITE_URL = getSiteUrl();

export default function sitemap() {
  const now = new Date();
  return [
    {
      url: `${SITE_URL}/`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
