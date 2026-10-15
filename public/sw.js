// CareFolio service worker — hand-written, no plugins.
//
// What it does:
//  * caches the app shell (logo, icons, an offline page, and the
//    fingerprinted /_next/static files) so the app opens without signal;
//  * keeps the LATEST /summary page, network-first: online you always get
//    a fresh one, offline you get the last one this device loaded.
// What it never does: cache any other page, API call or document. The
// summary copy is deleted when someone logs out (see the log in pages).

const SHELL = "cf-shell-v1";
const SUMMARY = "cf-summary-v1";
const SHELL_FILES = ["/offline.html", "/brand/logo-mark.png", "/brand/icon-192.png", "/brand/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL).then((cache) => cache.addAll(SHELL_FILES)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== SHELL && k !== SUMMARY).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "clear-offline-copy") event.waitUntil(caches.delete(SUMMARY));
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // The health summary: network first, fall back to the last copy.
  if (request.mode === "navigate" && url.pathname === "/summary") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Only a real page — never a redirect to log in.
          if (response.ok && response.type === "basic" && !response.redirected) {
            const copy = response.clone();
            caches.open(SUMMARY).then((cache) => cache.put("/summary", copy));
          }
          return response;
        })
        .catch(async () => (await caches.match("/summary", { cacheName: SUMMARY })) || caches.match("/offline.html")),
    );
    return;
  }

  // Fingerprinted build files and brand images: cache first.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/brand/")) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(SHELL).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
    return;
  }

  // Any other page: always the network; a friendly page when offline.
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/offline.html")));
  }
});
