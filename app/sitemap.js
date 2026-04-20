/**
 * Next.js file-convention sitemap.xml route.
 *   → served at `/sitemap.xml`
 *
 * Single-page experience today; expand this list when new routes are added.
 */
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "https://a-billion-dreams.example";

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
