/* ShrinkIt service worker — offline support.
 *
 * Everything the app does is local, so a simple cache-first strategy for
 * same-origin GET requests is enough to make the whole tool work offline
 * after the first visit. No analytics, no tracking, nothing phoned home.
 */
const CACHE = "shrinkit-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(["/", "/manifest.webmanifest"]))
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

  event.respondWith(
    caches.match(request, { ignoreSearch: false }).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        // Cache successful, cacheable responses for offline use.
        if (
          response &&
          response.status === 200 &&
          (response.type === "basic" || response.type === "default")
        ) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    }),
  );
});
