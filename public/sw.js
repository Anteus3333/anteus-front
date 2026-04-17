/* global self, caches, fetch, Response */
// Anteus Todos service worker — offline-first shell + asset cache.
// Bumping this version purges old caches on activation.
const CACHE = 'anteus-v1'

// Shell ressources pré-cachées lors de l'install.
const SHELL = [
  '/',
  '/login',
  '/offline.html',
  '/icon.svg',
  '/icon-maskable.svg',
  '/favicon.ico',
  '/manifest.webmanifest',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        // On tolère les 404 pour ne pas faire échouer l'install complet
        Promise.all(
          SHELL.map((url) =>
            fetch(url, { credentials: 'same-origin' })
              .then((res) => (res.ok ? cache.put(url, res) : undefined))
              .catch(() => undefined)
          )
        )
      )
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  )
})

// Signal venant du client (après réussite de replay) pour purger le cache HTML.
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting()
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  const url = new URL(req.url)

  // On laisse passer tout ce qui est cross-origin (Supabase, Google fonts, etc.)
  if (url.origin !== self.location.origin) return

  // Pas d'interception pour les non-GET (POST server actions, etc.)
  if (req.method !== 'GET') return

  // Navigations : network-first avec fallback cache puis page offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone()
            caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => {})
          }
          return res
        })
        .catch(() =>
          caches.match(req).then(
            (cached) =>
              cached ||
              caches.match('/offline.html').then(
                (fallback) =>
                  fallback ||
                  new Response('Offline', {
                    status: 503,
                    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
                  })
              )
          )
        )
    )
    return
  }

  // Assets statiques : cache-first, puis network, puis fallback.
  const isStatic =
    url.pathname.startsWith('/_next/static/') ||
    url.pathname === '/favicon.ico' ||
    url.pathname === '/manifest.webmanifest' ||
    url.pathname.startsWith('/icon') ||
    /\.(svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?|ttf|eot)$/i.test(url.pathname)

  if (isStatic) {
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req)
            .then((res) => {
              if (res && res.ok) {
                const copy = res.clone()
                caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => {})
              }
              return res
            })
            .catch(() => cached)
      )
    )
    return
  }

  // Par défaut : network, fallback cache.
  event.respondWith(fetch(req).catch(() => caches.match(req)))
})
