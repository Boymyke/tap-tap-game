/* Tap Am service worker: makes the app installable, loads fast, and shows a friendly
   offline page when the internet is down. API calls are never cached. */
const VERSION = 'tapam-v16';
const SHELL = `${VERSION}-shell`;
const PAGES = `${VERSION}-pages`;
const FONTS = 'tapam-fonts';
const PRECACHE = ['/offline', '/assets/app.js?v=15', '/assets/game.js?v=15', '/assets/sounds.js?v=15', '/favicon.svg', '/assets/brand/logo-white.svg', '/assets/brand/logo.svg', '/assets/brand/mark.svg', '/assets/brand/mark-white.svg', '/assets/landing/poster-m.webp',
  '/assets/icons/icon-192.png', '/assets/icons/icon-512.png', '/manifest.webmanifest'];
const PUBLIC_PAGES = ['/', '/how-to-play', '/rules', '/fair-play', '/prizes', '/account-rules', '/consent', '/merch', '/faq', '/about', '/terms', '/privacy', '/disclaimer', '/login', '/signup', '/plans', '/ranks'];

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
  // Landing videos stream with range requests: let the browser and CDN handle them.
  if (url.pathname.startsWith('/assets/landing/') && /\.(webm|mp4)$/.test(url.pathname)) return;
  if (req.headers.has('range')) return;

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
      // Slow networks are normal: only give up early when a saved copy exists to show instead.
      // With no saved copy, wait for the network and show the offline page only if it really fails.
      const net = fetch(req);
      const saved = PUBLIC_PAGES.includes(url.pathname) ? await caches.match(url.pathname) : null;
      try {
        const res = saved ? await timeout(8000, net) : await net;
        if (res.ok && PUBLIC_PAGES.includes(url.pathname)) {
          const copy = res.clone();
          caches.open(PAGES).then(c => c.put(url.pathname, copy));
        }
        return res;
      } catch {
        return saved || (await caches.match('/offline'));
      }
    })());
  }
});
