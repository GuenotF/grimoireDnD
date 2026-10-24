// Service worker de l'Atelier du Grimoire : garde l'application en cache pour l'utiliser hors connexion.
// La version est remplacée par build.py à chaque reconstruction, ce qui force la mise à jour du cache.
const CACHE = "grimoire-f0ceffcb77";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./fonts/fonts.css",
  "./fonts/alegreya-latin-400-italic.woff2",
  "./fonts/alegreya-latin-400-normal.woff2",
  "./fonts/alegreya-latin-500-italic.woff2",
  "./fonts/alegreya-latin-500-normal.woff2",
  "./fonts/alegreya-latin-700-normal.woff2",
  "./fonts/alegreya-latin-ext-400-italic.woff2",
  "./fonts/alegreya-latin-ext-400-normal.woff2",
  "./fonts/alegreya-latin-ext-500-italic.woff2",
  "./fonts/alegreya-latin-ext-500-normal.woff2",
  "./fonts/alegreya-latin-ext-700-normal.woff2",
  "./fonts/alegreya-sans-latin-400-italic.woff2",
  "./fonts/alegreya-sans-latin-400-normal.woff2",
  "./fonts/alegreya-sans-latin-500-normal.woff2",
  "./fonts/alegreya-sans-latin-700-normal.woff2",
  "./fonts/alegreya-sans-latin-ext-400-italic.woff2",
  "./fonts/alegreya-sans-latin-ext-400-normal.woff2",
  "./fonts/alegreya-sans-latin-ext-500-normal.woff2",
  "./fonts/alegreya-sans-latin-ext-700-normal.woff2",
  "./fonts/alegreya-sans-sc-latin-500-normal.woff2",
  "./fonts/alegreya-sans-sc-latin-700-normal.woff2",
  "./fonts/alegreya-sans-sc-latin-ext-500-normal.woff2",
  "./fonts/alegreya-sans-sc-latin-ext-700-normal.woff2",
  "./icons/apple-touch-icon.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith("grimoire-") && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  if (req.mode === "navigate") {
    // Page : le réseau d'abord (dernière version), le cache si hors connexion.
    event.respondWith(
      fetch(req)
        .then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put("./index.html", copy)); return res; })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }
  // Polices, icônes, manifeste : le cache d'abord.
  event.respondWith(caches.match(req).then(hit => hit || fetch(req)));
});
