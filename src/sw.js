// Service worker de l'Atelier du Grimoire : garde l'application en cache pour l'utiliser hors connexion.
// La version est remplacée par build.py à chaque reconstruction, ce qui force la mise à jour du cache.
const CACHE = "grimoire-__VERSION__";
const ASSETS = __ASSETS__;

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
