const CACHE_VERSION = "abd-v2";
const APP_SHELL_CACHE = `${CACHE_VERSION}-shell`;
const ASSET_CACHE = `${CACHE_VERSION}-assets`;

const APP_SHELL_ASSETS = [
  "/",
  "/offline.html",
  "/manifest.webmanifest",
  "/icon.svg",
  "/apple-icon.png",
  "/opengraph-image.png",
  "/twitter-image.png",
];

function isCacheableAsset(pathname) {
  return (
    pathname.startsWith("/story-beats/") ||
    pathname === "/particle-targets.json" ||
    pathname === "/story-beats.manifest.json" ||
    pathname === "/target.svg" ||
    pathname === "/grok-scatter-structure.svg" ||
    pathname === "/icon-192.png" ||
    pathname === "/icon-512.png"
  );
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const networkPromise = fetch(request)
    .then((response) => {
      if (response && response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  if (cached) {
    networkPromise.catch(() => {});
    return cached;
  }
  const network = await networkPromise;
  if (network) return network;
  return Response.error();
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(APP_SHELL_CACHE)
      .then((cache) => cache.addAll(APP_SHELL_ASSETS))
      .catch(() => {}),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => !k.startsWith(CACHE_VERSION))
          .map((k) => caches.delete(k)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(async (response) => {
          const cache = await caches.open(APP_SHELL_CACHE);
          cache.put(request, response.clone()).catch(() => {});
          return response;
        })
        .catch(async () => {
          const cachedPage = await caches.match(request);
          if (cachedPage) return cachedPage;
          const home = await caches.match("/");
          if (home) return home;
          const offline = await caches.match("/offline.html");
          return offline || Response.error();
        }),
    );
    return;
  }

  if (!isCacheableAsset(url.pathname) && request.destination !== "image") {
    return;
  }

  if (url.pathname === "/particle-targets.json") {
    event.respondWith(staleWhileRevalidate(request, ASSET_CACHE));
    return;
  }

  event.respondWith(
    staleWhileRevalidate(request, ASSET_CACHE),
  );
});
