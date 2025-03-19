// sw.js
self.addEventListener('install', event => {
    console.log('Service Worker: Installed');
    // Optionally cache assets for offline use
    event.waitUntil(
        caches.open('restaurant-billing-v1').then(cache => {
            return cache.addAll([
                '/HotelBilling/',
                '/HotelBilling/index.html',
                '/HotelBilling/dashboard.html',
                '/HotelBilling/reports.html',
                '/HotelBilling/tables.html',
                '/HotelBilling/menu.html',
                '/HotelBilling/app.js'
            ]);
        })
    );
});

self.addEventListener('activate', event => {
    console.log('Service Worker: Activated');
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request);
        })
    );
});
