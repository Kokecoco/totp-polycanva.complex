self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open("auth-pwa").then(cache =>
      cache.addAll([
        "./",
        "./index.html",
        "./app.js",
        "./db.js",
        "./manifest.json"
      ])
    )
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then(res => res || fetch(event.request))
  );
});
