const CACHE_NAME = 'to-app-v1';
const urlsToCache = [
    '/',
    '/static/css/style.css',
    '/static/js/main.js',
    '/static/manifest.json',
    '/static/icons/icon.svg',
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
    'https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js'
];

// Instalar Service Worker
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Cache abierto');
                return cache.addAll(urlsToCache);
            })
            .catch((err) => {
                console.log('Error en cache:', err);
            })
    );
    self.skipWaiting();
});

// Activar Service Worker
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Eliminando cache antiguo:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Interceptar peticiones
self.addEventListener('fetch', (event) => {
    // Solo cachear peticiones GET
    if (event.request.method !== 'GET') {
        return;
    }
    
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Si está en cache, devolver del cache
                if (response) {
                    return response;
                }
                
                // Si no, hacer fetch y guardar en cache
                return fetch(event.request).then((response) => {
                    // Solo cachear respuestas válidas
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }
                    
                    // Clonar respuesta
                    const responseToCache = response.clone();
                    
                    caches.open(CACHE_NAME)
                        .then((cache) => {
                            cache.put(event.request, responseToCache);
                        });
                    
                    return response;
                });
            })
            .catch(() => {
                // Si falla todo, mostrar página offline (si existiera)
                console.log('Error en fetch');
            })
    );
});
