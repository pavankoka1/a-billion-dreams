import { Geist, Geist_Mono, Lora } from "next/font/google";
import ConsoleSignature from "./components/ConsoleSignature";
import ServiceWorkerRegister from "./components/ServiceWorkerRegister";
import { getSiteUrl } from "./lib/siteUrl";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const lora = Lora({
  variable: "--font-story",
  subsets: ["latin"],
});

const SITE_URL = getSiteUrl();
const AUTHOR_NAME = "Pavan Koka";
const AUTHOR_LINKEDIN = "https://linkedin.com/in/pavan-koka-419680148";
const AUTHOR_GITHUB = "https://github.com/pavankoka1";
const AUTHOR_PORTFOLIO = "https://koka-lab.vercel.app";

const SITE_NAME = "A Billion Dreams";
const TITLE = "A Billion Dreams — a particle portrait of two cricketing lives";
const DESCRIPTION =
  "A scroll-driven WebGL story where a billion points of light gather into a portrait. Sachin Tendulkar and Virat Kohli — waiting, striking, roaring, carrying — rendered as continuity, memory, and light.";
const GOOGLE_SITE_VERIFICATION = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;
const BING_SITE_VERIFICATION = process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION;

const verification = {
  ...(GOOGLE_SITE_VERIFICATION
    ? { google: GOOGLE_SITE_VERIFICATION }
    : {}),
  ...(BING_SITE_VERIFICATION
    ? { other: { "msvalidate.01": BING_SITE_VERIFICATION } }
    : {}),
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0a0a0f" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0f" },
  ],
  colorScheme: "dark",
};

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: "%s · A Billion Dreams",
  },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  generator: "Next.js",
  keywords: [
    "A Billion Dreams",
    "particle portrait",
    "WebGL",
    "scrollytelling",
    "interactive story",
    "Sachin Tendulkar",
    "Virat Kohli",
    "cricket",
    "India cricket",
    "generative art",
    "data art",
    "point cloud portrait",
    "Next.js 16",
    "React 19",
  ],
  authors: [{ name: AUTHOR_NAME, url: AUTHOR_PORTFOLIO }],
  creator: AUTHOR_NAME,
  publisher: AUTHOR_NAME,
  category: "art",
  classification: "Interactive Story",
  referrer: "origin-when-cross-origin",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: SITE_NAME,
    title: TITLE,
    description: DESCRIPTION,
    locale: "en_US",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "A Billion Dreams — particle portrait",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/twitter-image.png"],
  },
  ...(Object.keys(verification).length > 0 ? { verification } : {}),
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: ["/icon.svg"],
  },
  manifest: "/manifest.webmanifest",
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
};

/**
 * Schema.org JSON-LD describing the experience as a CreativeWork so Google
 * and other crawlers get a structured understanding of the page (title,
 * author, about, image, URL). Rendered inline in <head> server-side so
 * search engines see it without waiting on hydration.
 */
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "CreativeWork",
  name: SITE_NAME,
  alternateName: "A Billion Dreams — particle portrait",
  headline: TITLE,
  description: DESCRIPTION,
  url: SITE_URL,
  image: `${SITE_URL}/opengraph-image.png`,
  inLanguage: "en",
  keywords:
    "particle portrait, WebGL, scrollytelling, Sachin Tendulkar, Virat Kohli, cricket, interactive story",
  genre: ["Interactive Story", "Generative Art", "Sports"],
  about: [
    {
      "@type": "Person",
      name: "Sachin Tendulkar",
      sameAs: "https://en.wikipedia.org/wiki/Sachin_Tendulkar",
    },
    {
      "@type": "Person",
      name: "Virat Kohli",
      sameAs: "https://en.wikipedia.org/wiki/Virat_Kohli",
    },
  ],
  author: {
    "@type": "Person",
    name: AUTHOR_NAME,
    url: AUTHOR_PORTFOLIO,
    sameAs: [AUTHOR_LINKEDIN, AUTHOR_GITHUB, AUTHOR_PORTFOLIO],
  },
  creator: {
    "@type": "Person",
    name: AUTHOR_NAME,
    url: AUTHOR_PORTFOLIO,
    sameAs: [AUTHOR_LINKEDIN, AUTHOR_GITHUB, AUTHOR_PORTFOLIO],
  },
  isAccessibleForFree: true,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger -- trusted, static JSON-LD
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${lora.variable} antialiased`}
      >
        <ConsoleSignature />
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
