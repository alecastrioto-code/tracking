/* THE RUN — OFFLINE APP SHELL */
const CACHE_NAME = "the-run-shell-v5";
const INDEX_URL = new URL("./index.html", self.registration.scope).href;
const APP_SHELL = [
  "./", "./index.html", "./manifest.webmanifest",
  "./css/reset.css", "./css/tokens.css", "./css/layout.css", "./css/components.css", "./css/responsive.css", "./css/mobile-first.css",
  "./js/defaults.js", "./js/storage.js", "./js/scoring.js", "./js/state.js", "./js/food-library.js", "./js/food-log.js",
  "./js/diet-plan.js", "./js/brain-dump.js", "./js/training-plan.js", "./js/meal-windows.js", "./js/sprint-archive.js",
  "./js/navigation.js", "./js/day-view.js", "./js/overview-view.js", "./js/plan-view.js", "./js/settings-view.js", "./js/recovery.js",
  "./js/import-export.js", "./js/pwa.js", "./js/app.js",
  "./assets/icons/icon-192.png", "./assets/icons/icon-512.png", "./assets/icons/icon-512-maskable.png", "./assets/icons/apple-touch-icon.png"
];
self.addEventListener("install", event => event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())));
self.addEventListener("activate", event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).then(response => {
      const copy = response.clone(); caches.open(CACHE_NAME).then(cache => cache.put(INDEX_URL, copy)); return response;
    }).catch(() => caches.match(INDEX_URL)));
    return;
  }
  event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
    if (!response || response.status !== 200 || response.type !== "basic") return response;
    const copy = response.clone(); caches.open(CACHE_NAME).then(cache => cache.put(request, copy)); return response;
  })));
});
