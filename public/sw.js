/* Tap Am service worker: makes the app installable, loads fast, and shows a friendly
   offline page when the internet is down. API calls are never cached. */
const VERSION = 'tapam-v4';
const SHELL = `${VERSION}-shell`;
const PAGES = `${VERSION}-pages`;
const FONTS = 'tapam-fonts';
const PRECACHE = ['/offline', '/assets/app.js?v=4', '/assets/game.js?v=4', '/assets/logo-tapam.svg', '/assets/bg-mobile.jpg', '/assets/bg-desktop.jpg',
  '/assets/icons/icon-192.png', '/assets/icons/icon-512.png', '/manifest.webmanifest'];
const PUBLIC_PAGES = ['/', '/how-to-play', '/rules', '/merch', '/faq', '/about', '/terms', '/privacy', '/disclaimer', '/login', '/signup'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(SHELL).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (!key.startsWith(VERSION) && key !== FONTS) await caches.delete(key);
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'clear-pages') event.waitUntil(caches.delete(PAGES));
});

const timeout = (ms, p) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Google Fonts: serve from cache, refresh in the background.
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(caches.open(FONTS).then(async cache => {
      const hit = await cache.match(req);
      const net = fetch(req).then(res => { if (res.ok || res.type === 'opaque') cache.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }
  if (url.origin !== location.origin) return;
  if (url.pathname.startsWith('/api/')) return;            // always live
  if (url.pathname === '/sw.js') return;

  // Static assets: cache first.
  if (url.pathname.startsWith('/assets/') || url.pathname === '/manifest.webmanifest') {
    event.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok) caches.open(SHELL).then(c => c.put(req, res.clone()));
      return res;
    })));
    return;
  }

  // Pages: network first (fresh data), fall back to the last copy, then the offline page.
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const res = await timeout(6000, fetch(req));
        if (res.ok && PUBLIC_PAGES.includes(url.pathname)) {
          const copy = res.clone();
          caches.open(PAGES).then(c => c.put(url.pathname, copy));
        }
        return res;
      } catch {
        return (await caches.match(url.pathname)) || (await caches.match('/offline'));
      }
    })());
  }
});
