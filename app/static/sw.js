/* MotherTalk service worker: installable PWA + offline cache.
   Core shell is cached on install; story JSON, audio clips and pages
   are cached the first time they are visited, then served offline. */
var CACHE = "mothertalk-v1";
var CORE = [
  "/",
  "/static/css/style.css",
  "/static/js/play.js",
  "/static/manifest.json",
  "/static/img/logo.png"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(CORE); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") { return; }
  var path = new URL(e.request.url).pathname;
  var cacheable = path.indexOf("/static/") === 0 ||
                  path.indexOf("/audio/") === 0 ||
                  path.indexOf("/api/story/") === 0 ||
                  path === "/";
  if (!cacheable) { return; }
  e.respondWith(
    caches.match(e.request).then(function (hit) {
      if (hit) { return hit; }
      return fetch(e.request).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        return res;
      }).catch(function () { return caches.match("/"); });
    })
  );
});
