/**
 * sw.js — Service Worker for Train Destination Alarm
 *
 * Responsibilities:
 * 1. Cache static assets for offline use (station coordinates stay available in tunnels)
 * 2. Handle background sync messages from the main app
 * 3. Show push notifications when the alarm triggers
 *
 * IMPORTANT: The actual geolocation watch runs in the main thread (App.js)
 * because Service Workers cannot directly call navigator.geolocation.
 * The SW's role is to:
 *   - Cache the route data (IndexedDB) so it works offline
 *   - Receive messages from the main thread when alarm should fire
 *   - Show persistent notifications that survive screen lock
 */

const CACHE_NAME = 'train-alarm-v1';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/alarm-tone.mp3',
    '/manifest.json',
];

// ─── INSTALL: Cache static assets ────────────────────────────────────────────
self.addEventListener('install', (event) => {
    console.log('[SW] Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS).catch((err) => {
                // Don't fail install if some assets aren't found yet
                console.warn('[SW] Some assets could not be cached:', err);
            });
        })
    );
    self.skipWaiting();
});

// ─── ACTIVATE: Clean up old caches ───────────────────────────────────────────
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating...');
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys
                    .filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            )
        )
    );
    self.clients.claim();
});

// ─── FETCH: Serve cached assets when offline ─────────────────────────────────
self.addEventListener('fetch', (event) => {
    // Only cache GET requests for our own origin
    if (event.request.method !== 'GET') return;
    if (!event.request.url.startsWith(self.location.origin)) return;

    // Network-first for API calls, cache-first for static assets
    if (event.request.url.includes('/api/')) {
        event.respondWith(
            fetch(event.request).catch(() =>
                caches.match(event.request)
            )
        );
    } else {
        event.respondWith(
            caches.match(event.request).then(
                (cached) => cached || fetch(event.request)
            )
        );
    }
});

// ─── MESSAGES from main thread ────────────────────────────────────────────────
self.addEventListener('message', (event) => {
    const { type, payload } = event.data || {};

    if (type === 'TRIGGER_ALARM') {
        showAlarmNotification(payload);
    }

    if (type === 'PRE_ALERT') {
        showPreAlertNotification(payload);
    }

    if (type === 'CACHE_ROUTE') {
        cacheRouteData(payload);
    }
});

// ─── NOTIFICATION HANDLERS ────────────────────────────────────────────────────
function showAlarmNotification({ stationName, distance }) {
    self.registration.showNotification('🚨 WAKE UP! Destination Approaching!', {
        body: `${stationName} is ${distance < 1 ? Math.round(distance * 1000) + 'm' : distance.toFixed(1) + 'km'} away. Get ready!`,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        tag: 'destination-alarm',          // Replaces previous notification
        renotify: true,
        requireInteraction: true,          // Stays visible until user dismisses
        vibrate: [500, 200, 500, 200, 500, 200, 1000],
        actions: [
            { action: 'dismiss', title: '✅ I\'m Awake!' },
            { action: 'snooze', title: '⏰ Snooze 2 min' },
        ],
        data: { stationName, distance, timestamp: Date.now() },
    });
}

function showPreAlertNotification({ prevStationName, destStationName }) {
    self.registration.showNotification('⚠️ Next Stop Alert', {
        body: `Leaving ${prevStationName}. Your destination ${destStationName} is the next stop!`,
        icon: '/icons/icon-192x192.png',
        tag: 'pre-alert',
        vibrate: [200, 100, 200],
        requireInteraction: false,
    });
}

// ─── CACHE ROUTE DATA (for offline use in tunnels) ────────────────────────────
async function cacheRouteData(routeData) {
    try {
        const cache = await caches.open(CACHE_NAME);
        const response = new Response(JSON.stringify(routeData), {
            headers: { 'Content-Type': 'application/json' },
        });
        await cache.put('/cached-route', response);
        console.log('[SW] Route data cached for offline use.');
    } catch (err) {
        console.error('[SW] Failed to cache route:', err);
    }
}

// ─── NOTIFICATION CLICK HANDLER ───────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'dismiss') {
        // Tell the main app to stop the alarm
        self.clients.matchAll({ type: 'window' }).then((clients) => {
            clients.forEach((client) => client.postMessage({ type: 'DISMISS_ALARM' }));
        });
    } else if (event.action === 'snooze') {
        // Snooze for 2 minutes
        self.clients.matchAll({ type: 'window' }).then((clients) => {
            clients.forEach((client) => client.postMessage({ type: 'SNOOZE_ALARM', duration: 120000 }));
        });
    } else {
        // Open/focus the app
        event.waitUntil(
            self.clients.matchAll({ type: 'window' }).then((clients) => {
                const focused = clients.find((c) => c.focus);
                if (focused) return focused.focus();
                return self.clients.openWindow('/');
            })
        );
    }
});
