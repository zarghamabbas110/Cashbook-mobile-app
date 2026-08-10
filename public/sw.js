/**
 * Minimal app-shell cache.
 *
 * Strategy is network-first with a cache fallback: you always get the newest
 * build when there is signal, and the last good one when there is not. That
 * ordering matters for a money app — a stale shell showing stale numbers is
 * worse than a slightly slower open.
 */
const CACHE = 'rozana-shell-v1'

self.addEventListener('install', event => {
  self.skipWaiting()
  event.waitUntil(caches.open(CACHE).then(c => c.add('./')))
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', event => {
  const { request } = event
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return

  event.respondWith(
    fetch(request)
      .then(response => {
        const copy = response.clone()
        caches.open(CACHE).then(c => c.put(request, copy)).catch(() => {})
        return response
      })
      .catch(async () => {
        const hit = await caches.match(request)
        if (hit) return hit
        // A navigation that missed the cache still deserves the app shell.
        if (request.mode === 'navigate') {
          const shell = await caches.match('./')
          if (shell) return shell
        }
        return new Response('Offline', { status: 503, statusText: 'Offline' })
      }),
  )
})
