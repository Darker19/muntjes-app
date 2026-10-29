/*
 * Service worker: maakt Muntjes installeerbaar als app.
 * De app komt altijd eerst van de server (zo komen updates meteen binnen);
 * zonder internet wordt de laatst bewaarde versie getoond. api.php gaat nooit via de cache.
 * Toont ook de pushmeldingen ("Tijd is om") die de server stuurt.
 */
const CACHE = "muntjes-v1";
const SHELL = ["./", "style.css", "app.js", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET") return;
  if (url.origin === location.origin && /\/api\.php$/.test(url.pathname)) return;

  // Lettertypen van Google: eenmaal opgehaald, daarna uit de cache
  if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
      const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res;
    })));
    return;
  }
  if (url.origin !== location.origin) return;

  // Eigen bestanden: eerst de server, bij geen internet de bewaarde versie
  e.respondWith(fetch(req).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req).then(hit => hit || caches.match("./"))));
});

// Pushmelding van de server tonen, ook als de app dicht is.
self.addEventListener("push", e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { /* geen JSON */ }
  const timer = String(d.tag || "").startsWith("timer");
  e.waitUntil(self.registration.showNotification(d.titel || "Muntjes", {
    body: d.tekst || "",
    tag: d.tag || "muntjes",
    renotify: true,
    requireInteraction: timer,
    icon: "icons/icon-192.png",
    badge: "icons/icon-192.png",
    vibrate: [300, 100, 300, 100, 600],
    data: { scherm: timer ? "timers" : "" }
  }));
});

// Tik op de melding: de app openen (of naar voren halen), bij een timer op het scherm Timers.
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const scherm = (e.notification.data || {}).scherm || "";
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(lijst => {
    const open = lijst.find(c => new URL(c.url).origin === location.origin);
    if (open) { open.postMessage({ scherm }); return open.focus(); }
    return self.clients.openWindow("./" + (scherm ? "?scherm=" + scherm : ""));
  }));
});
