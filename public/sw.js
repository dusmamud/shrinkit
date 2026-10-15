/* ShrinkIt service worker — offline support.
 *
 * Uses a network-first strategy for dynamic updates during development & production,
 * falling back to cache when offline.
 */
const CACHE = "shrinkit-v2";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        cache.addAll([
          "/",
          "/manifest.webmanifest",
          "/favicon.svg",
          "/favicon-96x96.png",
          "/favicon.ico",
          "/apple-touch-icon.png",
          "/icons/icon-192.png",
          "/icons/icon-512.png",
        ]),
      )
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  // Only handle same-origin traffic; let everything else pass through.
  if (url.origin !== self.location.origin) return;

  // Network-first strategy: always fetch the latest content when online,
  // update the cache in the background, and fallback to cache if offline.
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (
          response &&
          response.status === 200 &&
          (response.type === "basic" || response.type === "default")
        ) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request, { ignoreSearch: false })),
  );
});
