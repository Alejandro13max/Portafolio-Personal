/* ==========================================================================
   SERVICE WORKER - PORTAFOLIO PWA (v1)
   ========================================================================== */
const CACHE_NAME = 'denis-portafolio-v1';

const CORE_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
    'https://code.jquery.com/jquery-3.7.1.min.js',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://fonts.googleapis.com/css2?family=Outfit:wght@300;500;700&display=swap',
    'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'
];

const CDN_HOSTS = ['cdn.jsdelivr.net', 'cdnjs.cloudflare.com', 'code.jquery.com',
                   'fonts.googleapis.com', 'fonts.gstatic.com', 'cdn-icons-png.flaticon.com'];

/* INSTALACIÓN */
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => Promise.allSettled(CORE_ASSETS.map((url) => cache.add(url))))
            .then(() => self.skipWaiting())
    );
});

/* ACTIVACIÓN */
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

function guardar(req, res) {
    const copia = res.clone();
    caches.open(CACHE_NAME).then((cache) => cache.put(req, copia));
}

/* FETCH */
self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;
    const url = new URL(req.url);

    // 1) La página principal: Red primero, caché si falla
    if (req.mode === 'navigate') {
        event.respondWith(
            fetch(req)
                .then((res) => { if (res && res.ok) guardar('./index.html', res); return res; })
                .catch(() => caches.match('./index.html'))
        );
        return;
    }

    // 2) Imágenes locales y CDNs: Caché primero
    const esImagenLocal = url.origin === self.location.origin && url.pathname.includes('/img/');
    const esCDN = CDN_HOSTS.includes(url.hostname);
    if (esImagenLocal || esCDN) {
        event.respondWith(
            caches.match(req).then((cached) => {
                if (cached) return cached;
                return fetch(req).then((res) => {
                    if (res && (res.ok || res.type === 'opaque')) guardar(req, res);
                    return res;
                });
            })
        );
        return;
    }

    // 3) Resto: Caché con respaldo de red
    event.respondWith(caches.match(req).then((cached) => cached || fetch(req)));
});