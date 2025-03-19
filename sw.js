const CACHE_NAME = "restaurant-billing-cache-v1";
const urlsToCache = [
    "/",
    "/index.html",
    "/dashboard.html",
    "/menu.html",
    "/waiters.html",
    "/tables.html",
    "/app.js",
    "/styles.css"
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(urlsToCache);
        })
    );
});

self.addEventListener("fetch", (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});