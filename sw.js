/*! Basic PWA Service Worker generated for Volleyball Club app */
const CACHE_NAME = 'vball-cache-v1';
const OFFLINE_URL = '/offline.html';
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/pwa-init.js',
  '/icon-192.png',
  '/icon-256.png',
  '/icon-384.png',
  '/icon-512.png',
  '/icon-maskable-192.png',
  '/icon-maskable-256.png',
  '/icon-maskable-384.png',
  '/icon-maskable-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async ()=>{
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(CORE_ASSETS);
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async ()=>{
    const keys = await caches.keys();
    await Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)));
    self.clients.claim();
  })());
});

// Strategy helpers
const cacheFirst = async (req) => {
  const cached = await caches.match(req);
  if (cached) return cached;
  try {
    const fresh = await fetch(req);
    const cache = await caches.open(CACHE_NAME);
    cache.put(req, fresh.clone());
    return fresh;
  } catch (e) {
    if (req.mode === 'navigate') return caches.match(OFFLINE_URL);
    return cached;
  }
};

const networkFirst = async (req) => {
  try {
    const fresh = await fetch(req);
    const cache = await caches.open(CACHE_NAME);
    cache.put(req, fresh.clone());
    return fresh;
  } catch (e) {
    const cached = await caches.match(req);
    if (cached) return cached;
    if (req.mode === 'navigate') return caches.match(OFFLINE_URL);
    throw e;
  }
};

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  // HTML pages: network-first with offline fallback
  if (req.mode === 'navigate') {
    event.respondWith(networkFirst(req));
    return;
  }
  // API calls: network-first
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(req));
    return;
  }
  // Static assets: cache-first
  event.respondWith(cacheFirst(req));
});

// Background Sync queue for failed POSTs (if used)
self.addEventListener('sync', async (event)=>{
  if (event.tag === 'sync-post-queue') {
    event.waitUntil(processQueue());
  }
});

async function queueFailedRequest(request) {
  const db = await openDB();
  const body = await request.clone().arrayBuffer();
  const item = { url: request.url, headers: [...request.headers], method: request.method, body };
  const tx = db.transaction('queue','readwrite');
  tx.objectStore('queue').add(item);
  await tx.complete;
}

async function processQueue(){
  const db = await openDB();
  const tx = db.transaction('queue','readwrite');
  const store = tx.objectStore('queue');
  const all = await store.getAll();
  for(const item of all){
    try{
      await fetch(item.url, { method:item.method, headers:new Headers(item.headers), body:item.body });
      await store.delete(item.id);
    }catch(e){ /* keep for next sync */ }
  }
  await tx.complete;
}

function openDB(){
  return new Promise((res,rej)=>{
    const req = indexedDB.open('sw-post-queue', 1);
    req.onupgradeneeded = ()=>{
      req.result.createObjectStore('queue',{ keyPath:'id', autoIncrement:true });
    };
    req.onsuccess = ()=> res(req.result);
    req.onerror = ()=> rej(req.error);
  });
}
