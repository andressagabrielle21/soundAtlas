const cachePrefix = "soundatlas-offline-";
const cacheName = cachePrefix + "v1";
const offlinePage = "/pwa/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(cacheName).then((cache) => cache.add(offlinePage)),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then(async (keys) => {
      await Promise.all(
        keys
          .filter((key) => key.startsWith(cachePrefix) && key !== cacheName)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    }),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (
    request.method !== "GET" ||
    request.mode !== "navigate" ||
    new URL(request.url).origin !== self.location.origin
  ) {
    return;
  }

  // Account pages always use the network. Only the generic fallback is cached.
  event.respondWith(
    fetch(request).catch(async () => {
      const cache = await caches.open(cacheName);
      return (await cache.match(offlinePage)) ?? Response.error();
    }),
  );
});
