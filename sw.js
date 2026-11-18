/* تخزين ملفات واجهة اللعبة للتشغيل دون إنترنت بعد أول زيارة عبر HTTPS. */
const CACHE = 'reading-escape-2026-v2';
const ASSETS = ['./','./index.html','./worksheets.html','./css/style.css','./css/worksheets.css','./js/content.js','./js/app.js','./assets/castle.svg','./assets/icon.svg','./manifest.webmanifest'];
self.addEventListener('install', e => {e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));});
self.addEventListener('activate', e => {e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('reading-escape-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch', e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return; e.respondWith(caches.match(e.request).then(cached=>cached||fetch(e.request)));});
