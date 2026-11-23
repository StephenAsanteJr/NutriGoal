// NutriGoal service worker: enables "install app" and a friendly offline screen.
// Pages and data are always fetched fresh from the network (health data is never cached).
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open("ng-shell-v1").then((c) => c.addAll([OFFLINE_URL, "/brand/nutrigoal-mark.png"])));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(fetch(event.request).catch(() => caches.match(OFFLINE_URL)));
});
