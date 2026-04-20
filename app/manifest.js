/**
 * Next.js file-convention web manifest route.
 *   → served at `/manifest.webmanifest`
 *
 * Makes the experience installable (PWA-style) and provides richer share
 * metadata on Android / Chromium browsers.
 */
export default function manifest() {
  return {
    name: "A Billion Dreams",
    short_name: "Billion Dreams",
    description:
      "A scroll-driven WebGL story where a billion points of light gather into a portrait.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0a0f",
    theme_color: "#0a0a0f",
    lang: "en",
    dir: "ltr",
    categories: ["art", "entertainment", "sports"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
